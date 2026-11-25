export default function PageHeader({ title, note, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
        {note}
      </div>
      {children}
    </div>
  )
}
