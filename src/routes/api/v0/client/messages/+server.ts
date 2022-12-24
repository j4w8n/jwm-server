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
  if (!access_token || !refresh_token)
    return json({
      data: null, error: 'No cookie found'
    })

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

export const POST = async (event: RequestEvent): Promise<any> => { 
  let status
  const { valid, error, payload } = await validate_client_message(event)

  !valid ? status = 'rejected' : status = 'accepted'

  /* couldn't parse body as json */
  if (valid === null) return json({ data: { status }, error }, { status: 400 })

  if(!error) {
    const access_token = event.cookies.get('access_token') || ''
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(access_token)

    if (userError) return json({ data: null, error: userError })

    /* add message to `messages` and set status to `accepted` with retries set to `0` */
    const { data: messageData, error: messageError } = await supabaseAdminClient
      .from('messages')
      .insert([
        { message: payload.message, user_id: userData.user.id }
      ])
      .select()
    console.log(messageData)

    if (messageError) return json({ data: null, error: messageError })

    /* send to db queue table, for processing */
    /* eventually grab user.user_metadata.username for 'from'? */
    const { error: queueError } = await supabaseAdminClient
      .from('messages_queue')
      .insert([
        { 
          message_id: messageData[0].id, 
          message: payload.message, 
          public_key: payload.public_key, 
          user_id: userData.user.id, 
          from: userData.user.email 
        }
      ])

    if (queueError) log(queueError)

    // const message_data = {
    //   /* eventually grab user.user_metadata.username for 'from'? */
    //   from: userData.user.email,
    //   user_id: userData.user.id,
    //   message: payload.message,
    //   public_key: payload.public_key
    // }
    // log('sending messages')

    // const res = await fetch(`${PUBLIC_SUPABASE_FN_URL}/handler`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${access_token}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(message_data)
    // })

    //if (res.status !== 200) {
      /**
       * call to edge function failed. save message in db, for later processing??
       * or save message to db, never call the function in this file, but have a db insert trigger the function?
       */
    //  log({'handler': { 'status': res.status, 'message': res.statusText }})
    //} else {
    //  log({'handler': await res.json()})
    //}
  }

  log('check browser console for response')
  /* should we send more information back about what we accepted? */
  return json({ data: { status }, error })
}