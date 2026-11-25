import { useEffect, useState } from 'react'
import { api } from '../api'
import { money, parseReasons } from '../format'
import { toneFor } from '../risk'
import DecisionBadge from './DecisionBadge'
import LiveStamp from './LiveStamp'
import PageHeader from './PageHeader'
import Pager from './Pager'
import RiskRuler from './RiskRuler'
import Segmented from './Segmented'

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

const EDGE = { danger: 'border-l-danger', caution: 'border-l-caution', safe: 'border-l-safe' }

export default function AlertQueue() {
  const [status, setStatus] = useState('OPEN')
  const [page, setPage] = useState(0)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(null)

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
          setUpdatedAt(new Date())
        }
      } catch (err) {
        if (active) {
          setError(
            err.status === 403
              ? 'Your account is not allowed to view alerts.'
              : 'Could not load alerts. Check that the backend is running.',
          )
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
      window.dispatchEvent(new Event('alerts:changed'))
    } catch (err) {
      setError(
        err.status === 409
          ? 'Another analyst already reviewed that alert.'
          : 'Could not save your decision. Try again.',
      )
    } finally {
      setBusyId(null)
      setReloadKey((k) => k + 1)
    }
  }

  return (
    <section>
      <PageHeader title="Alerts" note={<LiveStamp at={updatedAt} />}>
        <Segmented label="Filter by status" options={FILTERS} value={status} onChange={changeStatus} />
      </PageHeader>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {loading && alerts.length === 0 ? (
        <p className="text-muted">Loading alerts…</p>
      ) : alerts.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-8">
          <p className="font-display text-lg font-semibold">
            {status === 'OPEN' ? 'Nothing is waiting for review' : 'No alerts with this status'}
          </p>
          <p className="mt-1 text-muted">
            {status === 'OPEN'
              ? 'Flagged payments appear here automatically.'
              : 'Try another filter to see more alerts.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {alerts.map((a) => {
            const t = a.transaction
            const score = t ? Number(t.score) || 0 : 0
            const reasons = t ? parseReasons(t.reason) : []
            return (
              <li
                key={a.id}
                className={`rounded-lg border border-l-4 border-line bg-white p-5 ${EDGE[toneFor(score)]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl font-semibold tabular-nums">
                      {t ? money(t.amount, t.currency) : 'Amount unavailable'}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      Alert {a.id} was raised on {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {t && <DecisionBadge decision={t.decision} />}
                </div>

                {t && (
                  <div className="mt-4 grid gap-5 md:grid-cols-[1fr_15rem]">
                    <div>
                      <p className="text-sm font-medium">Why it was flagged</p>
                      <ul className="mt-1.5 space-y-1 text-sm">
                        {reasons.map((r) => (
                          <li key={r.label}>
                            <span className="font-medium">{r.label}</span>
                            {r.detail && <span className="text-muted">: {r.detail}</span>}
                          </li>
                        ))}
                      </ul>
                      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                        <div>
                          <dt className="text-muted">Merchant</dt>
                          <dd className="font-medium">{t.merchant}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Country</dt>
                          <dd className="font-medium">{t.country}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Account</dt>
                          <dd className="font-medium">#{t.accountId}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Risk score</span>{' '}
                        <span className="tabular-nums">{score.toFixed(2)}</span>
                      </p>
                      <div className="mt-2">
                        <RiskRuler pins={[{ score }]} />
                      </div>
                      <p className="mt-1 text-xs text-muted">Review from 0.40, block from 0.80</p>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {a.status === 'OPEN' ? (
                    <>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => resolve(a.id, 'CONFIRMED_FRAUD')}
                        className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger-ink disabled:opacity-60"
                      >
                        Confirm fraud
                      </button>
                      <button
                        disabled={busyId === a.id}
                        onClick={() => resolve(a.id, 'FALSE_POSITIVE')}
                        className="rounded-lg border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-mist disabled:opacity-60"
                      >
                        Mark as false positive
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      <span className="font-medium text-ink">{STATUS_LABEL[a.status] ?? a.status}</span>
                      {a.reviewedAt && `, reviewed on ${new Date(a.reviewedAt).toLocaleString()}`}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Pager page={page} onChange={changePage} hasNext={alerts.length >= PAGE_SIZE} />
    </section>
  )
}