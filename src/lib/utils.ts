import * as jose from 'jose'
import type { ZodError } from 'zod'
import type { RequestEvent } from '@sveltejs/kit'
import { InvalidJson, BodyNull } from '$lib/responses'
import { ServerMessageSchema, ClientMessageSchema, type ClientMessage, type ServerMessage } from '$lib/types'

export const log = (data: object | string) => {
  console.log(JSON.stringify(data, null, 2))
}

/* incoming, from a client */
export const validate_client_message = async (event: RequestEvent): Promise<{data: ClientMessage | null, valid: boolean, error: ZodError | null}> => {
  const json = await validate_json(event)

  if (json.valid === null) return json

  const validClientMessage = ClientMessageSchema.safeParse(json)

  switch (validClientMessage.success) {
    case true:
      return {
        data: validClientMessage.data,
        valid: true,
        error: null
      }
    case false:
      return {
        data: null,
        valid: false,
        error: validClientMessage.error
      }
  }
}

/* incoming, from another server */
export const validate_server_message = async (event: RequestEvent): Promise<{data: ServerMessage | null, valid: boolean, error: ZodError | null}> => {
  const json = await validate_json(event)

  if (json.valid === null) return json

  const validServerMessage = ServerMessageSchema.safeParse(json)

  switch (validServerMessage.success) {
    case true:
      return {
        data: validServerMessage.data,
        valid: true,
        error: null
      }
    case false:
      return {
        data: null,
        valid: false,
        error: validServerMessage.error
      }
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
// export const create_server_message = async(client_jws: any, from: string, to: string) => {
//   const { publicKey, privateKey } = await jose.generateKeyPair('ES256')
//   const message = {
//     body: client_jws,
//     from,
//     to,
//     created_at: Date.now()
//   }
//   const jws = await new jose.GeneralSign(new TextEncoder().encode(JSON.stringify(message)))
//     .addSignature(privateKey)
//     .setProtectedHeader({ typ: 'JWM', alg: 'ES256' })
//     .sign()

//   console.log({jws})
// }

/* outgoing, to another server */
// export const encrypt_server_message = async (client_jws: any, from: string, to: string) => {
//   /* lookup destination server's publicKey via DNS, instead of generating */
//   const { publicKey, privateKey } = await jose.generateKeyPair('ECDH-ES+A256KW')

//   //const json = JSON.parse(raw_payload.value)
//   //json.created_at = Date.now()
//   const message = {
//     body: client_jws,
//     from,
//     to
//   }
//   const jwe = await new jose.GeneralEncrypt(new TextEncoder().encode(JSON.stringify(message)))
//     .setProtectedHeader({ typ: 'JWM', enc: 'A256GCM' })
//     .setSharedUnprotectedHeader({ alg: 'ECDH-ES+A256KW'})
//     .addRecipient(publicKey)
//     .encrypt()

//   console.log({jwe})
// }
