import dns from 'node:dns'
import { json } from '@sveltejs/kit'
import { validate_server_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'
import * as jose from 'jose'
import { supabaseAdminClient } from '$lib/supabaseAdminClient'

export const POST = async (event: RequestEvent) => { 
  /**
   * SHOULD WE JUST HAVE AN EDGE FUNCTION HANDLE INCOMING MESSAGES?
   * and if so, would it be best to just send API requests directly there?
   */
  let status
  const message = await validate_server_message(event)
  message.valid ? status = 'accepted' : status = 'rejected'

  /* couldn't parse body as json */
  if (message.valid === null) return json({ data: null, error: message.error })
  
  if (message.error) return json({ data: { status }, error: message.error })

  console.log('received server message!', message)
  
  /* grab dns txt record for sending-server domain, extract key value, then verify message signature */
  try {
    dns.resolveTxt(`_jwm.${message.data!.domain}`, async (err, addresses) => {
      if (err) throw err

      const key = addresses[0][0]
        .split(' ')
        .find((entry: string) => entry.split('=')[0] === 'key')

      if (!key) {
        throw `No key attribute found in TXT record ${addresses}, for message ${message.data!.domain}`
      }

      /* get TXT `key` value and create a proper key for verification */
      const txt_record_key = key.substring(4)
      const public_key = await jose.importSPKI(txt_record_key, message.data!.alg)

      /* verify and decode message */
      const { payload } = await jose.generalVerify(message.data!.message, public_key)
      const verified_message = JSON.parse(new TextDecoder().decode(payload))
      console.log('verified message is', verified_message)

      /* ensure the 'to' user is a valid user for this server */
      /* should we validate the decoded message first? this would negate the need for an `if` here */
      if (verified_message.to) {
        const { data: userData, error: userError } = await supabaseAdminClient.rpc('find_user', { email_input: verified_message.to })
        if (userError) throw userError

        /* save incoming message to db */
        if (userData.length > 0) {
          const { error: addedError } = await supabaseAdminClient
            .from('messages')
            .insert([
              { message: verified_message, user_id: userData[0].user_id, status: 'received' }
            ])
            .select()

          if (addedError) throw addedError
        }
      } else {
        throw `Message does not contain a 'to' field.`
      }
    })
  } catch (error) {
    console.log(error)
    return json({ data: null, error })
  }

  return json({ data: { status }, error: null })
}