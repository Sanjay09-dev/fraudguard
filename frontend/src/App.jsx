import { useEffect, useState } from 'react'
import Login from './components/Login'
import Mark from './components/Mark'
import Overview from './components/Overview'
import AlertQueue from './components/AlertQueue'
import Transactions from './components/Transactions'
import { api } from './api'
import { clearToken, currentUser } from './auth'

function Icon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Icon><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 11h8v10h-8zM3 14h8v7H3z" /></Icon>,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <Icon><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icon>,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: <Icon><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>,
  },
]

// Keeps the open-alert count in the sidebar fresh.
function useOpenAlerts(enabled) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    const load = () =>
      api('/api/stats')
        .then((s) => {
          if (active) setCount(s.openAlerts)
        })
        .catch(() => {})
    load()
    const timer = setInterval(load, 15000)
    window.addEventListener('alerts:changed', load)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('alerts:changed', load)
    }
  }, [enabled])

  return count
}

export default function App() {
  const [user, setUser] = useState(currentUser)
  const [tab, setTab] = useState('overview')
  const openAlerts = useOpenAlerts(Boolean(user))

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

  const role = user.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="on-dark flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-ink px-4 py-3 text-white md:sticky md:top-0 md:h-screen md:flex-col md:items-stretch md:justify-start md:gap-6 md:py-6">
        <div className="flex items-center gap-2.5 md:px-2">
          <Mark className="size-7" />
          <span className="font-display text-lg font-semibold tracking-tight">Fraudguard</span>
        </div>

        <nav
          aria-label="Main"
          className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1 md:flex-col md:overflow-visible"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${
                tab === t.id ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === 'alerts' && openAlerts > 0 && (
                <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                  {openAlerts}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:border-t md:border-white/10 md:px-2 md:pt-4">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-full bg-white/15 font-display font-semibold"
          >
            {user.username.charAt(0).toUpperCase()}
          </span>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-medium">{user.username}</p>
            <p className="text-xs text-white/60">{role}</p>
          </div>
          <button
            onClick={logout}
            className="ml-auto rounded-lg border border-white/20 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">
          {tab === 'overview' && <Overview onOpenQueue={() => setTab('alerts')} />}
          {tab === 'alerts' && <AlertQueue />}
          {tab === 'transactions' && <Transactions />}
        </div>
      </main>
    </div>
  )
}