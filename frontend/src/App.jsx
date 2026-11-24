import { useEffect, useState } from 'react'
import Login from './components/Login'
import AlertQueue from './components/AlertQueue'
import { clearToken, currentUser } from './auth'

export default function App() {
  const [user, setUser] = useState(currentUser)

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  function logout() {
    clearToken()
    setUser(null)
  }

  if (!user) return <Login onLogin={() => setUser(currentUser())} />

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-semibold">Fraudguard</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user.username} · {user.role}
            </span>
            <button onClick={logout} className="rounded border px-3 py-1 hover:bg-slate-100">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AlertQueue />
      </main>
    </div>
  )
}