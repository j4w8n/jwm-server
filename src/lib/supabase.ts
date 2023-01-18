import type { Provider } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL } from '$env/static/public'
import { dev } from '$app/environment'
import { supabaseBrowserClient } from 'supakit'

export const signIn = async (provider: Provider) => {
  try {
    const { error } = await supabaseBrowserClient.auth.signInWithOAuth(
      { provider, 
        options: { redirectTo: `${PUBLIC_SUPABASE_URL}:${dev ? 5173 : 4173}/login` }
      }
    )
    if (error) throw error
  } catch (err) {
    console.error(err)
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabaseBrowserClient.auth.signOut()
    if (error) throw error
  } catch (err) {
    console.error(err)
  }
}