// ========== 定積分ソルバ ==========
// 多項式 Σ(aₙxⁿ) の定積分を有理数で厳密計算
// F(x) = Σ(aₙxⁿ⁺¹/(n+1)), 答え = F(b) - F(a)

import { Rational } from '../rational'
import type { CalcResult } from '../../types'

export interface IntegralParams {
  // 係数配列: coeffs[i] = xⁱ の係数
  // 例: x³ - 2x² + x - 2 → coeffs = [-2, 1, -2, 1]
  coeffs: number[]
  lower: number  // 積分下限
  upper: number  // 積分上限
}

/** xⁿ の LaTeX */
function xPow(n: number): string {
  if (n === 0) return ''
  if (n === 1) return 'x'
  return `x^{${n}}`
}

/** 有理数係数と次数からラテックス項を作る */
function termLatex(coef: Rational, n: number, forceSign = false): string {
  if (coef.isZero()) return ''
  const xp = xPow(n)
  if (xp === '') return coef.toLatex(forceSign)
  if (coef.isOne()) return forceSign ? `+${xp}` : xp
  if (coef.equals(Rational.NEG_ONE)) return `-${xp}`
  return `${coef.toLatex(forceSign)}${xp}`
}

/** 多項式の LaTeX */
function polyLatex(coeffs: Rational[]): string {
  let s = ''
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const t = termLatex(coeffs[i], i, s !== '')
    s += t
  }
  return s || '0'
}

/** 有理数の冪 (r^n, n≥0) */
function rationalPow(r: Rational, n: number): Rational {
  if (n === 0) return Rational.ONE
  let result = Rational.ONE
  for (let i = 0; i < n; i++) result = result.mul(r)
  return result
}

/** 多項式 F を x=val で評価 */
function evalPoly(coeffs: Rational[], val: Rational): Rational {
  return coeffs.reduce((acc, c, i) => acc.add(c.mul(rationalPow(val, i))), Rational.ZERO)
}

