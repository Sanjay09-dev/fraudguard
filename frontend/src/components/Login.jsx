import { useState } from 'react'
import { api } from '../api'
import { setToken } from '../auth'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: { username, password },
      })
      setToken(data.token)
      onLogin()
    } catch (err) {
      setError(
        err.status === 401
          ? 'Invalid username or password.'
          : 'Could not reach the server. Is the backend running?',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Fraudguard</h1>
          <p className="text-sm text-slate-500">Analyst sign in</p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="mt-1 w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </label>
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
