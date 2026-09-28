interface ZoomTokenResponse {
  access_token: string
  expires_in: number
}

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials are not configured")
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    }
  )

  if (!res.ok) {
    throw new Error(`Zoom token request failed: ${res.status} ${await res.text()}`)
  }

  const data = (await res.json()) as ZoomTokenResponse
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return data.access_token
}
