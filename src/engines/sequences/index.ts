// ========== 数列ソルバ ==========
// 等差・等比数列、Σ計算

import { Rational } from '../rational'
import type { CalcResult } from '../../types'

export type SequenceType = 'arithmetic' | 'geometric' | 'sigma'

export interface SequenceParams {
  type: SequenceType
  // 等差数列: a1, d, n
  a1?: number
  d?: number
  r?: number   // 等比数列の公比
  n?: number   // 項数 / Σの上限
  // Σ: formulaType = 'k' | 'k2' | 'k3' | 'const'
  sigmaType?: 'k' | 'k2' | 'k3' | 'const'
  sigmaConst?: number  // Σ(c) の定数
}

function formatRat(r: Rational): string {
  return r.toLatex()
}

// ========== 等差数列 ==========
function solveArithmetic(params: SequenceParams): CalcResult {
  const { a1: a1n = 0, d: dn = 0, n: nn = 10 } = params
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  const a1 = Rational.of(a1n)
  const d = Rational.of(dn)
  const n = Rational.of(nn)

  steps.push(`\\text{等差数列: 初項 } a_1 = ${a1.toLatex()}, \\text{ 公差 } d = ${d.toLatex()}, \\text{ 項数 } n = ${nn}`)

  // 一般項 aₙ = a₁ + (n-1)d
  steps.push(`\\text{【一般項】} a_n = a_1 + (n-1)d`)
  const anExpr = d.isZero()
    ? a1.toLatex()
    : `${a1.toLatex()} + (n-1) \\cdot ${d.toLatex()}`
  steps.push(`a_n = ${anExpr}`)

  // a_n の展開
  // aₙ = a1 + (n-1)d = (a1-d) + dn
  const intercept = a1.sub(d)
  let simplified = ''
  if (d.isZero()) {
    simplified = a1.toLatex()
  } else if (intercept.isZero()) {
    simplified = d.isOne() ? 'n' : `${d.toLatex()} n`
  } else {
    const dStr = d.isOne() ? 'n' : `${d.toLatex()} n`
    simplified = intercept.isZero() ? dStr : `${dStr} ${intercept.isPositive() ? '+' : '-'} ${intercept.abs().toLatex()}`
  }
  steps.push(`a_n = ${simplified}`)

  // 第n項の値
  const an = a1.add(d.mul(n.sub(Rational.ONE)))
  steps.push(`a_{${nn}} = ${an.toLatex()}`)

  // 和 Sₙ = n(a1+aₙ)/2
  steps.push(`\\text{【和の公式】} S_n = \\dfrac{n(a_1 + a_n)}{2}`)
  const Sn = n.mul(a1.add(an)).div(Rational.of(2))
  steps.push(`S_{${nn}} = \\dfrac{${nn} \\times (${a1.toLatex()} + ${an.toLatex()})}{2} = \\dfrac{${nn} \\times ${a1.add(an).toLatex()}}{2} = ${Sn.toLatex()}`)

  // 別表現: S_n = n*a1 + n(n-1)d/2
  altForms.push({
    label: 'Sₙの公式（別形）',
    latex: `S_n = na_1 + \\dfrac{n(n-1)}{2}d = ${nn} \\cdot ${a1.toLatex()} + \\dfrac{${nn}(${nn}-1)}{2} \\cdot ${d.toLatex()} = ${Sn.toLatex()}`
  })

  // 最初の数項
  const terms: string[] = []
  for (let i = 1; i <= Math.min(6, nn); i++) {
    terms.push(a1.add(d.mul(Rational.of(i - 1))).toLatex())
  }
  if (nn > 6) terms.push('\\ldots')
  altForms.push({ label: '数列の最初の項', latex: terms.join(', ') })

  // Verify
  const verifySn = (() => {
    let s = Rational.ZERO
    for (let i = 1; i <= nn; i++) s = s.add(a1.add(d.mul(Rational.of(i - 1))))
    return s
  })()
  const ok = verifySn.equals(Sn)

  return {
    answerLatex: `a_{${nn}} = ${an.toLatex()}, \\quad S_{${nn}} = ${Sn.toLatex()}`,
    stepsLatex: steps,
    verify: {
      ok,
      checks: [
        `\\text{各項を直接足す: } ${verifySn.toLatex()} ${ok ? '= ' + Sn.toLatex() + ' \\checkmark' : '\\neq ' + Sn.toLatex() + ' \\times'}`,
      ],
    },
    altForms,
  }
}

