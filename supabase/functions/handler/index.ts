import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson, response } from '../_shared/utils.ts'
import { JsonResponse, MessageSchema } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  let user_id
  
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
      user_id = message.record.user_id
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

  const { record } = message

  /* lookup subscribers by record.user_id */
  const { data, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('from')
    .eq('to', user_id )

  if (subscriberError) throw subscriberError

  /**
   * for each subscriber:
   * lookup dns txt record of _jwmserver.domain.tld
   * make POST request to dns result's /api/server/messages
   * if successful, remove message from `message_queue`, change message status in `messages` to 'sent'
   * if failed, set `retries`++
   */
  console.log({data})
  if (data.length > 0) {
    for (const sub in data) {
      const domain = data[sub].from.split('@')[1]
      try {
        const resolved = await Deno.resolveDns(`_jwm.${domain}`, "TXT")
        console.log(resolved[0][0])
        const server = resolved[0][0]
          .split(' ')
          .find(entry => entry.split('=')[0] === 'server')
        console.log('server is:', server)

        if (!server) {
          return response(null, 'No server found in TXT record', 400)
        }

        const server_message = {
          created_at: Date.now(),
          to: data[sub].from,
          from: record.from,
          message: { 
            payload: JSON.parse(record.message).payload,
            signatures: JSON.parse(record.message).signatures,
            created_at: record.created_at,
            public_key: record.public_key
          }
        }
        /*  try sending message to server */
        const target = server.split('=')[1]
        try {
          const delivered = await fetch(
            `https://${target}/api/v0/server/messages`,
            {
              method: 'POST',
              body: JSON.stringify(server_message)
            })
          console.log('delivered', delivered)
        } catch (error) {
          console.log('error delivering message', error)
        }
      } catch (error) {
          console.log(error)
      }
      //console.log('sending message to', data[sub])
    }
  }
  
  return response('Success!', null, 200)
})
