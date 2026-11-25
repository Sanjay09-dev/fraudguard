const button = 'rounded-lg border border-line bg-white px-3.5 py-2 font-medium disabled:opacity-50'

export default function Pager({ page, onChange, hasNext }) {
  return (
    <div className="mt-6 flex items-center justify-between text-sm">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} className={button}>
        Previous
      </button>
      <span className="text-muted">Page {page + 1}</span>
      <button disabled={!hasNext} onClick={() => onChange(page + 1)} className={button}>
        Next
      </button>
    </div>
  )
}
