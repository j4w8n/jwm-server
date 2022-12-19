import Validator from 'validatorjs'
import * as jose from 'jose'
import { json } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import { InvalidJson, BodyNull } from '$lib/responses'

export const log = (data: object | string) => {
  console.log(JSON.stringify(data, null, 2))
}

/* incoming, from a client */
export const validate_client_message = async (event: RequestEvent): Promise<{valid: boolean | null, error: any, payload: any}> => {
  const json = await validate_json(event)

  if (json.valid === null) return json

  // const format = {
  //   payload: 'required|string',
  //   signatures: 'required|array'
  // }
  const format = {
    message: {
      payload: 'required|string',
      signatures: 'required|array'
    },
    public_key: 'required|string'
  }

  const message = new Validator(json, format)

  /* negates possible 'void' return type from passes() */
  const passes = message.passes() ? true : false
  const error = Object.entries(message.errors.errors).length === 0 ? null : message.errors.errors
  
  return {
    valid: passes,
    error,
    payload: json
  }
}

/* incoming, from another server */
export const validate_server_message = async (event: RequestEvent): Promise<{valid: boolean | null, error: any}> => {
  const json = await validate_json(event)

  if (json.valid === null) return json

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
  const message = new Validator(json, format, errors)

  /* negates possible 'void' return type from passes() */
  const passes = message.passes() ? true : false

  return {
    valid: passes,
    error: message.errors.errors
  }
}

export const validate_json = async ({ request, getClientAddress }: RequestEvent): Promise<any> => {
  return request.body ? await request.json().catch((err: any) => {
    if (err.name === 'SyntaxError') return { valid: null, error: InvalidJson }
    else 
      console.error(
        { data: { url: request.url, client_ip: getClientAddress() }, error: err.message }
      )
      return { valid: null, error: err.message }
  }) : { valid: null, error: BodyNull }
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
