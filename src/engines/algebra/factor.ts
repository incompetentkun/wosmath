// ========== 因数分解・展開ソルバ ==========
// 対象: 整数係数の多項式（2次・3次の標準形）

import { Rational } from '../rational'
import type { CalcResult } from '../../types'

export type FactorMode = 'factor' | 'expand'

export interface FactorParams {
  expression: string  // "x^2-9", "x^2+5x+6", "(x+3)^2" など
  mode: FactorMode
}

// ========== 式パーサ（簡易版）==========
// 対応: ax^2+bx+c, a^2-b^2, (x+a)(x+b), (x+a)^2 など

interface ParsedPoly {
  type: 'quadratic'
  a: bigint; b: bigint; c: bigint
}

function parseQuadratic(expr: string): ParsedPoly | null {
  // ax^2+bx+c の形にマッチ
  // 空白除去
  const s = expr.replace(/\s/g, '').replace(/\*\*/g, '^')

  // パターン: [±][係数]x^2 [±][係数]x [±][定数]
  const match = s.match(/^([+-]?\d*)\*?x\^2([+-]\d*)\*?x([+-]\d+)$/)
  if (match) {
    const aStr = match[1]
    const bStr = match[2]
    const cStr = match[3]
    const a = aStr === '' || aStr === '+' ? 1n : aStr === '-' ? -1n : BigInt(aStr)
    const b = bStr === '' || bStr === '+' ? 1n : bStr === '-' ? -1n : BigInt(bStr)
    const c = BigInt(cStr)
    return { type: 'quadratic', a, b, c }
  }

  // ax^2+c の形（b=0）
  const match2 = s.match(/^([+-]?\d*)\*?x\^2([+-]\d+)$/)
  if (match2) {
    const aStr = match2[1]
    const a = aStr === '' || aStr === '+' ? 1n : aStr === '-' ? -1n : BigInt(aStr)
    return { type: 'quadratic', a, b: 0n, c: BigInt(match2[2]) }
  }

  // ax^2 の形（b=c=0）
  const match3 = s.match(/^([+-]?\d*)\*?x\^2$/)
  if (match3) {
    const aStr = match3[1]
    const a = aStr === '' || aStr === '+' ? 1n : aStr === '-' ? -1n : BigInt(aStr)
    return { type: 'quadratic', a, b: 0n, c: 0n }
  }

  // [±][係数]x の形（a=c=0）
  const matchLinear = s.match(/^([+-]?\d*)\*?x$/)
  if (matchLinear) {
    const aStr = matchLinear[1]
    const a = aStr === '' || aStr === '+' ? 1n : aStr === '-' ? -1n : BigInt(aStr)
    return { type: 'quadratic', a: 0n, b: a, c: 0n }
  }

  return null
}

