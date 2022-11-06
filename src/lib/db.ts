import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/private'

export const supabaseClient = createClient(env.SUPABASE_URL || '', env.SUPABASE_ADMIN_KEY || '')