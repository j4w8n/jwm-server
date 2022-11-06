import { json } from '@sveltejs/kit'
import { validate_client_message } from '$lib/utils'
import type { RequestEvent } from './$types'

export const GET = (event: RequestEvent) => {

  return json({
    error: null, data: { messages: ['Here are your messages'] }
  })
}

export const POST = async (event: RequestEvent) => { 
  let status
  const message = await validate_client_message(event)
  message.valid ? status = 'accepted' : status = 'rejected'
  if (message.response) return message.response
  
  const error = Object.entries(message.errors.errors).length > 0 ? message.errors.errors : null
  
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
  return json({ error, data: { status } })
}