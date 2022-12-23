//import type { Message } from './types.ts'
import type { ZodError } from 'https://deno.land/x/zod@v3.20.2/mod.ts'
import { JsonResponse } from './types.ts'

export const validateJson = async (request: Request): Promise<JsonResponse> => {
  try {
    const json = await request.json()
    return {
      ...json,
      _valid: "SUCCESS"
    }
  } catch (err) {
    if (err.name === 'SyntaxError') 
      return { _valid: "ERROR", error: 'Invalid JSON' }
    else
      console.error(
        { data: request, error: err.message }
      )
      return { _valid: "ERROR", error: err.message }
  }
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