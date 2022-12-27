import { json } from '@sveltejs/kit'
import { validate_server_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'

export const POST = async (event: RequestEvent) => { 
  let status
  const message = await validate_server_message(event)
  message.valid ? status = 'accepted' : status = 'rejected'
  log(message)
  /* couldn't parse body as json */
  if (!message.valid === null) return message.error
  
  const error = Object.entries(message.error).length > 0 ? message.error.errors : null
  if (error) log(error)
  
  /* verify this message is from a legit server ?? */
  

  /* lookup user by auth token, to ensure they are one of our users and pass username to server_message function */
  console.log('received message!', message)

  return json({ data: { status }, error })
}