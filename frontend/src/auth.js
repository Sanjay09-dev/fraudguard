const KEY = 'fraudguard.token'

export const getToken = () => sessionStorage.getItem(KEY)
export const setToken = (token) => sessionStorage.setItem(KEY, token)
export const clearToken = () => sessionStorage.removeItem(KEY)

function parseToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

// Reads the username and role from the token. This is for display only:
// the backend is what actually enforces permissions.
export function currentUser() {
  const token = getToken()
  if (!token) return null
  const claims = parseToken(token)
  if (!claims || (claims.exp && claims.exp * 1000 < Date.now())) {
    clearToken()
    return null
  }
  return { username: claims.sub, role: claims.role }
}
