import { TONE_DOT, toneFor } from '../risk'

const ZONE = { safe: 'approved range', caution: 'review range', danger: 'block range' }
const clamp = (n) => Math.min(Math.max(Number(n) || 0, 0), 1)

export default function RiskRuler({ pins, hero = false, label }) {
  const main = clamp(pins[0].score)
  const summary = label ?? `Risk score ${main.toFixed(2)}, in the ${ZONE[toneFor(main)]}`

  return (
    <div role="img" aria-label={summary}>
      <div className={`relative flex items-center ${hero ? 'mt-10 h-6' : 'h-4'}`}>
        <div className={`flex w-full overflow-hidden rounded-full ${hero ? 'h-3' : 'h-2'}`}>
          <div className="w-[40%] bg-safe/25" />
          <div className="w-[40%] bg-caution/35" />
          <div className="w-[20%] bg-danger/30" />
        </div>

        {pins.map((pin, i) => {
          const score = clamp(pin.score)
          return (
            <span
              key={i}
              className={`ruler-pin absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ${
                hero ? 'ruler-pin-intro size-5 ring-ink' : 'size-3.5 ring-white'
              } ${TONE_DOT[toneFor(score)]}`}
              style={{ '--x': `${score * 100}%`, '--delay': `${pin.delay ?? 0}ms` }}
            >
              {pin.label && (
                <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-ink">
                  {pin.label}
                </span>
              )}
            </span>
          )
        })}
      </div>

      {hero && (
        <div className="mt-3 text-sm text-white/70">
          <div className="flex">
            <span className="w-[40%]">Approved</span>
            <span className="w-[40%]">Needs review</span>
            <span className="w-[20%]">Blocked</span>
          </div>
          <div className="relative mt-1 h-4 text-xs text-white/50">
            <span className="absolute left-0">0</span>
            <span className="absolute left-[40%] -translate-x-1/2">0.40</span>
            <span className="absolute left-[80%] -translate-x-1/2">0.80</span>
            <span className="absolute right-0">1</span>
          </div>
        </div>
      )}
    </div>
  )
}
