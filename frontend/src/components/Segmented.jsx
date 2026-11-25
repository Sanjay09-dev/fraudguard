export default function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.value ? 'bg-ink text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
