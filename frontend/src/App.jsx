import { useEffect, useState } from 'react'
import Login from './components/Login'
import Overview from './components/Overview'
import AlertQueue from './components/AlertQueue'
import Transactions from './components/Transactions'
import { clearToken, currentUser } from './auth'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'transactions', label: 'Transactions' },
]

export default function App() {
  const [user, setUser] = useState(currentUser)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  function logout() {
    clearToken()
    setUser(null)
    setTab('overview')
  }

  if (!user) return <Login onLogin={() => setUser(currentUser())} />

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">Fraudguard</h1>
            <nav className="flex gap-1 text-sm">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded px-3 py-1.5 ${
                    tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
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
        {tab === 'overview' && <Overview />}
        {tab === 'alerts' && <AlertQueue />}
        {tab === 'transactions' && <Transactions />}
      </main>
    </div>
  )
}