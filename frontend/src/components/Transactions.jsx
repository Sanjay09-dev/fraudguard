import { useEffect, useState } from 'react'
import { api } from '../api'
import { money, parseReasons, pct } from '../format'
import { TONE_DOT, toneFor } from '../risk'
import DecisionBadge from './DecisionBadge'
import LiveStamp from './LiveStamp'
import PageHeader from './PageHeader'
import Pager from './Pager'
import Segmented from './Segmented'

const PAGE_SIZE = 20

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'APPROVE', label: 'Approved' },
  { value: 'REVIEW', label: 'Needs review' },
  { value: 'BLOCK', label: 'Blocked' },
]

const th = 'px-4 py-2.5 font-medium'

export default function Transactions() {
  const [decision, setDecision] = useState('ALL')
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)

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
          setUpdatedAt(new Date())
        }
      } catch {
        if (active) setError('Could not load transactions. Check that the backend is running.')
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
      <PageHeader title="Transactions" note={<LiveStamp at={updatedAt} />}>
        <Segmented label="Filter by decision" options={FILTERS} value={decision} onChange={changeDecision} />
      </PageHeader>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-tint px-3.5 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}

      {loading && rows.length === 0 ? (
        <p className="text-muted">Loading transactions…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-white p-8">
          <p className="font-display text-lg font-semibold">No transactions match this filter</p>
          <p className="mt-1 text-muted">Try another filter, or wait for new payments to arrive.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-line bg-mist/60 text-muted">
              <tr>
                <th className={th}>ID</th>
                <th className={th}>Time</th>
                <th className={th}>Account</th>
                <th className={th}>Merchant</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Country</th>
                <th className={th}>Decision</th>
                <th className={`${th} text-right`}>Risk</th>
                <th className={`${th} text-right`}>Model</th>
                <th className={th}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const reasons = parseReasons(t.reason)
                return (
                  <tr key={t.id} className="border-b border-line last:border-0 hover:bg-mist/50">
                    <td className="px-4 py-3 text-muted">{t.id}</td>
                    <td className="whitespace-nowrap px-4 py-3">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">#{t.accountId}</td>
                    <td className="px-4 py-3">{t.merchant}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {money(t.amount, t.currency)}
                    </td>
                    <td className="px-4 py-3">{t.country}</td>
                    <td className="px-4 py-3">
                      <DecisionBadge decision={t.decision} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className={`size-2 rounded-full ${TONE_DOT[toneFor(Number(t.score) || 0)]}`} />
                        {pct(t.score)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{pct(t.mlScore)}</td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-muted" title={t.reason}>
                      {reasons.map((r) => r.label).join(', ') || 'No rules fired'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} onChange={changePage} hasNext={rows.length >= PAGE_SIZE} />
    </section>
  )
}