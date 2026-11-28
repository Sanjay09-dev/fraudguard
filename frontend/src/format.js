export function money(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export const pct = (value) => (value == null ? '—' : `${Math.round(Number(value) * 100)}%`)

const FRIENDLY = {
  HIGH_AMOUNT: 'Large amount',
  VELOCITY: 'Many payments in a minute',
  FOREIGN_COUNTRY: 'Unusual country',
  NEW_DEVICE: 'New device',
  ML_MODEL: 'Model flagged it',
}

// Turns "HIGH_AMOUNT (amount 75000 >= limit 50000); NEW_DEVICE (...)" into readable items.
export function parseReasons(text) {
  if (!text || text === 'No rules triggered') return []
  return text.split('; ').map((part) => {
    const i = part.indexOf(' (')
    const code = i === -1 ? part : part.slice(0, i)
    if (FRIENDLY[code]) {
      const detail = i === -1 ? '' : part.slice(i + 2).replace(/\)$/, '')
      return { label: FRIENDLY[code], detail }
    }
    return { label: part, detail: '' }
  })
}  