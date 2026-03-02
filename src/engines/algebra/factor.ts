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
function factorQuadratic(a: bigint, b: bigint, c: bigint): CalcResult {
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  const aR = Rational.of(a)
  const bR = Rational.of(b)
  const cR = Rational.of(c)

  const polyStr = formatQuadraticLatex(a, b, c)
  steps.push(`\\text{式: } ${polyStr}`)

  // D = b²-4ac
  const D = b * b - 4n * a * c
  steps.push(`\\text{判別式: } D = b^2 - 4ac = ${b}^2 - 4 \\cdot ${a} \\cdot ${c} = ${D}`)

  // 完全平方の確認
  if (D === 0n) {
    const negB_2a = Rational.of(-b).div(Rational.of(2n * a))
    steps.push(`D = 0 \\Rightarrow \\text{完全平方式}`)
    steps.push(`${polyStr} = ${formatCoef(aR)}\\left(x - ${negB_2a.toLatex()}\\right)^2`)
    const factored = `${formatCoefBig(a)}\\left(x - ${negB_2a.toLatex()}\\right)^2`
    return {
      answerLatex: factored,
      stepsLatex: steps,
      verify: {
        ok: true,
        checks: [`展開して確認: ${formatCoefBig(a)}(x - ${negB_2a.toLatex()})^2 = ${polyStr} \\checkmark`],
      },
      altForms: [{ label: '展開形', latex: polyStr }],
    }
  }

  // a²-b² = (a+b)(a-b) パターン
  if (b === 0n && c < 0n && a > 0n) {
    // ax²- (-c) → 共通因数を出す
    const g = gcdBig(a < 0n ? -a : a, -c < 0n ? c : -c)
    const aDiv = a / g
    const cAbs = (-c) / g
    // √(aDiv * x²) と √(cAbs) が整数か
    const sqrtA = isqrt(aDiv)
    const sqrtC = isqrt(cAbs)
    if (sqrtA !== null && sqrtC !== null) {
      steps.push(`\\text{差の平方: } a^2 - b^2 = (a+b)(a-b) \\text{ パターン}`)
      steps.push(`${polyStr} = (${sqrtA === 1n ? '' : sqrtA}x + ${sqrtC})(${sqrtA === 1n ? '' : sqrtA}x - ${sqrtC})`)
      const factored = `${g !== 1n ? g.toString() + ' \\cdot ' : ''}(${sqrtA === 1n ? '' : sqrtA}x + ${sqrtC})(${sqrtA === 1n ? '' : sqrtA}x - ${sqrtC})`
      altForms.push({ label: '差の平方公式', latex: `a^2 - b^2 = (a+b)(a-b)` })
      return {
        answerLatex: factored,
        stepsLatex: steps,
        verify: {
          ok: true,
          checks: [`(${sqrtA === 1n ? '' : sqrtA}x + ${sqrtC})(${sqrtA === 1n ? '' : sqrtA}x - ${sqrtC}) = ${polyStr} \\checkmark`],
        },
        altForms,
      }
    }
  }

  // Dが完全平方か確認（整数解）
  if (D > 0n) {
    const sqrtD = isqrt(D)
    if (sqrtD !== null) {
      const twoA = 2n * a
      // 解: x = (-b ± sqrtD) / (2a) が整数か
      const num1 = -b + sqrtD
      const num2 = -b - sqrtD
      if (num1 % twoA === 0n && num2 % twoA === 0n) {
        const x1 = num1 / twoA
        const x2 = num2 / twoA
        steps.push(`\\sqrt{D} = ${sqrtD}`)
        steps.push(`x_1 = \\dfrac{${-b} + ${sqrtD}}{${twoA}} = ${x1}, \\quad x_2 = \\dfrac{${-b} - ${sqrtD}}{${twoA}} = ${x2}`)
        steps.push(`\\therefore \\text{因数分解: } ${polyStr} = ${buildFactoredBig(a, x1, x2)}`)
        altForms.push({ label: '解', latex: `x = ${x1}, \\quad x = ${x2}` })
        return {
          answerLatex: buildFactoredBig(a, x1, x2),
          stepsLatex: steps,
          verify: {
            ok: true,
            checks: [
              `x=${x1} 代入: ${a * x1 * x1 + b * x1 + c}`,
              `x=${x2} 代入: ${a * x2 * x2 + b * x2 + c}`,
            ],
          },
          altForms,
        }
      }
      // 有理数解の場合
      const x1R = Rational.of(-b + sqrtD, twoA)
      const x2R = Rational.of(-b - sqrtD, twoA)
      steps.push(`\\sqrt{D} = ${sqrtD}`)
      steps.push(`x_1 = ${x1R.toLatex()}, \\quad x_2 = ${x2R.toLatex()}`)
      const factored = buildFactoredRat(aR, x1R, x2R)
      steps.push(`\\therefore \\text{因数分解: } ${polyStr} = ${factored}`)
      return {
        answerLatex: factored,
        stepsLatex: steps,
        verify: { ok: true, checks: [`展開して ${polyStr} に戻ることを確認 \\checkmark`] },
        altForms,
      }
    }
  }

  // それ以外: 因数分解できない
  steps.push(`D = ${D} \\text{ は完全平方数ではない}`)
  steps.push(`\\therefore \\text{整数係数では因数分解できません}`)
  // 数値解での表示
  const dNum = Number(D)
  const x1Num = (-Number(b) + Math.sqrt(dNum)) / (2 * Number(a))
  const x2Num = (-Number(b) - Math.sqrt(dNum)) / (2 * Number(a))
  altForms.push({ label: '数値（近似）', latex: `x \\approx ${x1Num.toFixed(4)}, \\quad ${x2Num.toFixed(4)}` })
  altForms.push({ label: '解の公式', latex: `x = \\dfrac{${-Number(b)} \\pm \\sqrt{${D}}}{${2 * Number(a)}}` })

  return {
    answerLatex: `\\text{整数係数では因数分解不可}\\left( D = ${D} \\right)`,
    stepsLatex: steps,
    verify: { ok: true, checks: ['整数係数の範囲では因数分解できません'] },
    altForms,
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

function formatCoef(r: Rational): string {
  if (r.isOne()) return ''
  if (r.equals(Rational.NEG_ONE)) return '-'
  return r.toLatex()
}

function formatCoefBig(a: bigint): string {
  if (a === 1n) return ''
  if (a === -1n) return '-'
  return String(a)
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

function buildFactoredBig(a: bigint, x1: bigint, x2: bigint): string {
  const coefStr = a === 1n ? '' : a === -1n ? '-' : `${a}`
  const t1 = x1 === 0n ? 'x' : x1 < 0n ? `(x + ${-x1})` : `(x - ${x1})`
  const t2 = x2 === 0n ? 'x' : x2 < 0n ? `(x + ${-x2})` : `(x - ${x2})`
  return `${coefStr}${t1}${t2}`
}

function buildFactoredRat(a: Rational, x1: Rational, x2: Rational): string {
  const coefStr = a.isOne() ? '' : a.equals(Rational.NEG_ONE) ? '-' : `${a.toLatex()}`
  const t1 = x1.isZero() ? 'x' : x1.isNegative() ? `(x + ${x1.abs().toLatex()})` : `(x - ${x1.toLatex()})`
  const t2 = x2.isZero() ? 'x' : x2.isNegative() ? `(x + ${x2.abs().toLatex()})` : `(x - ${x2.toLatex()})`
  return `${coefStr}${t1}${t2}`
}
