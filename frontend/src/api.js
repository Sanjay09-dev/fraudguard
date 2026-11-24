import { getToken, clearToken } from './auth'

export class ApiError extends Error {
  constructor(status) {
    super(`HTTP ${status}`)
    this.status = status
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  // An expired or invalid token while signed in: sign the user out.
  if (res.status === 401 && token) {
    clearToken()
    window.dispatchEvent(new Event('auth:logout'))
  }
  if (!res.ok) throw new ApiError(res.status)
  return res.status === 204 ? null : res.json()
}
