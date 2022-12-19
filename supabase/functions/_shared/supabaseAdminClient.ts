import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const supabaseAdminClient = createClient(
  Deno.env.get('SUPABASE_URL'), 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)