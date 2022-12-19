import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson } from '../_shared/utils.ts'

console.log("Hello from Functions!")

serve(async (req: Request): Promise<void> => {
  const message = await validateJson(req)
  console.log('fn received', message)

  if (message.error) console.log('error receving message', message.error)

  /* lookup subscribers by record.user_id */

  /**
   * for each subscriber:
   * lookup dns txt record of _jwmserver.domain.tld
   * make POST request to dns result's /api/server/messages
   * if successful, remove messgae from `message_queue`, change message status in `messages to 'sent'
   * if failed, set 'retries`++
   */

  /* actually send message here */

})
