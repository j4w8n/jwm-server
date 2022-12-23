import type { Message } from './types.ts'
import type { ZodError } from 'https://deno.land/x/zod@v3.20.2/mod.ts'

export const validateJson = async (request: Request): Promise<Message> => {
  const json = request.body ? await request.json().catch((err: Error) => {
    if (err.name === 'SyntaxError') return { error: 'Invalid JSON' }
    else
      console.error(
        { data: request, error: err.message }
      )
      return { error: err.message }
  }): { error: 'Body is null'}

  if (!json.error) json.error = null
  return json
}

export const response = (
  message: string | null, 
  error: string | Record<string,string> | ZodError | null, 
  status: number
): Response => {
  return new Response(
    JSON.stringify({ data: { message }, error }),
    { headers: { 'Content-Type': 'application/json' }, status }
  )
}