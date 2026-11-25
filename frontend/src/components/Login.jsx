import { useState } from 'react'
import { api } from '../api'
import { setToken } from '../auth'
import Mark from './Mark'
import RiskRuler from './RiskRuler'

const SAMPLE_PINS = [
  { score: 0.04, label: '€4.20', delay: 250 },
  { score: 0.52, label: '€38.00', delay: 450 },
  { score: 0.9, label: '€99.99', delay: 650 },
]

const field =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-[15px]'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
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
          ? "That username and password don't match. Check them and try again."
          : "Can't reach the server. Check that the backend is running on port 8080.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-[1.1fr_1fr]">
      <section className="on-dark hidden flex-col justify-between bg-ink p-12 text-white md:flex">
        <div className="flex items-center gap-2.5">
          <Mark className="size-8" />
          <span className="font-display text-xl font-semibold tracking-tight">Fraudguard</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            Every payment is scored in milliseconds. You decide the close calls.
          </h1>
          <p className="mt-5 max-w-sm text-white/70">
            Rules and a trained model rate each transaction from 0 to 1. From 0.40 it waits for your
            review, and from 0.80 it is blocked.
          </p>
          <div className="mt-10">
            <RiskRuler
              hero
              pins={SAMPLE_PINS}
              label="Example payments on the risk scale from 0 to 1, with approved, review and block zones"
            />
          </div>
        </div>

        <div aria-hidden="true" />
      </section>

      <main className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <Mark className="size-8" />
            <span className="font-display text-xl font-semibold tracking-tight">Fraudguard</span>
          </div>

          <h2 className="font-display text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-muted">Use your analyst account to open the review queue.</p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-medium">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className={`${field} mt-1.5`}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <div className="relative mt-1.5">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className={`${field} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-pressed={show}
                  className="absolute inset-y-0 right-0 px-3.5 text-sm font-medium text-steel"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-5 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
              {error}
            </p>
          )}

          <button
            disabled={busy}
            className="mt-6 h-11 w-full rounded-lg bg-ink font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  )
}