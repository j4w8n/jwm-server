import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts'

export const RecordSchema = z.object({
  type: z.string(),
  table: z.string(),
  record: z.object({
    id: z.number(),
    from: z.string(),
    message: z.string(),
    retries: z.number(),
    created_at: z.string(),
    message_id: z.number(),
    user_id: z.string(),
  }),
  schema: z.literal("public"),
  old_record: z.null(),
  _valid: z.literal("SUCCESS"),
})

export type Record = z.infer<typeof RecordSchema>

export type ErrorResponse = {
  error: string
  _valid: "ERROR"
}

export type JsonResponse =
  | Record
  | ErrorResponse