// ========== 等比数列 ==========
function solveGeometric(params: SequenceParams): CalcResult {
  const { a1: a1n = 1, r: rn = 2, n: nn = 5 } = params
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  if (a1n === 0) throw new Error('初項 a₁ ≠ 0 にしてください')

  const a1 = Rational.of(a1n)
  const r = Rational.of(rn)
  const n = Rational.of(nn)

  steps.push(`\\text{等比数列: 初項 } a_1 = ${a1.toLatex()}, \\text{ 公比 } r = ${r.toLatex()}, \\text{ 項数 } n = ${nn}`)

  // 一般項 aₙ = a₁rⁿ⁻¹
  steps.push(`\\text{【一般項】} a_n = a_1 r^{n-1}`)
  steps.push(`a_n = ${a1.toLatex()} \\cdot ${r.toLatex()}^{n-1}`)

  // 第n項
  const rPowNm1 = rationalPow(r, nn - 1)
  const an = a1.mul(rPowNm1)
  steps.push(`a_{${nn}} = ${a1.toLatex()} \\cdot ${r.toLatex()}^{${nn - 1}} = ${a1.toLatex()} \\times ${rPowNm1.toLatex()} = ${an.toLatex()}`)

  // 和
  let Sn: Rational
  if (r.isOne()) {
    steps.push(`r = 1 \\Rightarrow S_n = n a_1`)
    Sn = n.mul(a1)
    steps.push(`S_{${nn}} = ${nn} \\times ${a1.toLatex()} = ${Sn.toLatex()}`)
  } else if (r.equals(Rational.NEG_ONE) || r.isZero()) {
    // 数値計算
    let s = Rational.ZERO
    for (let i = 0; i < nn; i++) s = s.add(a1.mul(rationalPow(r, i)))
    Sn = s
    steps.push(`S_{${nn}} = ${Sn.toLatex()}`)
  } else {
    steps.push(`\\text{【和の公式】} S_n = \\dfrac{a_1(1 - r^n)}{1 - r}`)
    const rPowN = rationalPow(r, nn)
    Sn = a1.mul(Rational.ONE.sub(rPowN)).div(Rational.ONE.sub(r))
    steps.push(`S_{${nn}} = \\dfrac{${a1.toLatex()} \\cdot (1 - ${r.toLatex()}^{${nn}})}{1 - ${r.toLatex()}} = \\dfrac{${a1.toLatex()} \\cdot (1 - ${rPowN.toLatex()})}{${Rational.ONE.sub(r).toLatex()}} = ${Sn.toLatex()}`)
  }

  // 最初の数項
  const terms: string[] = []
  for (let i = 0; i < Math.min(6, nn); i++) {
    terms.push(a1.mul(rationalPow(r, i)).toLatex())
  }
  if (nn > 6) terms.push('\\ldots')
  altForms.push({ label: '数列の最初の項', latex: terms.join(', ') })

  // 無限等比級数（|r| < 1 かつ r ≠ 1）
  const rNum = r.toNumber()
  if (Math.abs(rNum) < 1) {
    const S_inf = a1.div(Rational.ONE.sub(r))
    altForms.push({ label: '無限等比級数', latex: `\\sum_{k=1}^{\\infty} a_k = \\dfrac{a_1}{1-r} = \\dfrac{${a1.toLatex()}}{1-${r.toLatex()}} = ${S_inf.toLatex()}` })
  }

  // Verify
  let verifySn = Rational.ZERO
  for (let i = 0; i < nn; i++) verifySn = verifySn.add(a1.mul(rationalPow(r, i)))
  const ok = verifySn.equals(Sn)

  return {
    answerLatex: `a_{${nn}} = ${an.toLatex()}, \\quad S_{${nn}} = ${Sn.toLatex()}`,
    stepsLatex: steps,
    verify: {
      ok,
      checks: [`\\text{各項を直接足す: } S_{${nn}} = ${verifySn.toLatex()} ${ok ? '\\checkmark' : '\\times'}`],
    },
    altForms,
  }
}

