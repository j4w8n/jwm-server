import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson, response } from '../_shared/utils.ts'
import { JsonResponse, MessageSchema } from '../_shared/types.ts'

serve(async (req: Request): Promise<Response> => {
  /* This function requires the service-role key */
  const key: string = req.headers.get('Authorization')?.split(' ')[1] || ''
  if (key !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) 
    return response('Not Authorized', null, 401)

  if (req.method !== 'POST') 
    return response('API only supports POST requests.', null, 400)

  const message: JsonResponse = await validateJson(req)
  switch (message._valid) {
    case "SUCCESS":
      break
    case "ERROR":
      return response(null, message.error, 400)
  }

  const validMessage = MessageSchema.safeParse(message)
  if (!validMessage.success) {
    console.log(validMessage.error)
    return response(null, validMessage.error, 400)
  }

  /* message is valid, grab newly inserted db data */
  const { record } = message

  /* set message status to `locked` so no other workflow will attempt delivery */
  const { error: lockedError } = await supabaseAdminClient
    .from('messages_queue')
    .update({ status: 'locked' })
    .eq('id', record.id)

  if (lockedError) {
    console.log('Error while trying to set message status to `locked`', lockedError)
    return response('Could not set message status to `locked`', lockedError, 500)
  }

  /* lookup the sender's subscribers */
  const { data: subscriberData, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('subscriber')
    .eq('user_id', record.user_id )

  if (subscriberError) {
    console.log('Error while trying to fetch subscribers', subscriberError)
    /* set message status to `queued` */
    const { error: queuedError } = await supabaseAdminClient
      .from('messages_queue')
      .update({ status: 'queued' })
      .eq('id', record.id)

    if (queuedError) {
      /* set timer to retry */
    }
    return response('Could not get subscribers for message', subscriberError, 500)
  }
  if (subscriberData.length === 0) {
    /* set message status to `processed` */
    const { error: processedError } = await supabaseAdminClient
      .from('messages_queue')
      .update({ status: 'locked' })
      .eq('id', record.id)

    if (processedError) {
      /* set timer to retry */
    }
    return response('No Subscribers', null, 200)
  }

  /**
   * for each subscriber:
   * lookup dns txt record of _jwmserver.<domain>.<tld>
   * make POST request to dns result's /api/server/messages endpoint
   * if successful, remove message from `message_queue`, change message status in `messages` to 'sent'
   * if failed, set `retries`++
   */
  for (const entry of subscriberData) {
    console.log('subscriber entry', entry)
    const domain = entry.subscriber.split('@')[1]
    try {
      const resolved = await Deno.resolveDns(`_jwm.${domain}`, "TXT")
      console.log({resolved})

      /* find and grab `server` attribute value. ex, server=10.0.0.1 or server=jwm.example.com */
      const server = resolved[0][0]
        .split(' ')
        .find(entry => entry.split('=')[0] === 'server')

      if (!server) {
        throw `No server attribute found in TXT record ${resolved}, for message ${record.message_id}`
      }

      const server_message = {
        created_at: Date.now(),
        to: entry.subscriber,
        from: record.from,
        message: { 
          payload: JSON.parse(record.message).payload,
          signatures: JSON.parse(record.message).signatures,
          created_at: record.created_at,
          public_key: record.public_key
        }
      }

      /*  try sending message to server */
      const target = server?.split('=')[1]
      try {
        console.log('sending message to', entry.subscriber)
        const delivered = await fetch(
          `https://${target}/api/v0/server/messages`, {
            method: 'POST',
            body: JSON.stringify(server_message)
          }
        )
        const res = await delivered.json()
        if (res.error) throw res.error
      } catch (error) {
        console.log('error delivering message', error)
      }
    } catch (error) {
        console.log(error)
    }
  }

  /* set message status to `sent` */
  const { error: sentError } = await supabaseAdminClient
    .from('messages')
    .update({ status: 'sent' })
    .eq('id', record.message_id)
  if (sentError) {
    /* set timer to retry */
  }
  
  /* delete message from messages_queue */
  const { error: deleteError } = await supabaseAdminClient
    .from('messages_queue')
    .delete()
    .eq('id', record.id)
  if (deleteError) {
    /* set timer to retry */
  }

  return response('Success!', null, 200)
})
