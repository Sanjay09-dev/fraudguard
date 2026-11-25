export default function LiveStamp({ at }) {
  if (!at) return null
  return (
    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
      <span className="size-2 rounded-full bg-safe" />
      Updated {at.toLocaleTimeString()}
    </p>
  )
}
