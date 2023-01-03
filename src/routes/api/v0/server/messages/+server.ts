import dns from 'node:dns'
import { json } from '@sveltejs/kit'
import { validate_server_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'
import * as jose from 'jose'
import { supabaseAdminClient } from '$lib/supabaseAdminClient'

/**
 * TODO: 
 * 1. resolve the trailing !. I assume by narrowing the type?
 */

export const POST = async (event: RequestEvent) => { 
  /**
   * ? SHOULD WE JUST HAVE AN EDGE FUNCTION HANDLE INCOMING MESSAGES?
   * and if so, would it be best to just send API requests directly there?
   */
  let status
  const { data, error, valid } = await validate_server_message(event)
  valid ? status = 'accepted' : status = 'rejected'

  /* couldn't parse body as json */
  if (valid === null) return json({ data: null, error: error })
  
  if (error) return json({ data: { status }, error: error })

  console.log('received server message!', data)
  
  /* grab dns txt record for sending-server domain, extract key value, then verify message signature */
  try {
    //TODO 1
    dns.resolveTxt(`_jwm.${data!.domain}`, async (err, addresses) => { 
      if (err) throw err

      const key = addresses[0][0]
        .split(' ')
        .find((entry: string) => entry.split('=')[0] === 'key')

      if (!key) {
        //TODO 1
        throw `No key attribute found in TXT record ${addresses}, for message ${data!.domain}`
      }

      /* get TXT `key` value and create a proper key for verification */
      const txt_record_key = key.substring(4)
      //TODO 1
      const public_key = await jose.importSPKI(txt_record_key, data!.alg)

      /* verify and decode message */
      //TODO 1
      const { payload } = await jose.generalVerify(data!.message, public_key)
      const verified_message = JSON.parse(new TextDecoder().decode(payload))
      console.log('verified message is', verified_message)

      /* ensure the 'to' user is a valid user for this server */
      /**
       * ? should we validate the decoded message first? this would negate the need for an `if` here 
       */
      if (verified_message.to) {
        const { data: userData, error: userError } = await supabaseAdminClient
          .rpc('find_user', { email_input: verified_message.to })
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