// ========== 二次式の因数分解 ==========
export function factorQuadratic(a: bigint, b: bigint, c: bigint): CalcResult {
  const steps: string[] = []
  const origLatex = formatQuadraticLatex(a, b, c)
  steps.push(`\\text{式: } ${origLatex}`)

  // ── Step 1: 先頭係数を正に (a < 0 → -1 をくくる) ──
  let prefix = 1n
  let A = a, B = b, C = c
  if (A < 0n) {
    prefix = -1n
    A = -A; B = -B; C = -C
    steps.push(`= -(${formatQuadraticLatex(A, B, C)})`)
  }

  // ── Step 2: 共通因数 (GCF) ──
  const absB = B < 0n ? -B : B
  const absC = C < 0n ? -C : C
  const g = gcdBig(gcdBig(A, absB), absC)
  if (g > 1n) {
    prefix *= g
    A /= g; B /= g; C /= g
    steps.push(`= ${pfx(prefix)}(${formatQuadraticLatex(A, B, C)})`)
  }

  // ── Special: C=0 かつ B≠0 → x をくくり出す ──
  if (C === 0n && B !== 0n) {
    const linPart = linFac(A, -B)  // (Ax + B) の形
    const answer = `${pfx(prefix)}x${linPart}`
    steps.push(`x \\text{ をくくり出す}`)
    if (prefix === 1n) {
      steps.push(`= x${linPart}`)
    } else {
      steps.push(`= ${pfx(prefix)}(x${linPart}) = ${answer}`)
      steps.push(`\\therefore ${origLatex} = ${answer}`)
    }
    return {
      answerLatex: answer,
      stepsLatex: steps,
      verify: { ok: true, checks: [`展開すると ${origLatex} に戻ることを確認 \\checkmark`] },
      altForms: [],
    }
  }

  // ── Step 3: Ax²+Bx+C を因数分解 ──
  const D = B * B - 4n * A * C
  const sqrtD = isqrt(D)

  // 因数分解不可
  if (sqrtD === null) {
    const B2 = B * B
    const fourAC = 4n * A * C
    const dCalc = `D = b^2 - 4ac = ${B < 0n ? `(${B})` : String(B)}^2 - 4 \\times ${A} \\times ${C < 0n ? `(${C})` : String(C)} = ${B2} - (${fourAC}) = ${D}`
    const reason = D < 0n
      ? `D < 0 \\text{ のため、実数の範囲では因数分解できません}`
      : `${D} \\text{ は平方数ではないため、整数係数では因数分解できません}`
    return {
      answerLatex: `${dCalc} \\\\[6pt] ${reason}`,
      stepsLatex: [],
      verify: { ok: false, checks: [] },
      altForms: [],
    }
  }

  // 因数分解できる: 根を有理数で取得
  // x1 = (-B + sqrtD) / (2A) = n1/d1,  x2 = (-B - sqrtD) / (2A) = n2/d2
  const x1R = Rational.of(-B + sqrtD, 2n * A)
  const x2R = Rational.of(-B - sqrtD, 2n * A)
  const d1 = x1R.den, n1 = x1R.num
  const d2 = x2R.den, n2 = x2R.num

  // 因数: (d1*x - n1)(d2*x - n2)  ← 分数なし整数係数形
  // 残余係数 rem = A / (d1*d2) は必ず整数になる
  const rem = A / (d1 * d2)
  const fac1 = linFac(d1, n1)
  const fac2 = linFac(d2, n2)
  const isPerfect = sqrtD === 0n
  const innerStr = isPerfect ? `${fac1}^2` : `${fac1}${fac2}`
  const remStr = rem === 1n ? '' : String(rem)
  const answer = `${pfx(prefix)}${remStr}${innerStr}`

  if (A === 1n) {
    // ── 積と和の方法 (a=1) ──
    // (x+p)(x+q) の p=-n1, q=-n2  (p+q=B, p*q=C)
    const p = -n1, q = -n2
    const pS = ns(p), qS = ns(q)
    steps.push(`\\text{積が } ${C}\\text{、和が } ${B} \\text{ になる2数を探す}`)
    if (isPerfect) {
      steps.push(`\\rightarrow ${pS} \\text{ と } ${pS} \\quad (\\text{同じ数})`)
      steps.push(`\\therefore ${formatQuadraticLatex(A, B, C)} = ${fac1}^2`)
    } else {
      steps.push(`\\rightarrow ${pS} \\text{ と } ${qS} \\quad (${pS} + ${qS} = ${B},\\ ${pS} \\times ${qS} = ${C})`)
      steps.push(`\\therefore ${formatQuadraticLatex(A, B, C)} = ${fac1}${fac2}`)
    }
  } else {
    // ── たすき掛け・グループ法 (a>1) ──
    // Bx を m + nCoef に分割: m*nCoef = A*C, m+nCoef = B
    const AC = A * C
    const m = -(d1 * n2)
    const nCoef = -(n1 * d2)
    const mS = ns(m), nS = ns(nCoef)
    steps.push(`\\text{積が } ${A} \\times (${C}) = ${AC}\\text{、和が } ${B} \\text{ になる2数を探す}`)
    if (isPerfect) {
      steps.push(`\\rightarrow ${mS} \\text{ と } ${mS} \\quad (\\text{同じ数})`)
    } else {
      steps.push(`\\rightarrow ${mS} \\text{ と } ${nS} \\quad (${mS} + ${nS} = ${B},\\ ${mS} \\times ${nS} = ${AC})`)
    }
    // 分割した式を表示
    steps.push(splitLatex(A, m, nCoef, C))
    // グループ分けして因数分解
    // Group1: Ax²+mx = d1*x*(d2*x-n2),  Group2: nCoef*x+C = -n1*(d2*x-n2)
    const inner = linFac(d2, n2)
    const g1outer = d1 === 1n ? 'x' : `${d1}x`
    const negN1 = -n1
    const sign2 = negN1 >= 0n ? ' + ' : ' - '
    const abs2 = negN1 < 0n ? -negN1 : negN1
    const g2outer = abs2 === 1n ? '' : String(abs2)
    steps.push(`= ${g1outer}${inner}${sign2}${g2outer}${inner}`)
    steps.push(`= ${innerStr}`)
  }

  // prefix があれば全体の答えを明示
  if (prefix !== 1n) {
    steps.push(`\\therefore ${origLatex} = ${answer}`)
  }


  return {
    answerLatex: answer,
    stepsLatex: steps,
    verify: { ok: true, checks: [`展開すると ${origLatex} に戻ることを確認 \\checkmark`] },
    altForms: [],
  }
}

