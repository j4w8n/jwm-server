import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson, response } from '../_shared/utils.ts'
import type { Message } from '../_shared/types.ts'
import { MessageSchema } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  /* This function requires the service-role key */
  const auth: string = req.headers.get('Authorization')?.split(' ')[1] || ''
  if (auth !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) 
    return response('Not Authorized', null, 401)

  if (req.method !== 'POST') 
    return response(
      'API only supports POST requests.', 
      null, 
      400
    )

  const message: Message = await validateJson(req)
  if (message.error) 
    return response(
      null,
      message.error,
      400
    )

  const validMessage = MessageSchema.safeParse(message)
  if (!validMessage.success) 
    return response(null, validMessage.error, 400)

  /* lookup subscribers by record.user_id */
  const { data, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('from')
    .eq('to', message.record.user_id )

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
    data.forEach(sub => {
      console.log('sending message to', sub)
    })
  }
  
  return response('Success!', null, 200)
})
