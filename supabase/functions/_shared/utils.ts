export const validateJson = async (request: Request): Promise<any> => {
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