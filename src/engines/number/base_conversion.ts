// ========== 進数変換エンジン ==========

export const MAX_BASE      = 62
export const MIN_BASE      = 2
export const MAX_INPUT_LEN = 40

export type CharsetMode = 'upper' | 'lower'

// 大文字優先: 0-9, A-Z, a-z
// 小文字優先: 0-9, a-z, A-Z
export const CHARSETS: Record<CharsetMode, string> = {
  upper: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  lower: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
}

export interface BaseConvResult {
  fromVal:      string
  toVal:        string
  fromBase:     number
  toBase:       number
  decimal:      bigint
  toDecSteps:   string[]
  fromDecSteps: string[]
  groupSteps:   string[]
}

function digitToChar(d: number, charset: string): string {
  return charset[d] ?? '?'
}

function charToDigit(c: string, charset: string): number {
  return charset.indexOf(c)
}

// base ≤ 36 は大文字小文字を同一視してから正規化
export function normalizeInput(s: string, base: number, charset: string): string {
  if (base <= 10) return s
  const firstLetter = charset[10]
  if (base <= 36) {
    return (firstLetter >= 'A' && firstLetter <= 'Z') ? s.toUpperCase() : s.toLowerCase()
  }
  return s  // base > 36 はケースセンシティブ
}

export function isValidForBase(s: string, base: number, charset: string): boolean {
  if (!s) return false
  for (const c of s) {
    const d = charToDigit(c, charset)
    if (d < 0 || d >= base) return false
  }
  return true
}

// 使用文字の説明（連続したランを検出して A–Z 形式で表示）
export function charsetDescription(base: number, charset: string): string {
  if (base <= 10) return `0–${charset[base - 1]}`
  const parts: string[] = ['0–9']
  const letters = charset.slice(10, base)
  let start = letters[0], prev = letters[0]
  for (let i = 1; i < letters.length; i++) {
    if (letters[i].charCodeAt(0) !== letters[i - 1].charCodeAt(0) + 1) {
      parts.push(prev === start ? start : `${start}–${prev}`)
      start = letters[i]
    }
    prev = letters[i]
  }
  parts.push(prev === start ? prev : `${start}–${prev}`)
  return parts.join(', ')
}

function toDecimal(s: string, base: number, charset: string): bigint {
  const b = BigInt(base)
  return s.split('').reduce((acc, c) => acc * b + BigInt(charToDigit(c, charset)), 0n)
}

function fromDecimal(n: bigint, base: number, charset: string): string {
  if (n === 0n) return '0'
  const b = BigInt(base)
  let s = '', rem = n
  while (rem > 0n) {
    s = digitToChar(Number(rem % b), charset) + s
    rem /= b
  }
  return s
}

// ---------- 途中式 ----------

function numStr(s: string): string {
  return /[a-zA-Z]/.test(s) ? `\\mathrm{${s}}` : s
}

function buildToDecSteps(s: string, base: number, decimal: bigint, charset: string): string[] {
  if (base === 10) return []
  if (decimal === 0n) return [`${numStr(s)}_{${base}} = 0`]

  const digits = s.split('').map(c => charToDigit(c, charset))
  const n = digits.length
  const b = BigInt(base)
  const CHUNK = 4
  const allTerms = digits.map((d, i) => ({ d, exp: n - 1 - i }))
  const terms = n <= 10 ? allTerms : allTerms.filter(({ d }) => d !== 0)

  const makeTerm = (d: number, exp: number) => {
    if (exp === 0) return `${d}`
    if (exp === 1) return `${d} \\times ${base}`
    return `${d} \\times ${base}^{${exp}}`
  }

  const lines: string[] = []
  for (let i = 0; i < terms.length; i += CHUNK) {
    const chunk = terms.slice(i, i + CHUNK).map(({ d, exp }) => makeTerm(d, exp)).join(' + ')
    lines.push(i === 0 ? `${numStr(s)}_{${base}} = ${chunk}` : `\\quad + ${chunk}`)
  }

  const hasZero = digits.some(d => d === 0)
  if (hasZero && decimal <= 10n ** 18n) {
    const valTerms = allTerms
      .filter(({ d }) => d !== 0)
      .map(({ d, exp }) => String(BigInt(d) * b ** BigInt(exp)))
    if (valTerms.length > 0) lines.push(`= ${valTerms.join(' + ')}`)
  }

  lines.push(`= ${decimal}`)
  return lines
}

