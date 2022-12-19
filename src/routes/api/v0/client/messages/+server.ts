import { json } from '@sveltejs/kit'
import { validate_client_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ADMIN_KEY } from '$env/static/private'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_FN_URL } from '$env/static/public'
import { supabaseClient } from '$lib/db'

const supabaseAdminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_ADMIN_KEY)

export const GET = async (event: RequestEvent) => {
  let messages = null
  const access_token = event.cookies.get('access_token') || ''
  const refresh_token = event.cookies.get('refresh_token') || ''
  const { data, error } = await supabaseClient.auth.getUser(access_token)

  if (error) throw error

  if (data.user) {
    await supabaseClient.auth.setSession({ access_token, refresh_token })
    const { data, error } = await supabaseClient.from('messages').select()
    log({'messages': data, error})
  }
  return json({
    data: { messages: ['Here are your messages'] }, error: null
  })
}

export const POST = async (event: RequestEvent) => { 
  let status
  const access_token = event.cookies.get('access_token')
  const { valid, error, payload } = await validate_client_message(event)

  !valid ? status = 'rejected' : status = 'accepted'

  /* couldn't parse body as json */
  if (valid === null) return json({ data: { status }, error }, { status: 400 })

  if(!error) {
    const access_token = event.cookies.get('access_token')
    const { data: user, error } = await supabaseClient.auth.getUser(access_token)

    if (error) return json({ data: null, error })

    const message_data = {
      /* eventually grab user.user_metadata.username for 'from'? */
      from: user.user.email,
      user_id: user.user.id,
      message: payload.message,
      public_key: payload.public_key
    }
    log('sending messages')
    /* send relevant info somewhere, to be queued so we can call the below `return` asap */
    const res = await fetch(`${PUBLIC_SUPABASE_FN_URL}/handler`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message_data)
    })

    if (res.status !== 200) {
      log({'handler': { 'status': res.status, 'message': res.statusText }})
    } else {
      log({'handler': await res.json()})
    }
  }

  log('check browser console for response')
  /* should we send more information back about what we accepted? */
  return json({ data: { status }, error })
}