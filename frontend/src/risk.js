export const REVIEW_AT = 0.4
export const BLOCK_AT = 0.8

export function toneFor(score) {
  if (score >= BLOCK_AT) return 'danger'
  if (score >= REVIEW_AT) return 'caution'
  return 'safe'
}

export const TONE_DOT = { safe: 'bg-safe', caution: 'bg-caution', danger: 'bg-danger' }
