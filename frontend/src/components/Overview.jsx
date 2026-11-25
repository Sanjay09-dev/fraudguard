import { useEffect, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api } from '../api'

const ALERT_COLORS = { OPEN: '#f59e0b', CONFIRMED_FRAUD: '#ef4444', FALSE_POSITIVE: '#94a3b8' }
const ALERT_LABELS = { OPEN: 'Open', CONFIRMED_FRAUD: 'Confirmed fraud', FALSE_POSITIVE: 'False positive' }

function Card({ label, value, hint }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export default function Overview() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await api('/api/stats')
        if (active) {
          setStats(data)
          setError('')
        }
      } catch {
        if (active) setError('Could not load statistics.')
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
      <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
    ) : (
      <p className="text-slate-500">Loading…</p>
    )
  }

  const { decisions, alertStatuses } = stats
  const flagged = decisions.REVIEW + decisions.BLOCK
  const flagRate = stats.totalTransactions ? `${((flagged / stats.totalTransactions) * 100).toFixed(1)}%` : '—'

  const daily = stats.daily.map((d) => ({ ...d, label: d.date.slice(5) }))
  const alertData = Object.entries(alertStatuses)
    .map(([key, value]) => ({ key, name: ALERT_LABELS[key], value }))
    .filter((d) => d.value > 0)

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm text-slate-500">Refreshes every 15 seconds</p>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Transactions" value={stats.totalTransactions.toLocaleString()} />
        <Card label="Open alerts" value={stats.openAlerts.toLocaleString()} hint="Waiting for an analyst" />
        <Card label="Blocked" value={decisions.BLOCK.toLocaleString()} />
        <Card label="Flag rate" value={flagRate} hint="Review + blocked" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-medium">Transactions per day (UTC)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="approve" name="Approved" stackId="d" fill="#22c55e" />
                <Bar dataKey="review" name="Review" stackId="d" fill="#f59e0b" />
                <Bar dataKey="block" name="Blocked" stackId="d" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-medium">Alert outcomes</h3>
          {alertData.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts yet.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={alertData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {alertData.map((d) => (
                      <Cell key={d.key} fill={ALERT_COLORS[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
