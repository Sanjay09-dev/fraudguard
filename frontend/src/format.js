export function money(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export const DECISION_STYLE = {
  BLOCK: 'bg-red-100 text-red-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  APPROVE: 'bg-green-100 text-green-800',
}

export const pct = (value) => (value == null ? '—' : `${Math.round(Number(value) * 100)}%`)
