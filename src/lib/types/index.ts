import { z } from 'zod'

export type Message = {
  body: {
    title: string;
    message: string;
    created_at: number;
  }
}

const SignaturesSchema = z.object({
  signature: z.string(),
  protected: z.string(),
})

export const ClientMessageSchema = z.object({
  message: z.object({
    payload: z.string(),
    signatures: z.array(SignaturesSchema),
  }),
  public_key: z.string(),
  alg: z.string(),
})

export type ClientMessage = z.infer<typeof ClientMessageSchema>

export const ServerMessageSchema = z.object({
  message: z.object({
    payload: z.string(),
    signatures: z.array(SignaturesSchema),
  }),
  alg: z.string(),
  domain: z.string(),
})

export type ServerMessage = z.infer<typeof ServerMessageSchema>