import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson } from '../_shared/utils.ts'

console.log("Hello from Functions!")

serve(async (req: Request): Promise<Response> => {
  const message = await validateJson(req)
  console.log('fn received', message)

  if (message.error) console.log('error receving message', message.error)

  /* lookup subscribers by record.user_id */
  const { data, error } = await supabaseAdminClient
    .from('subscribers')
    .select('from')
    .eq('to', message.record.id )

  if (error) {
    return new Response(
      JSON.stringify({ message: error }),
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
  console.log(data)
  if (data.length > 0) {
    data.forEach(sub => {
      console.log('sending message to', sub)
    })
  }
  
  return new Response(
    JSON.stringify({ message: 'success!' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
