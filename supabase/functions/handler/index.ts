import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson, response } from '../_shared/utils.ts'
import { JsonResponse, MessageSchema } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  /* This function requires the service-role key */
  const key: string = req.headers.get('Authorization')?.split(' ')[1] || ''
  if (key !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) 
    return response('Not Authorized', null, 401)

  if (req.method !== 'POST') 
    return response(
      'API only supports POST requests.', 
      null, 
      400
    )

  const message: JsonResponse = await validateJson(req)
  switch (message._valid) {
    case "SUCCESS":
      break
    case "ERROR":
      return response(
        null,
        message.error,
        400
      )
  }

  const validMessage = MessageSchema.safeParse(message)
  if (!validMessage.success) {
    console.log(validMessage.error)
    return response(null, validMessage.error, 400)
  }

  /* message is valid, grab newly inserted db data */
  const { record } = message

  /* lookup the sender's subscribers */
  const { data: subscriberData, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('subscriber')
    .eq('user_id', record.user_id )

  if (subscriberError) throw subscriberError
  if (subscriberData.length === 0)
    return response('No Subscribers', null, 200)

  /**
   * for each subscriber:
   * lookup dns txt record of _jwmserver.<domain>.<tld>
   * make POST request to dns result's /api/server/messages endpoint
   * if successful, remove message from `message_queue`, change message status in `messages` to 'sent'
   * if failed, set `retries`++
   */
  for (const entry of subscriberData) {
    console.log('subscriber entry', entry)
    const domain = entry.subscriber.split('@')[1]
    try {
      const resolved = await Deno.resolveDns(`_jwm.${domain}`, "TXT")
      console.log(resolved)

      /* find and grab `server` attribute value. ex, server=10.0.0.1 or server=jwm.example.com */
      const server = resolved[0][0]
        .split(' ')
        .find(entry => entry.split('=')[0] === 'server')

      if (!server) {
        console.log(`No server attribute found in TXT record ${resolved}`)
      }

      const server_message = {
        created_at: Date.now(),
        to: entry.subscriber,
        from: record.from,
        message: { 
          payload: JSON.parse(record.message).payload,
          signatures: JSON.parse(record.message).signatures,
          created_at: record.created_at,
          public_key: record.public_key
        }
      }

      /*  try sending message to server */
      const target = server?.split('=')[1]
      try {
        console.log('sending message to', entry.subscriber)
        await fetch(
          `https://${target}/api/v0/server/messages`,
          {
            method: 'POST',
            body: JSON.stringify(server_message)
          }
        )
      } catch (error) {
        console.log('error delivering message', error)
      }
    } catch (error) {
        console.log(error)
    }
  }
  
  return response('Success!', null, 200)
})
