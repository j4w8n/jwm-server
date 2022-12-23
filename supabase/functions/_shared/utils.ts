//import type { Message } from './types.ts'
import type { ZodError } from 'https://deno.land/x/zod@v3.20.2/mod.ts'

export const validateJson = async (request: Request) => {
  const json = request.body ? await request.json().catch((err: Error): {bodyError: string } => {
    if (err.name === 'SyntaxError') return { bodyError: 'Invalid JSON' }
    else
      console.error(
        { data: request, bodyError: err.message }
      )
      return { bodyError: err.message }
  }): { bodyError: 'Body is null'}

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