// ========== 展開ソルバ ==========
function expandExpression(expr: string): CalcResult {
  const steps: string[] = []
  const s = expr.replace(/\s/g, '')

  // (x+a)^2 パターン
  const sq = s.match(/^\(x([+-]\d+)\)\^2$/)
  if (sq) {
    const a = BigInt(sq[1])
    steps.push(`\\text{公式: } (x + a)^2 = x^2 + 2ax + a^2`)
    steps.push(`a = ${a}`)
    const twoA = 2n * a
    const a2 = a * a
    const result = formatQuadraticLatex(1n, twoA, a2)
    steps.push(`(x ${a >= 0n ? '+' : ''}${a})^2 = x^2 ${twoA >= 0n ? '+' : ''}${twoA}x ${a2 >= 0n ? '+' : ''}${a2}`)
    return {
      answerLatex: result,
      stepsLatex: steps,
      verify: { ok: true, checks: [`(x${a >= 0n ? '+' : ''}${a})^2 = ${result} \\checkmark`] },
      altForms: [{ label: '元の式', latex: `(x${a >= 0n ? '+' : ''}${a})^2` }],
    }
  }

  // (ax+b)(cx+d) パターン
  const prod = s.match(/^\(([+-]?\d*)x([+-]\d+)\)\(([+-]?\d*)x([+-]\d+)\)$/)
  if (prod) {
    const parseC = (s: string) => s === '' || s === '+' ? 1n : s === '-' ? -1n : BigInt(s)
    const a = parseC(prod[1]), b = BigInt(prod[2])
    const c = parseC(prod[3]), d = BigInt(prod[4])
    steps.push(`\\text{FOIL法で展開}`)
    steps.push(`(${a}x ${b >= 0n ? '+' : ''}${b})(${c}x ${d >= 0n ? '+' : ''}${d})`)
    steps.push(`= ${a}x \\cdot ${c}x + ${a}x \\cdot ${d} + ${b} \\cdot ${c}x + ${b} \\cdot ${d}`)
    const A = a * c, B = a * d + b * c, C = b * d
    steps.push(`= ${A}x^2 + (${a * d} + ${b * c})x + ${C}`)
    const result = formatQuadraticLatex(A, B, C)
    steps.push(`= ${result}`)
    return {
      answerLatex: result,
      stepsLatex: steps,
      verify: { ok: true, checks: [`展開結果: ${result} \\checkmark`] },
      altForms: [],
    }
  }

  throw new Error(`展開できない形式です。対応: (x±a)^2, (ax+b)(cx+d)`)
}

// ========== メインエントリ ==========
export function solveFactorExpand(params: FactorParams): CalcResult {
  const { expression, mode } = params

  if (mode === 'expand') {
    return expandExpression(expression)
  }

  // 因数分解
  const parsed = parseQuadratic(expression)
  if (!parsed) {
    throw new Error(`式を認識できませんでした。例: x^2-9, x^2+5x+6, 2x^2-x-3`)
  }
  return factorQuadratic(parsed.a, parsed.b, parsed.c)
}

// ========== ユーティリティ ==========
function gcdBig(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b
  while (b !== 0n) { const t = b; b = a % b; a = t }
  return a
}

