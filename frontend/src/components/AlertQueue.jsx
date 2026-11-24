import { useEffect, useState } from 'react'
import { api } from '../api'

const PAGE_SIZE = 20

const FILTERS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CONFIRMED_FRAUD', label: 'Confirmed fraud' },
  { value: 'FALSE_POSITIVE', label: 'False positive' },
  { value: 'ALL', label: 'All' },
]

const STATUS_LABEL = {
  OPEN: 'Open',
  CONFIRMED_FRAUD: 'Confirmed fraud',
  FALSE_POSITIVE: 'False positive',
}

const DECISION_STYLE = {
  BLOCK: 'bg-red-100 text-red-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  APPROVE: 'bg-green-100 text-green-800',
}

function money(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function ScoreBar({ score }) {
  const pct = Math.round(Math.min(Math.max(Number(score) || 0, 0), 1) * 100)
  const color = pct >= 80 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="w-32">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Risk</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 rounded bg-slate-200">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Reasons({ text }) {
  if (!text) return null
  return (
    <ul className="mt-3 space-y-1 text-sm text-slate-600">
      {text.split('; ').map((part) => {
        const i = part.indexOf(' (')
        const code = i === -1 ? part : part.slice(0, i)
        const detail = i === -1 ? '' : part.slice(i + 1)
        return (
          <li key={part}>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">{code}</span>{' '}
            {detail}
          </li>
        )
      })}
    </ul>
  )
}

export default function AlertQueue() {
  const [status, setStatus] = useState('OPEN')
  const [page, setPage] = useState(0)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const params = new URLSearchParams({ page, size: PAGE_SIZE })
        if (status !== 'ALL') params.set('status', status)
        const data = await api(`/api/alerts?${params}`)
        if (active) {
          setAlerts(data)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.status === 403 ? 'You do not have permission to view alerts.' : 'Could not load alerts.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 10000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [status, page, reloadKey])

  function changeStatus(value) {
    setStatus(value)
    setPage(0)
    setLoading(true)
  }

  function changePage(next) {
    setPage(next)
    setLoading(true)
  }

  async function resolve(id, newStatus) {
    setBusyId(id)
    try {
      await api(`/api/alerts/${id}/resolve`, { method: 'PATCH', body: { status: newStatus } })
      setError('')
    } catch (err) {
      setError(err.status === 409 ? 'That alert was already reviewed.' : 'Could not update the alert.')
    } finally {
      setBusyId(null)
      setReloadKey((k) => k + 1)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Alert queue</h2>
          <p className="text-sm text-slate-500">Refreshes every 10 seconds</p>
        </div>
        <select
          value={status}
          onChange={(e) => changeStatus(e.target.value)}
          className="rounded border bg-white px-3 py-2 text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading && alerts.length === 0 ? (
        <p className="text-slate-500">Loading…</p>
      ) : alerts.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-slate-500">
          No alerts here. Run <code>simulate.py</code> to generate some traffic.
        </p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => {
            const t = a.transaction
            return (
              <li key={a.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Alert #{a.id}</span>
                      {t && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${DECISION_STYLE[t.decision] ?? ''}`}
                        >
                          {t.decision}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  {t && <ScoreBar score={t.score} />}
                </div>

                {t && (
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                    <Info label="Amount" value={money(t.amount, t.currency)} />
                    <Info label="Merchant" value={t.merchant} />
                    <Info label="Country" value={t.country} />
                    <Info label="Account" value={`#${t.accountId}`} />
                  </div>
                )}
                {t && <Reasons text={t.reason} />}

                <div className="mt-4 flex items-center gap-2">
                  {a.status === 'OPEN' ? (
                    <>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => resolve(a.id, 'CONFIRMED_FRAUD')}
                        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Confirm fraud
                      </button>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => resolve(a.id, 'FALSE_POSITIVE')}
                        className="rounded border px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-60"
                      >
                        False positive
                      </button>
                    </>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-1 text-sm text-slate-700">
                      {STATUS_LABEL[a.status] ?? a.status}
                      {a.reviewedAt && ` · ${new Date(a.reviewedAt).toLocaleString()}`}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          disabled={page === 0}
          onClick={() => changePage(page - 1)}
          className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-slate-500">Page {page + 1}</span>
        <button
          disabled={alerts.length < PAGE_SIZE}
          onClick={() => changePage(page + 1)}
          className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}
