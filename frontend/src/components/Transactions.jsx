import { useEffect, useState } from 'react'
import { api } from '../api'
import { DECISION_STYLE, money, pct } from '../format'

const PAGE_SIZE = 20

const FILTERS = [
  { value: 'ALL', label: 'All decisions' },
  { value: 'APPROVE', label: 'Approved' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'BLOCK', label: 'Blocked' },
]

export default function Transactions() {
  const [decision, setDecision] = useState('ALL')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const params = new URLSearchParams({ page, size: PAGE_SIZE })
        if (decision !== 'ALL') params.set('decision', decision)
        const data = await api(`/api/transactions?${params}`)
        if (active) {
          setRows(data)
          setError('')
        }
      } catch {
        if (active) setError('Could not load transactions.')
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
  }, [decision, page])

  function changeDecision(value) {
    setDecision(value)
    setPage(0)
    setLoading(true)
  }

  function changePage(next) {
    setPage(next)
    setLoading(true)
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Transactions</h2>
          <p className="text-sm text-slate-500">Newest first · refreshes every 10 seconds</p>
        </div>
        <select
          value={decision}
          onChange={(e) => changeDecision(e.target.value)}
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

      {loading && rows.length === 0 ? (
        <p className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-slate-500">No transactions match this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Account</th>
                <th className="px-3 py-2">Merchant</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2 text-right">Risk</th>
                <th className="px-3 py-2 text-right">ML</th>
                <th className="px-3 py-2">Why</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{t.id}</td>
                  <td className="whitespace-nowrap px-3 py-2">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">#{t.accountId}</td>
                  <td className="px-3 py-2">{t.merchant}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{money(t.amount, t.currency)}</td>
                  <td className="px-3 py-2">{t.country}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${DECISION_STYLE[t.decision] ?? ''}`}>
                      {t.decision}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{pct(t.score)}</td>
                  <td className="px-3 py-2 text-right">{pct(t.mlScore)}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-slate-500" title={t.reason}>
                    {t.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          disabled={rows.length < PAGE_SIZE}
          onClick={() => changePage(page + 1)}
          className="rounded border bg-white px-3 py-1.5 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  )
}
