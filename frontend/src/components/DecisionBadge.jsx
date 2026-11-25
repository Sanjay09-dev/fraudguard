const STYLE = {
  BLOCK: 'bg-danger-tint text-danger-ink',
  REVIEW: 'bg-caution-tint text-caution-ink',
  APPROVE: 'bg-safe-tint text-safe-ink',
}
const DOT = { BLOCK: 'bg-danger', REVIEW: 'bg-caution', APPROVE: 'bg-safe' }
const LABEL = { BLOCK: 'Blocked', REVIEW: 'Needs review', APPROVE: 'Approved' }

export default function DecisionBadge({ decision }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${
        STYLE[decision] ?? 'bg-mist text-ink'
      }`}
    >
      <span className={`size-1.5 rounded-full ${DOT[decision] ?? 'bg-muted'}`} />
      {LABEL[decision] ?? decision}
    </span>
  )
}