// ========== Σ計算 ==========
function solveSigma(params: SequenceParams): CalcResult {
  const { sigmaType = 'k', n: nn = 10, sigmaConst: cn = 1 } = params
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []
  const n = Rational.of(nn)

  let formula = ''
  let result: Rational

  switch (sigmaType) {
    case 'const': {
      const c = Rational.of(cn)
      formula = `\\sum_{k=1}^{${nn}} ${c.toLatex()}`
      steps.push(`\\text{定数の和: } \\sum_{k=1}^{n} c = cn`)
      result = c.mul(n)
      steps.push(`${formula} = ${c.toLatex()} \\times ${nn} = ${result.toLatex()}`)
      break
    }
    case 'k': {
      formula = `\\sum_{k=1}^{${nn}} k`
      steps.push(`\\text{公式: } \\sum_{k=1}^{n} k = \\dfrac{n(n+1)}{2}`)
      result = n.mul(n.add(Rational.ONE)).div(Rational.of(2))
      steps.push(`${formula} = \\dfrac{${nn}(${nn}+1)}{2} = \\dfrac{${nn} \\times ${nn + 1}}{2} = ${result.toLatex()}`)
      break
    }
    case 'k2': {
      formula = `\\sum_{k=1}^{${nn}} k^2`
      steps.push(`\\text{公式: } \\sum_{k=1}^{n} k^2 = \\dfrac{n(n+1)(2n+1)}{6}`)
      result = n.mul(n.add(Rational.ONE)).mul(Rational.of(2).mul(n).add(Rational.ONE)).div(Rational.of(6))
      steps.push(`${formula} = \\dfrac{${nn}(${nn}+1)(2\\cdot${nn}+1)}{6} = \\dfrac{${nn} \\times ${nn + 1} \\times ${2 * nn + 1}}{6} = ${result.toLatex()}`)
      break
    }
    case 'k3': {
      formula = `\\sum_{k=1}^{${nn}} k^3`
      steps.push(`\\text{公式: } \\sum_{k=1}^{n} k^3 = \\left(\\dfrac{n(n+1)}{2}\\right)^2`)
      const half = n.mul(n.add(Rational.ONE)).div(Rational.of(2))
      result = half.mul(half)
      steps.push(`${formula} = \\left(\\dfrac{${nn}(${nn}+1)}{2}\\right)^2 = ${half.toLatex()}^2 = ${result.toLatex()}`)
      altForms.push({ label: '(Σk)²との関係', latex: `\\sum_{k=1}^{n} k^3 = \\left(\\sum_{k=1}^{n} k\\right)^2` })
      break
    }
  }

  // 数値検証
  let verifyResult = 0
  if (sigmaType === 'const') {
    verifyResult = cn * nn
  } else {
    for (let k = 1; k <= nn; k++) {
      if (sigmaType === 'k') verifyResult += k
      else if (sigmaType === 'k2') verifyResult += k * k
      else if (sigmaType === 'k3') verifyResult += k * k * k
    }
  }
  const ok = Math.abs(verifyResult - result.toNumber()) < 0.5

  return {
    answerLatex: `${formula} = ${result.toLatex()}`,
    stepsLatex: steps,
    verify: {
      ok,
      checks: [`\\text{直接計算: } ${verifyResult} \\quad ${ok ? '\\checkmark' : '\\times'}`],
    },
    altForms,
  }
}

// ========== メインエントリ ==========
export function solveSequence(params: SequenceParams): CalcResult {
  switch (params.type) {
    case 'arithmetic': return solveArithmetic(params)
    case 'geometric':  return solveGeometric(params)
    case 'sigma':      return solveSigma(params)
    default: throw new Error('数列タイプを選択してください')
  }
}

// ========== ユーティリティ ==========
function rationalPow(r: Rational, n: number): Rational {
  if (n === 0) return Rational.ONE
  if (n < 0) return Rational.ONE.div(rationalPow(r, -n))
  let result = Rational.ONE
  for (let i = 0; i < n; i++) result = result.mul(r)
  return result
}
