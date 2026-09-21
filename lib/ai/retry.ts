const RETRYABLE_STATUS_CODES = ["429", "500", "502", "503", "504"]

export async function withRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isRetryable = RETRYABLE_STATUS_CODES.some((code) => message.includes(code))
      if (isRetryable && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
        continue
      }
      throw err
    }
  }
  throw new Error("Unreachable")
}
