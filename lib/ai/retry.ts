export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const isRateLimited = message.includes("429")
      if (isRateLimited && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
        continue
      }
      throw err
    }
  }
  throw new Error("Unreachable")
}
