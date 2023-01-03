import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.11.2/index.ts'
import { supabaseAdminClient } from '../_shared/supabaseAdminClient.ts'
import { validateJson, response } from '../_shared/utils.ts'
import { JsonResponse, RecordSchema } from '../_shared/types.ts'
import { ALG, DOMAIN } from '../_shared/constants.ts'

serve(async (req: Request): Promise<Response> => {
  /* This function requires the service-role key */
  const key = req.headers.get('Authorization')?.split(' ')[1] || ''
  if (key !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) 
    return response('Not Authorized', null, 401)

  if (req.method !== 'POST') 
    return response('API only supports POST requests.', null, 400)

  const message: JsonResponse = await validateJson(req)
  switch (message._valid) {
    case "SUCCESS":
      break
    case "ERROR":
      throw message.error
  }

  const validMessage = RecordSchema.safeParse(message)
  if (!validMessage.success) {
    console.log(validMessage.error)
    throw validMessage.error
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
    throw lockedError
  }

  /* lookup the sender's subscribers */
  const { data: subscriberData, error: subscriberError } = await supabaseAdminClient
    .from('subscribers')
    .select('subscriber')
    .eq('user_id', record.user_id )

  if (subscriberError) {
    console.log('Error while trying to fetch subscribers', subscriberError)
    /* set message status back to `queued`, so it can be processed later */
    const { error: queuedError } = await supabaseAdminClient
      .from('messages_queue')
      .update({ status: 'queued' })
      .eq('id', record.id)

    if (queuedError) {
      console.log('Error while trying to set message status back to `queued`', queuedError)
      /* ??set timer to retry?? */
    }
    throw `${subscriberError} ${queuedError}`
  }
  if (subscriberData.length === 0) {
    /* no subscribers. set message status to `processed`, since it will never be `sent` */
    const { error: processedError } = await supabaseAdminClient
      .from('messages_queue')
      .update({ status: 'processed' })
      .eq('id', record.id)

    if (processedError) {
      throw `Failed to set message status to 'processed' ${processedError}`
      /* set timer to retry */
    }
    return response('No Subscribers', null, 200)
  }

  /**
   * for each subscriber:
   * lookup dns txt record of _jwm.<domain>.<tld>, to grab the `server` value
   * make POST request to receiving server's /api/server/messages endpoint
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

      /* create server-to-server message */
      const server_message = {
        created_at: record.created_at,
        to: entry.subscriber,
        from: record.from,
        message: record.message
      }

      const env_key = Deno.env.get('SIGNATURE_PRIVATE_KEY')
      if (!env_key) throw 'Cannot find private key'

      const private_key = await jose.importPKCS8(env_key, ALG)
      const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(server_message)))
        .addSignature(private_key)
        .setProtectedHeader({ typ: 'JWM', alg: ALG })
        .sign()
      console.log('signed message', jws)

      /**
       * Sign message, with metadata.
       * DOMAIN should be this server's domain. Receiving server will use this value to get
       * the public key from the _jwm DNS TXT record.
       * ALG should match the alg used to sign the message. This is so the receiving server
       * can take the sending server's public key (from TXT record) and create a full key used
       * to verify the signed message and decode the contents.
       */
      const message_data = {
        message: jws,
        domain: DOMAIN,
        alg: ALG
      }

      const target = server?.split('=')[1]
      /*  try sending message to server */
      try {
        console.log('sending message to', entry.subscriber)
        /**
         * Eventually, url should not have the version number.
         * Receiving server should use a redirect or proxy to reach a versioned endpoint.
         */
        const delivered = await fetch(
          `https://${target}/api/v0/server/messages`, {
            method: 'POST',
            body: JSON.stringify(message_data)
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

  /** 
   * Outgoing message will be seen as one message to sender,
   * so we only take these two actions once.
   */

  /* set message status to `sent` */
  const { error: statusError } = await supabaseAdminClient
    .from('messages')
    .update({ status: 'sent' })
    .eq('id', record.message_id)
  if (statusError) {
    throw statusError
    /* set timer to retry */
  }
  
  /* delete message from messages_queue */
  const { error: deleteError } = await supabaseAdminClient
    .from('messages_queue')
    .delete()
    .eq('id', record.id)
  if (deleteError) {
    throw deleteError
    /* set timer to retry */
  }

  return response('Success!', null, 200)
})
