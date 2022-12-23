import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts'

export const MessageSchema = z.object({
  type: z.string(),
  table: z.string(),
  record: z.object({
    id: z.number(),
    from: z.string(),
    message: z.string(),
    retries: z.number(),
    user_id: z.string(),
    public_key: z.string(),
  }),
  error: z.string().or(z.null()),
  _valid: z.literal("SUCCESS"),
})

export type Message = z.infer<typeof MessageSchema>

export type ErrorResponse = {
  error: string
  _valid: "ERROR"
}

export type JsonResponse =
  | Message
  | ErrorResponse