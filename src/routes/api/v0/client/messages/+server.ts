import { json } from '@sveltejs/kit'
import { validate_client_message } from '$lib/utils'
import type { RequestEvent } from './$types'

export const GET = (event: RequestEvent) => {

  return json({
    data: { messages: ['Here are your messages'] }, error: null
  })
}

export const POST = async (event: RequestEvent) => { 
  let status
  const message = await validate_client_message(event)
  console.log(message)
  !message.valid ? status = 'rejected' : status = 'accepted'

  /* couldn't parse body as json */
  if (message.valid === null) return json({ data: { status }, error: message.error }, { status: 400 })

  const error = message.error
  
  if(!error) {
    console.log('verifying auth token')
    /* lookup user by auth token, to ensure they are one of our users. select username */
    
    console.log('sending messages')
    /* lookup the user's subscribers and create/send a message for each */
    /** 
     * synchronous function? need to find a way to queue the sending of the messages, so we can call the below `return` asap
     */

  }

  console.log('returning response')
  return json({ data: { status }, error })
}