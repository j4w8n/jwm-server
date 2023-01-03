import { json } from '@sveltejs/kit'
import { validate_client_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'
import { supabaseClient } from '$lib/supabaseClient'
import { supabaseAdminClient } from '$lib/supabaseAdminClient'

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
  const { valid, error, data } = await validate_client_message(event)

  valid ? status = 'accepted' : status = 'rejected'

  /* couldn't parse body as json */
  if (valid === null) return json({ data: { status }, error }, { status: 400 })

  if (error) return json({ data: { status }, error }, { status: 400 })

  console.log('received client message!', data)

  /* grab access_token from cookie, so we can verify it was one of our clients who sent the message */
  const access_token = event.cookies.get('access_token') || ''
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(access_token)

  if (userError) return json({ data: null, error: userError }, { status: 400 })

  /* add message to `messages` and set status to `accepted` with retries set to `0` */
  const { data: messageData, error: messageError } = await supabaseAdminClient
    .from('messages')
    .insert([
      { message: data, user_id: userData.user.id }
    ])
    .select()

  if (messageError) return json({ data: null, error: messageError }, { status: 500 })

  /* send to db queue table, for processing */
  /* ?? eventually grab user.user_metadata.username for 'from' ?? */
  const { error: queueError } = await supabaseAdminClient
    .from('messages_queue')
    .insert([
      { 
        message_id: messageData[0].id, 
        message: data, 
        user_id: userData.user.id, 
        from: userData.user.email 
      }
    ])

  if (queueError) return json({ data: null, error: queueError }, { status: 500 })

  /* should we send more information back about what we accepted? */
  return json({ data: { status }, error: null })
}