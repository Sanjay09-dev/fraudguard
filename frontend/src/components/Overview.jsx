import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import LiveStamp from './LiveStamp'
import PageHeader from './PageHeader'

export default function Overview({ onOpenQueue }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await api('/api/stats')
        if (active) {
          setStats(data)
          setError('')
          setUpdatedAt(new Date())
        }
      } catch {
        if (active) setError('Could not load statistics. Check that the backend is running.')
      }
    }

    load()
    const timer = setInterval(load, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  if (!stats) {
    return error ? (
      <p role="alert" className="rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
        {error}
      </p>
    ) : (
      <p className="text-muted">Loading overview…</p>
    )
  }

  const { decisions, alertStatuses, totalTransactions, openAlerts } = stats
  const flagged = decisions.REVIEW + decisions.BLOCK
  const flagShare = totalTransactions ? `${((flagged / totalTransactions) * 100).toFixed(1)}%` : '0%'
  const confirmed = alertStatuses.CONFIRMED_FRAUD
  const falsePositive = alertStatuses.FALSE_POSITIVE
  const reviewed = confirmed + falsePositive
  const confirmedShare = reviewed ? Math.round((confirmed / reviewed) * 100) : null
  const daily = stats.daily.map((d) => ({ ...d, label: d.date.slice(5) }))

  return (
    <section className="space-y-6">
      <PageHeader title="Overview" note={<LiveStamp at={updatedAt} />} />

      {error && (
        <p role="alert" className="rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-lg border border-l-4 border-line bg-white p-6 ${
          openAlerts > 0 ? 'border-l-caution' : 'border-l-safe'
        }`}
      >
        <div>
          <p className="font-display text-2xl font-semibold tracking-tight">
            {openAlerts === 0
              ? 'The queue is clear'
              : `${openAlerts} ${openAlerts === 1 ? 'alert is' : 'alerts are'} waiting for review`}
          </p>
          <p className="mt-1 text-muted">
            {openAlerts === 0
              ? 'Nothing is waiting for review right now.'
              : 'Each stays open until an analyst confirms fraud or marks a false positive.'}
          </p>
        </div>
        {openAlerts > 0 && (
          <button
            onClick={onOpenQueue}
            className="rounded-lg bg-ink px-4 py-2.5 font-medium text-white transition-colors hover:bg-ink-soft"
          >
            Review alerts
          </button>
        )}
      </div>

      <dl className="grid divide-y divide-line rounded-lg border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <dt className="text-sm text-muted">Payments scored</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {totalTransactions.toLocaleString()}
          </dd>
        </div>
        <div className="p-5">
          <dt className="text-sm text-muted">Blocked</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">
            {decisions.BLOCK.toLocaleString()}
          </dd>
        </div>
        <div className="p-5">
          <dt className="text-sm text-muted">Sent for review or blocked</dt>
          <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{flagShare}</dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Payments per day</h3>
          <p className="text-sm text-muted">The last 7 days, in UTC</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid stroke="#d5dde0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#5b6b73', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#5b6b73', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(16,37,47,0.05)' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #d5dde0' }}
                />
                <Legend />
                <Bar dataKey="approve" name="Approved" stackId="d" fill="#2f9e8f" />
                <Bar dataKey="review" name="Needs review" stackId="d" fill="#e3a008" />
                <Bar dataKey="block" name="Blocked" stackId="d" fill="#d6393f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <h3 className="font-display text-lg font-semibold">How alerts were decided</h3>
          {reviewed === 0 ? (
            <p className="mt-3 text-muted">No alerts have been reviewed yet.</p>
          ) : (
            <>
              <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{confirmedShare}%</p>
              <p className="text-sm text-muted">of reviewed alerts were real fraud</p>
              <div
                className="mt-4 flex h-3 overflow-hidden rounded-full bg-mist"
                role="img"
                aria-label={`${confirmed} confirmed fraud, ${falsePositive} false positive`}
              >
                <div className="bg-danger" style={{ width: `${(confirmed / reviewed) * 100}%` }} />
                <div className="bg-muted/40" style={{ width: `${(falsePositive / reviewed) * 100}%` }} />
              </div>
            </>
          )}
          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span>Confirmed fraud</span>
              <span className="font-medium tabular-nums">{confirmed}</span>
            </li>
            <li className="flex justify-between">
              <span>False positive</span>
              <span className="font-medium tabular-nums">{falsePositive}</span>
            </li>
            <li className="flex justify-between">
              <span>Still open</span>
              <span className="font-medium tabular-nums">{openAlerts}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}