import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson } from '../_shared/utils.ts'
import type { Message } from '../_shared/types.ts'
import { MessageSchema } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ data: { message: 'API only supports POST requests.' }, error: null }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  /* This function requires the service-role key */
  const auth: string = req.headers.get('Authorization')?.split(' ')[1] || ''
  if (auth !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('Unauthorized', req)
    return new Response(
      JSON.stringify({ data: { message: 'Not Authorized' }, error: null }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  const message: Message = await validateJson(req)
  console.log('fn received', message)

  if (message.error) console.log('error receving message', message.error)

  const validMessage = MessageSchema.safeParse(message)

  if (!validMessage.success) {
    console.log(validMessage.error)
    return new Response(
      JSON.stringify({ data: null, error: validMessage.error }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  /* lookup subscribers by record.user_id */
  const { data, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('from')
    .eq('to', message.record.user_id )

  if (subscriberError) {
    console.log({error: subscriberError})
    return new Response(
      JSON.stringify({ data: null, error: subscriberError }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

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
  
  return new Response(
    JSON.stringify({ data: { message: 'success!' }, error: null }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