export function solveIntegral(params: IntegralParams): CalcResult {
  const { coeffs: rawCoeffs, lower, upper } = params
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  // 有理数に変換
  const coeffs = rawCoeffs.map(c => Rational.of(c))

  // 最高次から末尾の0を削除
  while (coeffs.length > 1 && coeffs[coeffs.length - 1].isZero()) coeffs.pop()

  const a = Rational.of(lower)
  const b = Rational.of(upper)

  // 表示用
  const fStr = polyLatex(coeffs)
  steps.push(`\\text{計算する積分:}`)
  steps.push(`\\int_{${lower}}^{${upper}} \\left(${fStr}\\right) dx`)

  // 原始関数 F(x) を計算
  const Fcoeffs: Rational[] = [Rational.ZERO] // x^0 項は積分定数（0として扱う）
  steps.push(`\\text{【Step 1】原始関数を求める}`)
  steps.push(`\\int x^n dx = \\dfrac{x^{n+1}}{n+1} + C`)

  const antiderTerms: string[] = []
  for (let i = 0; i < coeffs.length; i++) {
    if (coeffs[i].isZero()) {
      Fcoeffs.push(Rational.ZERO)
      continue
    }
    // aₙxⁿ → aₙ/(n+1) * xⁿ⁺¹
    const newCoef = coeffs[i].div(Rational.of(i + 1))
    Fcoeffs.push(newCoef)
    antiderTerms.push(`\\int ${termLatex(coeffs[i], i)} \\, dx = ${termLatex(newCoef, i + 1)}`)
  }
  steps.push(antiderTerms.join(', \\quad '))

  // F(x) の LaTeX（定数項を除く = index 1以上）
  const FcoeffsDisplay = Fcoeffs.slice(1)
  const FxStr = polyLatex(FcoeffsDisplay.map((c, i) => {
    // index i corresponds to x^(i+1)
    return c
  }))
  // 実際に表示する原始関数
  let FxLatex = ''
  for (let i = Fcoeffs.length - 1; i >= 1; i--) {
    const t = termLatex(Fcoeffs[i], i, FxLatex !== '')
    FxLatex += t
  }
  if (!FxLatex) FxLatex = '0'

  steps.push(`F(x) = ${FxLatex}`)

  // 【Step 2】区間代入
  steps.push(`\\text{【Step 2】上限・下限を代入}`)
  const Fb = evalPoly(Fcoeffs, b)
  const Fa = evalPoly(Fcoeffs, a)

  // F(b) の展開を段階的に表示
  let FbStr = ''
  for (let i = Fcoeffs.length - 1; i >= 1; i--) {
    if (Fcoeffs[i].isZero()) continue
    const bPow = rationalPow(b, i)
    const t = termLatex(Fcoeffs[i].mul(bPow), 0, FbStr !== '')
    FbStr += t
  }
  steps.push(`F(${upper}) = ${FbStr || '0'} = ${Fb.toLatex()}`)

  let FaStr = ''
  for (let i = Fcoeffs.length - 1; i >= 1; i--) {
    if (Fcoeffs[i].isZero()) continue
    const aPow = rationalPow(a, i)
    const t = termLatex(Fcoeffs[i].mul(aPow), 0, FaStr !== '')
    FaStr += t
  }
  steps.push(`F(${lower}) = ${FaStr || '0'} = ${Fa.toLatex()}`)

  // 【Step 3】差を計算
  steps.push(`\\text{【Step 3】差を計算}`)
  const result = Fb.sub(Fa)
  steps.push(`\\int_{${lower}}^{${upper}} \\left(${fStr}\\right) dx = F(${upper}) - F(${lower}) = ${Fb.toLatex()} - \\left(${Fa.toLatex()}\\right) = ${result.toLatex()}`)

  // Verify: 数値積分で検算（Simpson法）
  const numerical = simpsonIntegral(rawCoeffs, lower, upper)
  const exact = result.toNumber()
  const diff = Math.abs(numerical - exact)
  const ok = diff < 1e-6

  const verifyChecks = [
    `\\text{解析解: } ${result.toLatex()} = ${exact.toFixed(8)}`,
    `\\text{数値積分（Simpson法）: } \\approx ${numerical.toFixed(8)}`,
    `\\text{差: } ${diff.toExponential(3)} \\quad ${ok ? '\\checkmark' : '\\times'}`,
  ]

  // 別表現: 数値
  altForms.push({ label: '数値', latex: `\\approx ${exact.toFixed(6)}` })

  // 面積との違い
  const area = simpsonArea(rawCoeffs, lower, upper)
  if (Math.abs(area - Math.abs(exact)) > 1e-6) {
    altForms.push({ label: '面積（絶対値）', latex: `\\approx ${area.toFixed(6)}` })
  }

  return {
    answerLatex: result.toLatex(),
    stepsLatex: steps,
    verify: { ok, checks: verifyChecks },
    altForms,
  }
}

/** Simpson法による数値積分 */
function simpsonIntegral(coeffs: number[], a: number, b: number, n = 1000): number {
  const h = (b - a) / n
  let sum = evalNumPoly(coeffs, a) + evalNumPoly(coeffs, b)
  for (let i = 1; i < n; i++) {
    const x = a + i * h
    sum += (i % 2 === 0 ? 2 : 4) * evalNumPoly(coeffs, x)
  }
  return (h / 3) * sum
}

function evalNumPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((acc, c, i) => acc + c * Math.pow(x, i), 0)
}

/** 面積（符号付き積分の絶対値ではなく、x軸との間の面積） */
function simpsonArea(coeffs: number[], a: number, b: number, n = 1000): number {
  const h = (b - a) / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    const x0 = a + i * h
    const x1 = a + (i + 1) * h
    const xm = (x0 + x1) / 2
    sum += (h / 6) * (Math.abs(evalNumPoly(coeffs, x0)) + 4 * Math.abs(evalNumPoly(coeffs, xm)) + Math.abs(evalNumPoly(coeffs, x1)))
  }
  return sum
}
