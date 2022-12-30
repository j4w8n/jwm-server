import { json } from '@sveltejs/kit'
import { validate_server_message, log } from '$lib/utils'
import type { RequestEvent } from './$types'

export const POST = async (event: RequestEvent) => { 
  /**
   * SHOULD WE JUST HAVE AN EDGE FUNCTION HANDLE INCOMING MESSAGES?
   * and if so, would it be best to just send API requests directly there?
   */
  let status
  const message = await validate_server_message(event)
  message.valid ? status = 'accepted' : status = 'rejected'

  /* couldn't parse body as json */
  if (!message.valid === null) return json({ data: null, error: message.error })
  
  const error = Object.entries(message.error).length > 0 ? message.error.errors : null
  if (error) log(error)

  console.log('received server message!', message)
  
  /* grab dns txt record for 'from' domain, extract key value, then verify message signature */
  

  /* verify the 'to' user is a valid user */


  /* save message to db */
  

  return json({ data: { status }, error })
}