function buildFromDecSteps(decimal: bigint, base: number, output: string, charset: string): string[] {
  if (base === 10) return []
  if (decimal === 0n) return [`${numStr(output)}_{${base}}`]

  const b = BigInt(base)
  const rows: { n: bigint; q: bigint; r: bigint; c: string }[] = []
  let n = decimal

  while (n > 0n) {
    const r = n % b, q = n / b
    rows.push({ n, q, r, c: digitToChar(Number(r), charset) })
    n = q
  }

  const lines = rows.map(({ n, q, r, c }) => {
    const remStr = r >= 10n ? `${r} \\;(\\mathrm{${c}})` : `${r}`
    return `${n} \\div ${base} = ${q} \\text{ 余り } ${remStr}`
  })

  lines.push(rows.length > 1
    ? `\\therefore ${decimal} = ${numStr(output)}_{${base}} \\quad (\\text{下から読む})`
    : `\\therefore ${decimal} = ${numStr(output)}_{${base}}`
  )
  return lines
}

function isPow2(n: number): boolean { return n >= 2 && (n & (n - 1)) === 0 }
function log2int(n: number): number { return Math.round(Math.log2(n)) }

function buildGroupSteps(s: string, fromBase: number, toBase: number, charset: string): string[] {
  if (fromBase === 2 && isPow2(toBase) && toBase > 2) {
    const bits = log2int(toBase)
    const padded = s.padStart(Math.ceil(s.length / bits) * bits, '0')
    const groups: string[] = [], vals: string[] = []
    for (let i = 0; i < padded.length; i += bits) {
      const grp = padded.slice(i, i + bits)
      groups.push(grp)
      vals.push(digitToChar(parseInt(grp, 2), charset))
    }
    return [
      `\\text{${bits}ビットずつグループ化:}`,
      groups.map((g, i) => `\\underbrace{\\mathrm{${g}}}_{\\mathrm{${vals[i]}}}`).join(' \\;|\\; '),
      `\\therefore ${numStr(s)}_{2} = ${numStr(vals.join(''))}_{${toBase}}`,
    ]
  }

  if (toBase === 2 && isPow2(fromBase) && fromBase > 2) {
    const bits = log2int(fromBase)
    const expanded: string[] = []
    const lines: string[] = [`\\text{各桁を${bits}ビットに展開:}`]
    s.split('').forEach(c => {
      const bin = charToDigit(c, charset).toString(2).padStart(bits, '0')
      lines.push(`\\mathrm{${c}} \\to \\mathrm{${bin}}`)
      expanded.push(bin)
    })
    lines.push(`\\therefore ${numStr(s)}_{${fromBase}} = ${expanded.join('')}_{2}`)
    return lines
  }

  return []
}

// ---------- メイン ----------

export function computeBaseConv(
  input: string,
  fromBase: number,
  toBase: number,
  charsetMode: CharsetMode = 'upper',
): BaseConvResult {
  const charset = CHARSETS[charsetMode]
  const fromVal = normalizeInput(input, fromBase, charset)
  const decimal = toDecimal(fromVal, fromBase, charset)
  const toVal   = fromDecimal(decimal, toBase, charset)
  return {
    fromVal, toVal, fromBase, toBase, decimal,
    toDecSteps:   buildToDecSteps(fromVal, fromBase, decimal, charset),
    fromDecSteps: buildFromDecSteps(decimal, toBase, toVal, charset),
    groupSteps:   buildGroupSteps(fromVal, fromBase, toBase, charset),
  }
}
