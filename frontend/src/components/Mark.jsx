export default function Mark({ className = 'size-7' }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect x="1" y="11" width="26" height="6" rx="3" fill="currentColor" opacity="0.3" />
      <circle cx="19" cy="14" r="7" fill="#d6393f" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  )
}