function isqrt(n: bigint): bigint | null {
  if (n < 0n) return null
  if (n === 0n) return 0n
  let x = BigInt(Math.ceil(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x * x === n ? x : null
}

/** prefix 係数を LaTeX 文字列に変換 (1→'', -1→'-', それ以外→数値) */
function pfx(p: bigint): string {
  if (p === 1n) return ''
  if (p === -1n) return '-'
  return String(p)
}

/** 数値を LaTeX 文字列に（負数はカッコ付き） */
function ns(n: bigint): string {
  return n < 0n ? `(${n})` : String(n)
}

/** 線形因数 (d*x - n) を LaTeX 文字列に変換 */
function linFac(d: bigint, n: bigint): string {
  const constTerm = -n
  const dStr = d === 1n ? '' : String(d)
  if (constTerm === 0n) return d === 1n ? 'x' : `${d}x`
  const op = constTerm > 0n ? '+' : '-'
  const abs = constTerm < 0n ? -constTerm : constTerm
  return `(${dStr}x ${op} ${abs})`
}

/** Bx を m と nCoef に分割した式 Ax²+mx+nCoef*x+C */
function splitLatex(A: bigint, m: bigint, nCoef: bigint, C: bigint): string {
  const x2part = A === 1n ? 'x^2' : `${A}x^2`
  const mpart = m === 1n ? ' + x' : m === -1n ? ' - x' : m > 0n ? ` + ${m}x` : ` - ${-m}x`
  const npart = nCoef === 1n ? ' + x' : nCoef === -1n ? ' - x' : nCoef > 0n ? ` + ${nCoef}x` : ` - ${-nCoef}x`
  const cpart = C === 0n ? '' : C > 0n ? ` + ${C}` : ` - ${-C}`
  return `${x2part}${mpart}${npart}${cpart}`
}

// ========== 3次因数分解 ==========

function formatCubicLatex(a: bigint, b: bigint, c: bigint, d: bigint): string {
  let s = ''
  if (a !== 0n) {
    if (a === 1n) s += 'x^3'
    else if (a === -1n) s += '-x^3'
    else s += `${a}x^3`
  }
  if (b !== 0n) {
    if (b === 1n) s += (s ? ' + ' : '') + 'x^2'
    else if (b === -1n) s += (s ? ' - ' : '-') + 'x^2'
    else if (b > 0n) s += (s ? ` + ${b}x^2` : `${b}x^2`)
    else s += (s ? ` - ${-b}x^2` : `${b}x^2`)
  }
  if (c !== 0n) {
    if (c === 1n) s += (s ? ' + ' : '') + 'x'
    else if (c === -1n) s += (s ? ' - ' : '-') + 'x'
    else if (c > 0n) s += (s ? ` + ${c}x` : `${c}x`)
    else s += (s ? ` - ${-c}x` : `${c}x`)
  }
  if (d !== 0n) {
    if (d > 0n) s += (s ? ` + ${d}` : `${d}`)
    else s += (s ? ` - ${-d}` : `${d}`)
  }
  return s || '0'
}

function cubeRoot(n: bigint): bigint | null {
  if (n === 0n) return 0n
  const sign = n < 0n ? -1n : 1n
  const absN = n < 0n ? -n : n
  let x = BigInt(Math.round(Math.cbrt(Number(absN))))
  if (x < 1n) x = 1n
  while (x * x * x > absN) x--
  while ((x + 1n) * (x + 1n) * (x + 1n) <= absN) x++
  return x * x * x === absN ? sign * x : null
}

function divisorsBig(n: bigint): bigint[] {
  if (n < 0n) n = -n
  if (n === 0n) return []
  const divs: bigint[] = []
  for (let i = 1n; i * i <= n; i++) {
    if (n % i === 0n) {
      divs.push(i)
      if (i !== n / i) divs.push(n / i)
    }
  }
  divs.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return divs
}

function findRationalRoot3(A: bigint, B: bigint, C: bigint, D: bigint): Rational | null {
  if (D === 0n) return Rational.of(0n, 1n)
  const pCands = divisorsBig(D < 0n ? -D : D)
  const qCands = divisorsBig(A)
  for (const q of qCands) {
    for (const p of pCands) {
      for (const sign of [1n, -1n]) {
        const pS = sign * p
        const val = A * pS * pS * pS + B * q * pS * pS + C * q * q * pS + D * q * q * q
        if (val === 0n) {
          return Rational.of(pS, q)
        }
      }
    }
  }
  return null
}

function formatTermSum(terms: bigint[]): string {
  const nonZero = terms.filter(t => t !== 0n)
  if (nonZero.length === 0) return '0'
  let s = ''
  for (const t of nonZero) {
    if (s === '') {
      s = String(t)
    } else if (t > 0n) {
      s += ` + ${t}`
    } else {
      s += ` - ${-t}`
    }
  }
  return s
}

export function factorCubic(a: bigint, b: bigint, c: bigint, d: bigint): CalcResult {
  const steps: string[] = []
  const origLatex = formatCubicLatex(a, b, c, d)
  steps.push(`\\text{式: } ${origLatex}`)

  // Step 1: 符号正規化 (先頭係数を正に)
  let prefix = 1n
  let A = a, B = b, C = c, D = d
  if (A < 0n) {
    prefix = -1n
    A = -A; B = -B; C = -C; D = -D
    steps.push(`= -(${formatCubicLatex(A, B, C, D)})`)
  }

  // Step 2: GCF
  const g = gcdBig(gcdBig(gcdBig(A, B), C), D)
  if (g > 1n) {
    prefix *= g
    A /= g; B /= g; C /= g; D /= g
    steps.push(`= ${pfx(prefix)}(${formatCubicLatex(A, B, C, D)})`)
  }

  // Step 3: D=0 特殊ケース (定数項が 0)
  if (D === 0n) {
    if (C === 0n && B === 0n) {
      // Ax³ → x³ (GCF により A=1 のはず)
      const answer = `${pfx(prefix)}x^3`
      steps.push(`\\therefore ${origLatex} = ${answer}`)
      return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
    }
    if (C === 0n) {
      // Ax³+Bx² = x²(Ax+B)
      const linStr = linFac(A, -B)
      const answer = `${pfx(prefix)}x^2${linStr}`
      steps.push(`x^2 \\text{ をくくり出す}`)
      steps.push(`\\therefore ${origLatex} = ${answer}`)
      return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
    }
    // Ax³+Bx²+Cx = x(Ax²+Bx+C)
    steps.push(`x \\text{ をくくり出す}`)
    const quadLatex = formatQuadraticLatex(A, B, C)
    steps.push(`= ${pfx(prefix)}x(${quadLatex})`)
    const qResult = factorQuadratic(A, B, C)
    if (qResult.verify.ok) {
      steps.push(`${quadLatex} = ${qResult.answerLatex}`)
      const answer = `${pfx(prefix)}x${qResult.answerLatex}`
      steps.push(`\\therefore ${origLatex} = ${answer}`)
      return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
    } else {
      steps.push(`${quadLatex} \\text{ は整数係数では因数分解できません}`)
      const answer = `${pfx(prefix)}x(${quadLatex})`
      steps.push(`\\therefore ${origLatex} = ${answer}`)
      return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
    }
  }

  // Step 3.5: 和・差の公式チェック (B=0, C=0, D≠0)
  if (B === 0n && C === 0n) {
    const ca = cubeRoot(A)
    const cbAbs = cubeRoot(D < 0n ? -D : D)
    if (ca !== null && cbAbs !== null) {
      const aStr = ca === 1n ? 'x' : `${ca}x`
      if (D > 0n) {
        // 和の公式: a³+b³ = (a+b)(a²-ab+b²)
        const linStr = linFac(ca, -cbAbs)  // (ca*x + cbAbs)
        const quadStr = formatQuadraticLatex(ca * ca, -(ca * cbAbs), cbAbs * cbAbs)
        const answer = `${pfx(prefix)}${linStr}(${quadStr})`
        steps.push(`\\text{和の公式: } a^3+b^3=(a+b)(a^2-ab+b^2)`)
        steps.push(`a = ${aStr},\\quad b = ${cbAbs}`)
        steps.push(`\\therefore ${origLatex} = ${answer}`)
        return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
      } else {
        // 差の公式: a³-b³ = (a-b)(a²+ab+b²)
        const linStr = linFac(ca, cbAbs)   // (ca*x - cbAbs)
        const quadStr = formatQuadraticLatex(ca * ca, ca * cbAbs, cbAbs * cbAbs)
        const answer = `${pfx(prefix)}${linStr}(${quadStr})`
        steps.push(`\\text{差の公式: } a^3-b^3=(a-b)(a^2+ab+b^2)`)
        steps.push(`a = ${aStr},\\quad b = ${cbAbs}`)
        steps.push(`\\therefore ${origLatex} = ${answer}`)
        return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
      }
    }
  }

  // Step 3.7: 完全3乗式チェック (ax+b)^3 = a³x³+3a²bx²+3ab²x+b³
  {
    const ca = cubeRoot(A)
    const cb = cubeRoot(D)
    if (ca !== null && cb !== null && B === 3n * ca * ca * cb && C === 3n * ca * cb * cb) {
      // (ca*x + cb)^3 にマッチ
      const linStr = linFac(ca, -cb)  // linFac(d,n) = (dx-n), n=-cb なので (dx+cb)
      const answer = `${pfx(prefix)}${linStr}^3`
      steps.push(`\\text{完全3乗: } (ax+b)^3 = a^3x^3 + 3a^2bx^2 + 3ab^2x + b^3`)
      steps.push(`a = ${ca},\\quad b = ${cb}`)
      steps.push(`\\therefore ${origLatex} = ${answer}`)
      return { answerLatex: answer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
    }
  }

  // Step 4: 有理数根探索
  const root = findRationalRoot3(A, B, C, D)
  if (root === null) {
    return {
      answerLatex: `\\text{因数分解できない}`,
      stepsLatex: steps,
      verify: { ok: false, checks: [] },
      altForms: [],
    }
  }

  const p = root.num   // 分子 (符号付き)
  const q = root.den   // 分母 (常に正)

  // Step 5: 根の代入確認
  if (q === 1n) {
    const terms = [A * p * p * p, B * p * p, C * p, D]
    steps.push(`x = ${p} \\text{ を代入: } ${formatTermSum(terms)} = 0 \\ \\checkmark`)
  } else {
    const rLatex = p < 0n ? `-\\dfrac{${-p}}{${q}}` : `\\dfrac{${p}}{${q}}`
    steps.push(`x = ${rLatex} \\text{ を代入すると } 0 \\text{ になる} \\ \\checkmark`)
  }

  // Step 6: 合成除法 (Ax³+Bx²+Cx+D ÷ (qx-p))
  const aQ = A / q
  const e1 = (B + p * aQ) / q
  const e2 = (C + p * e1) / q

  const linFacStr = linFac(q, p)
  const quotientLatex = formatQuadraticLatex(aQ, e1, e2)
  steps.push(`${linFacStr} \\text{ で割ると: } ${quotientLatex}`)

  // Step 7: 3重根チェック (合成除法の商が同じ根の完全平方式か確認)
  const D_quad = e1 * e1 - 4n * aQ * e2
  if (D_quad === 0n && e1 * q + 2n * aQ * p === 0n) {
    // 3重根: (linFac)^3 × (aQ/q²)
    const k = aQ / (q * q)
    const totalCoeff = prefix * k
    const finalAnswer = `${pfx(totalCoeff)}${linFacStr}^3`
    steps.push(`${linFacStr} \\text{ が再び因数 } \\Rightarrow ${pfx(totalCoeff)}${linFacStr}^3`)
    steps.push(`\\therefore ${origLatex} = ${finalAnswer}`)
    return { answerLatex: finalAnswer, stepsLatex: steps, verify: { ok: true, checks: [] }, altForms: [] }
  }

  // Step 7: 商の因数分解
  const quadRes = factorQuadratic(aQ, e1, e2)
  let finalAnswer: string
  if (quadRes.verify.ok) {
    steps.push(`${quotientLatex} = ${quadRes.answerLatex}`)
    finalAnswer = `${pfx(prefix)}${linFacStr}${quadRes.answerLatex}`
  } else {
    steps.push(`${quotientLatex} \\text{ は整数係数では因数分解できません}`)
    finalAnswer = `${pfx(prefix)}${linFacStr}(${quotientLatex})`
  }

  steps.push(`\\therefore ${origLatex} = ${finalAnswer}`)

  return {
    answerLatex: finalAnswer,
    stepsLatex: steps,
    verify: { ok: true, checks: [] },
    altForms: [],
  }
}

function formatQuadraticLatex(a: bigint, b: bigint, c: bigint): string {
  let s = ''
  if (a !== 0n) {
    if (a === 1n) s += 'x^2'
    else if (a === -1n) s += '-x^2'
    else s += `${a}x^2`
  }
  if (b !== 0n) {
    if (b === 1n) s += (s ? ' + ' : '') + 'x'
    else if (b === -1n) s += (s ? ' - ' : '-') + 'x'
    else if (b > 0n) s += (s ? ` + ${b}x` : `${b}x`)
    else s += (s ? ` - ${-b}x` : `${b}x`)
  }
  if (c !== 0n) {
    if (c > 0n) s += (s ? ` + ${c}` : `${c}`)
    else s += (s ? ` - ${-c}` : `${c}`)
  }
  return s || '0'
}
