import Validator from 'validatorjs'
import * as jose from 'jose'
import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { InvalidJson, BodyNull } from '$lib/responses'

/* incoming, from a client */
export const validate_client_message = async (event: RequestEvent): Promise<{valid: boolean | void, response?: object, errors?: any}> => {
  const valid_json = await validate_json(event)

  if (valid_json.response) return valid_json

  const format = {
    payload: 'required|string',
    signatures: 'required|array'
  }

  const valid_message = new Validator(valid_json, format)

  return {
    valid: valid_message.passes(),
    errors: valid_message.errors
  }
}

/* incoming, from another server */
export const validate_server_message = async (event: RequestEvent): Promise<{valid: boolean | void, response?: object, errors?: any}> => {
  const valid_json = await validate_json(event)

  if (valid_json.response) return valid_json

  const format = {
    created_at: 'required|date',
    from: 'required|email',
    to: 'required|email',
    body: {
      payload: 'required|string',
      signatures: 'required|array'
    }
  }
  const errors = {
    'email.from': 'Expecting user@domain.tld format.',
    'email.to': 'Expecting user@domain.tld format.'
  }
  const valid_message = new Validator(valid_json, format, errors)

  return {
    valid: valid_message.passes(),
    errors: valid_message.errors
  }
}

export const validate_json = async ({ request, getClientAddress }: RequestEvent): Promise<any> => {
  return request.body ? await request.json().catch((err: any) => {
    if (err.name === 'SyntaxError') return { valid: false, response: json(InvalidJson, { status: 400 }) }
    else 
      console.error(
        { error: err.message, data: { url: request.url, client_ip: getClientAddress() } }
      )
      return { valid: false, response: json(err.message, { status: 400 }) }
  }) : { valid: false, response: json(BodyNull, { status: 400 }) }
}

/* outgoing, to another server */
export const create_server_message = async(client_jws: any, from: string, to: string) => {
  const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
  const message = {
    body: client_jws,
    from,
    to,
    created_at: Date.now()
  }
  const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(message)))
    .addSignature(privateKey)
    .setProtectedHeader({ typ: 'JWM', alg: 'ES256' })
    .sign()

  console.log({jws})

  /* old code from client-side */
  // const { payload, protectedHeader } = await jose.generalVerify(jws, publicKey)
  // const decrypted = new TextDecoder().decode(payload)

  // console.log('server decrypted', JSON.parse(decrypted), protectedHeader)
}

/* outgoing, to another server */
export const encrypt_server_message = async (client_jws: any, from: string, to: string) => {
  /* lookup destination server's publicKey via DNS, instead of generating */
  const { publicKey, privateKey } = await jose.generateKeyPair('ECDH-ES+A256KW')

  //const json = JSON.parse(raw_payload.value)
  //json.created_at = Date.now()
  const message = {
    body: client_jws,
    from,
    to
  }
  const jwe = await new jose.GeneralEncrypt(new TextEncoder().encode(JSON.stringify(message)))
    .setProtectedHeader({ typ: 'JWM', enc: 'A256GCM' })
    .setSharedUnprotectedHeader({ alg: 'ECDH-ES+A256KW'})
    .addRecipient(publicKey)
    .encrypt()

  console.log({jwe})

  /* send the encrypted message to the destination server, per DNS lookup of the domain */



  /* old code from client-side */
  /* someone is sending you an encrypted message, using your publicKey. so you decrypt with your privateKey */
  // const { plaintext, protectedHeader, additionalAuthenticatedData } = await jose.generalDecrypt(jwe, privateKey)
  // const decrypted = new TextDecoder().decode(plaintext)

  // const body = JSON.parse(decrypted).body
  // console.log('decrypted', JSON.parse(decrypted), protectedHeader)
  // message = body.message
  // title = body.title
}
