// ========== 二次方程式ソルバ ==========
// ax² + bx + c = 0
//
// 解法の優先順位:
//   1. b=0     → 平方根を利用して解く
//   2. D=0     → 重解（平方完成で示す）
//   3. D>0, D が完全平方 → 因数分解
//   4. D>0, D が非完全平方 → 解の公式
//   5. D<0     → 虚数解
//
// stepsLatex      = 最短途中式（試験で書く最小限の手順）
// stepsDetailLatex = 詳細途中式（判別式・公式適用など）
// AltForms: 解の公式（別解）・平方完成の手順（どちらも最後まで答えを出す）

import { Rational, simpleSqrt, sqrtFormToLatex } from '../rational'
import type { CalcResult } from '../../types'

interface QParams { a: number; b: number; c: number }

function evalPoly(a: Rational, b: Rational, c: Rational, x: Rational): Rational {
  return a.mul(x).mul(x).add(b.mul(x)).add(c)
}

// 代入後の各項を展開した文字列を返す
// 例: a=1, b=-5, c=6, x=2 → "4 - 10 + 6"
function verifyTermsStr(a: Rational, b: Rational, c: Rational, x: Rational): string {
  const ax2 = a.mul(x).mul(x)
  const bx  = b.mul(x)
  let s = ax2.toLatex()
  if (!bx.isZero()) {
    s += bx.isNegative() ? ` - ${bx.abs().toLatex()}` : ` + ${bx.toLatex()}`
  }
  if (!c.isZero()) {
    s += c.isNegative() ? ` - ${c.abs().toLatex()}` : ` + ${c.toLatex()}`
  }
  return s
}

// ========== ヘルパ: Number の最大公約数 ==========
function gcdNum(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b)
  while (b) { const t = b; b = a % b; a = t }
  return a || 1
}

// ========== 公開エントリ ==========
export function solveQuadratic(params: QParams): CalcResult {
  const { a: an, b: bn, c: cn } = params
  if (an === 0) throw new Error('a ≠ 0 にしてください（a=0 では二次方程式になりません）')

  // 係数の GCD で約分
  const g = gcdNum(gcdNum(Math.abs(an), Math.abs(bn)), Math.abs(cn))
  let sa = an / g, sb = bn / g, sc = cn / g

  // GCD 後・符号反転前の多項式文字列（÷g ステップ表示用）
  const afterGcdPoly = formatPoly(Rational.of(sa), Rational.of(sb), Rational.of(sc))

  // 最高次の係数が負なら両辺 × (−1) して正にする
  const negated = sa < 0
  if (negated) { sa = -sa; sb = -sb; sc = -sc }

  const a = Rational.of(sa)
  const b = Rational.of(sb)
  const c = Rational.of(sc)

  // 元の係数（検算の表示用）
  const oa = Rational.of(an), ob = Rational.of(bn), oc = Rational.of(cn)

  const disc = buildDiscriminant(a, b, c)

  let result: CalcResult
  if (b.isZero()) {
    result = solveNoBterm(a, b, c, oa, ob, oc)
  } else {
    const D = b.mul(b).sub(Rational.of(4).mul(a).mul(c))
    if (D.isZero())      result = solveDoubleRoot(a, b, c, oa, ob, oc)
    else if (!D.isNegative()) result = solveTwoRealRoots(a, b, c, sa, sb, sc, D, oa, ob, oc)
    else                 result = solveComplexRoots(a, b, c, D)
  }
  result = { ...result, discriminantLatex: disc }

  // negated: ×(−1) ステップを先頭に付加
  if (negated) {
    const simplStr = formatPoly(a, b, c)
    const negStep  = `\\text{両辺} \\times (-1): \\quad ${simplStr} = 0`
    result = {
      ...result,
      stepsLatex: [negStep, ...result.stepsLatex],
      stepsDetailLatex: [
        `\\text{方程式: } ${afterGcdPoly} = 0`,
        `\\text{最高次の係数が負なので，両辺に } {-1} \\text{ をかけると:}`,
        `${simplStr} = 0`,
        ...(result.stepsDetailLatex ?? []).slice(1),
      ],
      discriminantLatex: [negStep, ...(result.discriminantLatex ?? [])],
      altForms: result.altForms.map(alt =>
        alt.label === '解の公式（別解）'
          ? { ...alt, latex: alt.latex.replace('\\begin{aligned}\n', `\\begin{aligned}\n${negStep} \\\\\\\\\n`) }
          : alt
      ),
    }
  }

  // g > 1: ÷g ステップを先頭に付加（negated より外側に来るよう後から prepend）
  if (g > 1) {
    const origStr = formatPoly(Rational.of(an), Rational.of(bn), Rational.of(cn))
    const divStep = `\\text{両辺} \\div ${g}: \\quad ${afterGcdPoly} = 0`
    result = {
      ...result,
      stepsLatex: [divStep, ...result.stepsLatex],
      stepsDetailLatex: [
        `\\text{方程式: } ${origStr} = 0`,
        `\\text{各係数の最大公約数は } ${g} \\text{。両辺を } ${g} \\text{ で割ると:}`,
        `${afterGcdPoly} = 0`,
        ...(result.stepsDetailLatex ?? []).slice(1),
      ],
      discriminantLatex: [divStep, ...(result.discriminantLatex ?? [])],
      altForms: result.altForms.map(alt =>
        alt.label === '解の公式（別解）'
          ? { ...alt, latex: alt.latex.replace('\\begin{aligned}\n', `\\begin{aligned}\n${divStep} \\\\\\\\\n`) }
          : alt
      ),
    }
  }

  return { ...result, parabola: { a: an, b: bn, c: cn } }
}

// ========== ヘルパ: 判別式タブ用ステップ生成 ==========
// b が偶数（非零）のときは D/4 = b'²-ac を使う
function buildDiscriminant(a: Rational, b: Rational, c: Rational): string[] {
  const bIsEvenNonZero = !b.isZero() && b.num % 2n === 0n

  if (bIsEvenNonZero) {
    const bPrime  = b.div(Rational.of(2))
    const DPrime  = bPrime.mul(bPrime).sub(a.mul(c))
    const bPSqStr = bPrime.isNegative() ? `(${bPrime.toLatex()})^2` : `${bPrime.toLatex()}^2`
    const cStr    = c.isNegative() ? `(${c.toLatex()})` : c.toLatex()
    const lines = [
      `\\dfrac{D}{4} = b'^2 - ac \\quad\\left(b' = \\dfrac{b}{2} = ${bPrime.toLatex()}\\right)`,
      `= ${bPSqStr} - ${a.toLatex()} \\cdot ${cStr}`,
      `= ${DPrime.toLatex()}`,
    ]
    if      (DPrime.isNegative()) lines.push(`\\dfrac{D}{4} < 0 \\Rightarrow \\text{異なる 2 つの虚数解}`)
    else if (DPrime.isZero())     lines.push(`\\dfrac{D}{4} = 0 \\Rightarrow \\text{重解}`)
    else                          lines.push(`\\dfrac{D}{4} > 0 \\Rightarrow \\text{異なる 2 つの実数解}`)
    return lines
  } else {
    const D      = b.mul(b).sub(Rational.of(4).mul(a).mul(c))
    const bSqStr = b.isNegative() ? `(${b.toLatex()})^2` : `${b.toLatex()}^2`
    const cStr   = c.isNegative() ? `(${c.toLatex()})` : c.toLatex()
    const lines = [
      `D = b^2 - 4ac`,
      `= ${bSqStr} - 4 \\cdot ${a.toLatex()} \\cdot ${cStr}`,
      `= ${D.toLatex()}`,
    ]
    if      (D.isNegative()) lines.push(`D < 0 \\Rightarrow \\text{異なる 2 つの虚数解}`)
    else if (D.isZero())     lines.push(`D = 0 \\Rightarrow \\text{重解}`)
    else                     lines.push(`D > 0 \\Rightarrow \\text{異なる 2 つの実数解}`)
    return lines
  }
}

// ========== 場合 1: b=0 ==========
function solveNoBterm(a: Rational, b: Rational, c: Rational,
  oa: Rational, ob: Rational, oc: Rational): CalcResult {
  const polyStr = formatPoly(a, b, c)
  const rhs = c.neg().div(a)   // x² = -c/a
  const verifyChecks: string[] = []
  const altForms: { label: string; latex: string }[] = []

  // ---- x²=0 ----
  if (rhs.isZero()) {
    const shortSteps = [`x^2 = 0`, `x = 0 \\text{（重解）}`]
    const detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `b = 0 \\Rightarrow x^2 = -\\dfrac{c}{a} = 0`,
      `x = 0 \\text{（重解）}`,
    ]
    verifyChecks.push(`x = 0 \\text{ を代入: } 0 = 0 \\checkmark`)
    altForms.push(buildVieta(a, b, c))
    altForms.push(buildCompleteSquareAlt(a, b, c))
    return { answerLatex: 'x = 0 \\text{（重解）}', stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok: true, checks: verifyChecks }, altForms }
  }

  // ---- x²< 0 → 虚数 ----
  if (rhs.isNegative()) {
    const negRhs = rhs.neg()
    const sqrtForm = simpleSqrt(negRhs)
    const sqrtStr = sqrtForm ? sqrtFormToLatex(sqrtForm) : `\\sqrt{${negRhs.toLatex()}}`
    const imagCoef = sqrtForm ? sqrtForm.coef : Rational.ONE
    const radicand = sqrtForm ? sqrtForm.radicand : negRhs.num
    const answerLatex = formatComplexAnswer(Rational.ZERO, imagCoef, radicand)
    const shortSteps = [
      `x^2 = ${rhs.toLatex()} < 0 \\Rightarrow \\text{実数解なし}`,
      answerLatex,
    ]
    const detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `b = 0 \\Rightarrow x^2 = ${rhs.toLatex()}`,
      `\\text{右辺} < 0 \\Rightarrow \\text{実数解なし（虚数解）}`,
      `x = \\pm\\sqrt{${rhs.toLatex()}} = \\pm\\sqrt{-1} \\cdot \\sqrt{${negRhs.toLatex()}} = \\pm ${sqrtStr}\\,i`,
      answerLatex,
    ]
    verifyChecks.push(`x^2 = ${rhs.toLatex()} < 0 \\Rightarrow \\text{実数解は存在しません}`)
    altForms.push(buildVieta(a, b, c))
    altForms.push(buildCompleteSquareAlt(a, b, c))
    return { answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok: true, checks: verifyChecks }, altForms }
  }

  // ---- x²=N > 0 → 実数解 ----
  const sqrtForm = simpleSqrt(rhs)
  const isRational = sqrtForm && sqrtForm.radicand === 1n

  if (isRational) {
    const sqrtVal = sqrtForm!.coef
    const [x1, x2] = sortRoots([sqrtVal.neg(), sqrtVal])
    const answerLatex = `x = ${x1.toLatex()}, \\quad ${x2.toLatex()}`
    const shortSteps = [
      `x^2 = ${rhs.toLatex()}`,
      `x = \\pm ${sqrtVal.toLatex()}`,
    ]
    const detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `b = 0 \\Rightarrow x^2 = -\\dfrac{c}{a} = ${rhs.toLatex()}`,
      `x = \\pm\\sqrt{${rhs.toLatex()}} = \\pm ${sqrtVal.toLatex()}`,
      answerLatex,
    ]
    const v1 = evalPoly(a, b, c, x1)
    const v2 = evalPoly(a, b, c, x2)
    const ok = v1.isZero() && v2.isZero()
    verifyChecks.push(v1.isZero()
      ? `x = ${x1.toLatex()} \\text{ を代入: } ${verifyTermsStr(oa, ob, oc, x1)} = 0 \\checkmark`
      : `x = ${x1.toLatex()} \\text{ を代入: } ${v1.toLatex()} \\neq 0 \\times`)
    verifyChecks.push(v2.isZero()
      ? `x = ${x2.toLatex()} \\text{ を代入: } ${verifyTermsStr(oa, ob, oc, x2)} = 0 \\checkmark`
      : `x = ${x2.toLatex()} \\text{ を代入: } ${v2.toLatex()} \\neq 0 \\times`)
    // ※ 因数分解はほぼ同じ形なので省略
    altForms.push(buildVieta(a, b, c))
    altForms.push(buildCompleteSquareAlt(a, b, c))
    return { answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok, checks: verifyChecks }, altForms }
  }

  // √rhs が無理数
  const sqrtStr = sqrtForm ? sqrtFormToLatex(sqrtForm) : `\\sqrt{${rhs.toLatex()}}`
  const x1Num = Math.sqrt(rhs.toNumber())
  const shortSteps = [`x^2 = ${rhs.toLatex()}`, `x = \\pm ${sqrtStr}`]
  const detailSteps = [
    `\\text{方程式: } ${polyStr} = 0`,
    `b = 0 \\Rightarrow x^2 = ${rhs.toLatex()}`,
    `x = \\pm\\sqrt{${rhs.toLatex()}} = \\pm ${sqrtStr}`,
  ]
  verifyChecks.push(`x \\approx \\pm ${x1Num.toFixed(6)},\\quad x^2 \\approx ${(x1Num * x1Num).toFixed(6)} \\approx ${rhs.toNumber().toFixed(6)} \\checkmark`)
  altForms.push({ label: '数値（近似）', latex: `x \\approx ${(-x1Num).toFixed(6)}, \\quad ${x1Num.toFixed(6)}` })
  altForms.push(buildVieta(a, b, c))
  altForms.push(buildCompleteSquareAlt(a, b, c))
  return { answerLatex: `x = \\pm ${sqrtStr}`, stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok: true, checks: verifyChecks }, altForms }
}

// ========== 場合 2: D=0 （重解）==========
function solveDoubleRoot(a: Rational, b: Rational, c: Rational,
  oa: Rational, ob: Rational, oc: Rational): CalcResult {
  const polyStr = formatPoly(a, b, c)
  const twoA = Rational.of(2).mul(a)
  const x0 = b.neg().div(twoA)
  const halfB = b.div(twoA)
  const halfBSign = halfB.isNegative() ? '-' : '+'
  const halfBAbs  = halfB.abs()
  const D = b.mul(b).sub(Rational.of(4).mul(a).mul(c))
  const answerLatex = `x = ${x0.toLatex()} \\text{（重解）}`

  const shortSteps = [
    `\\left(x ${halfBSign} ${halfBAbs.toLatex()}\\right)^2 = 0`,
    answerLatex,
  ]
  const detailSteps = [
    `\\text{方程式: } ${polyStr} = 0`,
    `\\text{（判別式 } D = 0 \\Rightarrow \\text{重解）平方完成して解く:}`,
    buildCompleteSquareLatex(a, b, c),
    `x ${halfBSign} ${halfBAbs.toLatex()} = 0 \\Rightarrow ${answerLatex}`,
  ]

  const check = evalPoly(a, b, c, x0)
  const ok = check.isZero()
  const verifyChecks = [ok
    ? `x = ${x0.toLatex()} \\text{ を代入: } ${verifyTermsStr(oa, ob, oc, x0)} = 0 \\checkmark`
    : `x = ${x0.toLatex()} \\text{ を代入: } ${check.toLatex()} \\neq 0 \\times`]

  const altForms: { label: string; latex: string }[] = []
  altForms.push(buildVieta(a, b, c))
  altForms.push(buildQuadraticFormulaAlt(a, b, c, D, null, null))

  return { answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok, checks: verifyChecks }, altForms }
}

// ========== 場合 3 & 4: D>0 ==========
function solveTwoRealRoots(
  a: Rational, b: Rational, c: Rational,
  an: number, bn: number, cn: number, D: Rational,
  oa: Rational, ob: Rational, oc: Rational
): CalcResult {
  const polyStr = formatPoly(a, b, c)
  const sqrtD = simpleSqrt(D)
  const twoA = Rational.of(2).mul(a)
  const verifyChecks: string[] = []
  const altForms: { label: string; latex: string }[] = []

  // D が完全平方 → 有理数解
  if (sqrtD && sqrtD.radicand === 1n) {
    const sqrtVal = sqrtD.coef
    const [x1, x2] = sortRoots([b.neg().add(sqrtVal).div(twoA), b.neg().sub(sqrtVal).div(twoA)])

    // 整数係数の因数分解が可能かどうかを判定
    // x1 = r1/s1, x2 = r2/s2（既約）のとき a % (s1*s2) = 0 なら可能
    const s1 = x1.den, s2 = x2.den
    const canFactor = a.den === 1n && a.num % (s1 * s2) === 0n

    const answerLatex = `x = ${x1.toLatex()}, \\quad ${x2.toLatex()}`
    const factoredStr = canFactor ? buildFactoredLatexGeneral(a, x1, x2) : null

    // ---- 最短途中式 ----
    const shortSteps: string[] = canFactor
      ? [`${factoredStr}`, answerLatex]
      : [
          `\\text{解の公式より}`,
          buildSubstLine(a, b, c),
          `= \\dfrac{${b.neg().toLatex()} \\pm ${sqrtVal.toLatex()}}{${twoA.toLatex()}}`,
          answerLatex,
        ]

    // ---- 詳細途中式 ----
    const detailSteps: string[] = [`\\text{方程式: } ${polyStr} = 0`]
    if (canFactor) {
      detailSteps.push(`\\text{（判別式 } D > 0 \\Rightarrow \\text{異なる 2 実数解）整数係数で因数分解可能:}`)
      detailSteps.push(`\\text{たすき掛けにより:}`)
      detailSteps.push(`${polyStr} = ${factoredStr}`)
    } else {
      detailSteps.push(`\\text{（判別式 } D > 0 \\Rightarrow \\text{異なる 2 実数解）解の公式を使用:}`)
      detailSteps.push(`x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`)
      detailSteps.push(`a = ${a.toLatex()},\\ b = ${b.toLatex()},\\ c = ${c.toLatex()} \\text{ を代入:}`)
      detailSteps.push(...shortSteps.slice(1))
    }
    detailSteps.push(answerLatex)

    // Verify
    for (const [label, xi] of [['x = ' + x1.toLatex(), x1], ['x = ' + x2.toLatex(), x2]] as [string, Rational][]) {
      const val = evalPoly(a, b, c, xi)
      verifyChecks.push(val.isZero()
        ? `${label} \\text{ を代入: } ${verifyTermsStr(oa, ob, oc, xi)} = 0 \\checkmark`
        : `${label} \\text{ を代入: } ${val.toLatex()} \\neq 0 \\times`)
    }

    // AltForms
    altForms.push(buildQuadraticFormulaAlt(a, b, c, D, x1, x2))
    if (!canFactor && factoredStr === null) {
      // 因数分解不可の場合のみ別途表示しない（canFactor=trueなら主解法なのでaltFormには不要）
    }
    altForms.push(buildVieta(a, b, c))
    altForms.push(buildCompleteSquareAlt(a, b, c))

    return {
      answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps,
      verify: { ok: verifyChecks.every(c => c.includes('\\checkmark')), checks: verifyChecks },
      altForms,
    }
  }

  // D が非完全平方 → 解の公式（丁寧な途中式・約分まで）
  const dNum = D.toNumber()
  const x1Num = (-bn + Math.sqrt(dNum)) / (2 * an)
  const x2Num = (-bn - Math.sqrt(dNum)) / (2 * an)
  const [xn1, xn2] = x1Num <= x2Num ? [x1Num, x2Num] : [x2Num, x1Num]

  const bIsEven = b.num % 2n === 0n
  let answerLatex: string
  let shortSteps: string[]
  let detailSteps: string[]

  if (bIsEven) {
    // === b が偶数 → 簡略化版の解の公式 ===
    // b=2b' とおくと D=4(b'²-ac) → √D=2√D' で分子分母の 2 が約分できる
    const bPrime  = b.div(Rational.of(2))
    const DPrime  = bPrime.mul(bPrime).sub(a.mul(c))
    const sqrtDP  = simpleSqrt(DPrime)

    // GCD 約分（分母 a）
    const negBPBig  = bPrime.neg().num
    const coefPBig  = sqrtDP ? sqrtDP.coef.num : 1n
    const aBig      = a.num
    const gP        = gcdBig(gcdBig(negBPBig < 0n ? -negBPBig : negBPBig, coefPBig), aBig)
    const sNegBP    = negBPBig / gP
    const sCoefP    = coefPBig / gP
    const sDenomP   = aBig / gP
    const sSqrtStrP = sqrtDP
      ? (sCoefP === 1n ? `\\sqrt{${sqrtDP.radicand}}` : `${sCoefP}\\sqrt{${sqrtDP.radicand}}`)
      : `\\sqrt{${DPrime.toLatex()}}`
    answerLatex = sDenomP === 1n
      ? `x = ${sNegBP} \\pm ${sSqrtStrP}`
      : `x = \\dfrac{${sNegBP} \\pm ${sSqrtStrP}}{${sDenomP}}`

    const negBPComp = bPrime.neg().toLatex()
    const line3P = a.isOne()
      ? `= ${negBPComp} \\pm \\sqrt{${DPrime.toLatex()}}`
      : `= \\dfrac{${negBPComp} \\pm \\sqrt{${DPrime.toLatex()}}}{${a.toLatex()}}`
    shortSteps = [
      `\\text{解の公式より}\\left(b' = \\dfrac{b}{2} = ${bPrime.toLatex()}\\right)`,
      buildSubstLineSimplified(a, bPrime, c),
      line3P,
    ]
    if (sqrtDP && sqrtDP.coef.num > 1n) {
      shortSteps.push(a.isOne()
        ? `= ${negBPComp} \\pm ${sqrtDP.coef.toLatex()}\\sqrt{${sqrtDP.radicand}}`
        : `= \\dfrac{${negBPComp} \\pm ${sqrtDP.coef.toLatex()}\\sqrt{${sqrtDP.radicand}}}{${a.toLatex()}}`)
    }
    if (gP > 1n) shortSteps.push(answerLatex)

    const formulaLineP = a.isOne()
      ? `x = -b' \\pm \\sqrt{b'^2 - c} \\quad \\left(b' = \\dfrac{b}{2}\\right)`
      : `x = \\dfrac{-b' \\pm \\sqrt{b'^2 - ac}}{a} \\quad \\left(b' = \\dfrac{b}{2}\\right)`
    detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `b = ${b.toLatex()} \\text{ は偶数なので，簡略化版の解の公式を使用:}`,
      formulaLineP,
      `a = ${a.toLatex()},\\ b' = ${bPrime.toLatex()},\\ c = ${c.toLatex()} \\text{ を代入:}`,
      ...shortSteps.slice(1),
      `x \\approx ${xn1.toFixed(6)}, \\quad ${xn2.toFixed(6)}`,
    ]

    // AltForms: 通常の解の公式（別解として）
    altForms.push(buildQuadraticFormulaAlt(a, b, c, D, null, null))
  } else {
    // === b が奇数 → 通常の解の公式 ===
    const negBBig = b.neg().num
    const coefBig = sqrtD ? sqrtD.coef.num : 1n
    const twoABig = twoA.num
    const g       = gcdBig(gcdBig(negBBig < 0n ? -negBBig : negBBig, coefBig), twoABig)
    const sNegB   = negBBig / g
    const sCoef   = coefBig / g
    const sDenom  = twoABig / g
    const sSqrtStr = sqrtD
      ? (sCoef === 1n ? `\\sqrt{${sqrtD.radicand}}` : `${sCoef}\\sqrt{${sqrtD.radicand}}`)
      : `\\sqrt{${D.toLatex()}}`
    answerLatex = sDenom === 1n
      ? `x = ${sNegB} \\pm ${sSqrtStr}`
      : `x = \\dfrac{${sNegB} \\pm ${sSqrtStr}}{${sDenom}}`

    const negBComp = b.neg().toLatex()
    const line3 = `= \\dfrac{${negBComp} \\pm \\sqrt{${D.toLatex()}}}{${twoA.toLatex()}}`
    shortSteps = [`\\text{解の公式より}`, buildSubstLine(a, b, c), line3]
    if (sqrtD && sqrtD.coef.num > 1n) {
      shortSteps.push(`= \\dfrac{${negBComp} \\pm ${sqrtD.coef.toLatex()}\\sqrt{${sqrtD.radicand}}}{${twoA.toLatex()}}`)
    }
    if (g > 1n) shortSteps.push(answerLatex)

    detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `\\text{解の公式を使用:}`,
      `x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`,
      `a = ${a.toLatex()},\\ b = ${b.toLatex()},\\ c = ${c.toLatex()} \\text{ を代入:}`,
      ...shortSteps.slice(1),
      `x \\approx ${xn1.toFixed(6)}, \\quad ${xn2.toFixed(6)}`,
    ]
  }

  for (const [label, xi] of [['x \\approx ' + xn1.toFixed(6), xn1], ['x \\approx ' + xn2.toFixed(6), xn2]] as [string, number][]) {
    const val = an * xi * xi + bn * xi + cn
    if (Math.abs(val) < 1e-6) {
      verifyChecks.push(`${label} \\text{ を代入: } \\approx 0 \\text{（数値近似で確認）} \\checkmark`)
    } else {
      verifyChecks.push(`${label} \\text{ を代入: } \\approx ${val.toExponential(3)} \\times`)
    }
  }

  altForms.push({ label: '数値（近似）', latex: `x \\approx ${xn1.toFixed(6)}, \\quad ${xn2.toFixed(6)}` })
  altForms.push(buildVieta(a, b, c))
  altForms.push(buildCompleteSquareAlt(a, b, c))

  return {
    answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps,
    verify: { ok: verifyChecks.every(c => c.includes('\\checkmark')), checks: verifyChecks },
    altForms,
  }
}

// ========== 場合 5: D<0 （虚数解）==========
function solveComplexRoots(a: Rational, b: Rational, c: Rational, D: Rational): CalcResult {
  const polyStr = formatPoly(a, b, c)
  const twoA = Rational.of(2).mul(a)
  const negD = D.neg()
  const sqrtForm = simpleSqrt(negD)
  const sqrtStr = sqrtForm ? sqrtFormToLatex(sqrtForm) : `\\sqrt{${negD.toLatex()}}`
  // 最終答え（どちらの公式でも同値）
  const realPart = b.neg().div(twoA)
  const imagCoef = sqrtForm ? sqrtForm.coef.div(twoA) : Rational.ONE.div(twoA)
  const radicand = sqrtForm ? sqrtForm.radicand : negD.num
  const answerLatex = formatComplexAnswer(realPart, imagCoef, radicand)

  const bIsEven = b.num % 2n === 0n
  let shortSteps: string[]
  let detailSteps: string[]

  if (bIsEven) {
    // === b が偶数 → 簡略化版の解の公式 ===
    const bPrime   = b.div(Rational.of(2))
    const DPrime   = bPrime.mul(bPrime).sub(a.mul(c))  // < 0
    const negDPrime = DPrime.neg()
    const sqrtDP   = simpleSqrt(negDPrime)
    const sqrtDPStr = sqrtDP ? sqrtFormToLatex(sqrtDP) : `\\sqrt{${negDPrime.toLatex()}}`
    const negBPStr = bPrime.neg().toLatex()

    const line3Cx = a.isOne()
      ? `= ${negBPStr} \\pm \\sqrt{${DPrime.toLatex()}}`
      : `= \\dfrac{${negBPStr} \\pm \\sqrt{${DPrime.toLatex()}}}{${a.toLatex()}}`
    const line4Cx = a.isOne()
      ? `= ${negBPStr} \\pm ${sqrtDPStr}\\,i`
      : `= \\dfrac{${negBPStr} \\pm ${sqrtDPStr}\\,i}{${a.toLatex()}}`
    shortSteps = [
      `\\text{解の公式より}\\left(b' = \\dfrac{b}{2} = ${bPrime.toLatex()}\\right)`,
      buildSubstLineSimplified(a, bPrime, c),
      line3Cx,
      line4Cx,
      answerLatex,
    ]
    const formulaLineCx = a.isOne()
      ? `x = -b' \\pm \\sqrt{b'^2 - c} \\quad \\left(b' = \\dfrac{b}{2}\\right)`
      : `x = \\dfrac{-b' \\pm \\sqrt{b'^2 - ac}}{a} \\quad \\left(b' = \\dfrac{b}{2}\\right)`
    detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `b = ${b.toLatex()} \\text{ は偶数なので，簡略化版の解の公式を使用:}`,
      formulaLineCx,
      `a = ${a.toLatex()},\\ b' = ${bPrime.toLatex()},\\ c = ${c.toLatex()} \\text{ を代入:}`,
      ...shortSteps.slice(1),
    ]
  } else {
    // === b が奇数 → 通常の解の公式 ===
    shortSteps = [
      `\\text{解の公式より}`,
      buildSubstLine(a, b, c),
      `= \\dfrac{${b.neg().toLatex()} \\pm \\sqrt{${D.toLatex()}}}{${twoA.toLatex()}}`,
      `= \\dfrac{${b.neg().toLatex()} \\pm ${sqrtStr}\\,i}{${twoA.toLatex()}}`,
      answerLatex,
    ]
    detailSteps = [
      `\\text{方程式: } ${polyStr} = 0`,
      `\\text{解の公式を使用:}`,
      `x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`,
      `a = ${a.toLatex()},\\ b = ${b.toLatex()},\\ c = ${c.toLatex()} \\text{ を代入:}`,
      ...shortSteps.slice(1),
    ]
  }

  const verifyChecks = [`D = ${D.toLatex()} < 0 \\Rightarrow \\text{実数解は存在しません}`]
  const altForms: { label: string; latex: string }[] = []
  if (bIsEven) {
    // b が偶数のとき通常版の解の公式を別解として表示
    const altLines = [
      `x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`,
      buildSubstLine(a, b, c),
      `= \\dfrac{${b.neg().toLatex()} \\pm \\sqrt{${D.toLatex()}}}{${twoA.toLatex()}}`,
      `= \\dfrac{${b.neg().toLatex()} \\pm ${sqrtStr}\\,i}{${twoA.toLatex()}}`,
      answerLatex,
    ]
    altForms.push({ label: '解の公式（別解）', latex: `\\begin{aligned}\n${altLines.join(' \\\\\\\\\n')}\n\\end{aligned}` })
  }
  altForms.push(buildVieta(a, b, c))
  altForms.push(buildCompleteSquareAlt(a, b, c))
  return { answerLatex, stepsLatex: shortSteps, stepsDetailLatex: detailSteps, verify: { ok: true, checks: verifyChecks }, altForms }
}

// ========== ヘルパ: 根を小さい順にソート ==========
function sortRoots(xs: Rational[]): [Rational, Rational] {
  const [a, b] = xs
  return a.compareTo(b) <= 0 ? [a, b] : [b, a]
}

// ========== ヘルパ: BigInt の最大公約数 ==========
function gcdBig(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b) { const t = b; b = a % b; a = t }
  return a || 1n
}

// ========== ヘルパ: 解の公式に係数を代入した式を生成 ==========
// 例: a=3, b=-4, c=-5 → x = \dfrac{-(-4) \pm \sqrt{(-4)^2 - 4 \cdot 3 \cdot (-5)}}{2 \cdot 3}
function buildSubstLine(a: Rational, b: Rational, c: Rational): string {
  const negBStr = b.isNegative() ? `-(${b.toLatex()})` : b.neg().toLatex()
  const bSqStr  = b.isNegative() ? `(${b.toLatex()})^2` : `${b.toLatex()}^2`
  const cStr    = c.isNegative() ? `(${c.toLatex()})` : c.toLatex()
  return `x = \\dfrac{${negBStr} \\pm \\sqrt{${bSqStr} - 4 \\cdot ${a.toLatex()} \\cdot ${cStr}}}{2 \\cdot ${a.toLatex()}}`
}

// ========== ヘルパ: 簡略化版の解の公式に係数を代入した式を生成 ==========
// b=2b' のとき: x = (-b' ± √(b'²-ac)) / a
// 例: a=3, b'=-2, c=-5 → x = \dfrac{-(-2) \pm \sqrt{(-2)^2 - 3 \cdot (-5)}}{3}
// a=1 のとき分母1を省略
function buildSubstLineSimplified(a: Rational, bPrime: Rational, c: Rational): string {
  const negBPStr = bPrime.isNegative() ? `-(${bPrime.toLatex()})` : bPrime.neg().toLatex()
  const bPSqStr  = bPrime.isNegative() ? `(${bPrime.toLatex()})^2` : `${bPrime.toLatex()}^2`
  const cStr     = c.isNegative() ? `(${c.toLatex()})` : c.toLatex()
  if (a.isOne()) {
    return `x = ${negBPStr} \\pm \\sqrt{${bPSqStr} - ${cStr}}`
  }
  return `x = \\dfrac{${negBPStr} \\pm \\sqrt{${bPSqStr} - ${a.toLatex()} \\cdot ${cStr}}}{${a.toLatex()}}`
}

// ========== ヘルパ: 複素数の解を整形 ==========
function formatComplexAnswer(real: Rational, imagCoef: Rational, radicand: bigint): string {
  let imagStr: string
  if (radicand === 1n) {
    imagStr = imagCoef.isOne() ? 'i' : `${imagCoef.toLatex()}i`
  } else {
    const cp = imagCoef.isOne() ? '' : `${imagCoef.toLatex()}`
    imagStr = `${cp}\\sqrt{${radicand}}\\,i`
  }
  if (real.isZero()) return `x = \\pm ${imagStr}`
  return `x = ${real.toLatex()} \\pm ${imagStr}`
}

// ========== ヘルパ: 整数係数の因数分解形 ==========
// a(x-x1)(x-x2) = k(s1*x - r1)(s2*x - r2)  (k = a/(s1*s2))
// 例: 2x²+3x-2, x1=-2, x2=1/2  →  (x+2)(2x-1) = 0
function buildFactoredLatexGeneral(a: Rational, x1: Rational, x2: Rational): string {
  const s1 = x1.den, s2 = x2.den    // 分母（正）
  const r1 = x1.num, r2 = x2.num    // 分子（符号込み）
  const k = a.num / (s1 * s2)       // 整数係数 k

  const f1 = makeLinFactor(s1, r1)
  const f2 = makeLinFactor(s2, r2)

  const kStr = k === 1n ? '' : k === -1n ? '-' : `${k}`
  return `${kStr}${f1}${f2} = 0`
}

// (den*x - num) を整形。例: den=2, num=1 → (2x - 1)
function makeLinFactor(den: bigint, num: bigint): string {
  const xPart = den === 1n ? 'x' : `${den}x`
  if (num === 0n)  return `(${xPart})`
  if (num > 0n)    return `(${xPart} - ${num})`
  return `(${xPart} + ${-num})`
}

// ========== ヘルパ: 解の公式（別解）— 最後まで答えを出す ==========
function buildQuadraticFormulaAlt(
  a: Rational, b: Rational, c: Rational, D: Rational,
  x1: Rational | null, x2: Rational | null
): { label: string; latex: string } {
  const twoA = Rational.of(2).mul(a)
  const sqrtD = simpleSqrt(D)
  const sqrtStr = sqrtD ? sqrtFormToLatex(sqrtD) : `\\sqrt{${D.toLatex()}}`

  const lines: string[] = []
  lines.push(`x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`)

  // b=0 の場合は「-b」が 0 になるので省略
  if (b.isZero()) {
    lines.push(`= \\dfrac{\\pm \\sqrt{${D.toLatex()}}}{${twoA.toLatex()}}`)
    lines.push(`= \\pm \\dfrac{${sqrtStr}}{${twoA.toLatex()}}`)
  } else {
    lines.push(`= \\dfrac{${b.neg().toLatex()} \\pm \\sqrt{${D.toLatex()}}}{${twoA.toLatex()}}`)
    lines.push(`= \\dfrac{${b.neg().toLatex()} \\pm ${sqrtStr}}{${twoA.toLatex()}}`)
  }

  // 最後まで答えを出す
  if (x1 && x2) {
    // 有理数解が渡された場合
    const [xs1, xs2] = sortRoots([x1, x2])
    lines.push(`\\Rightarrow x = ${xs1.toLatex()}, \\quad ${xs2.toLatex()}`)
  } else if (sqrtD && sqrtD.radicand === 1n) {
    // √D が有理数（D=0 を含む）→ 計算して答えを出す
    const sqrtVal = sqrtD.coef   // D=0 なら 0
    if (b.isZero()) {
      // x = ±sqrtVal/twoA
      if (sqrtVal.isZero()) {
        lines.push(`\\Rightarrow x = 0 \\text{（重解）}`)
      } else {
        const xval = sqrtVal.div(twoA)
        const [xs1, xs2] = sortRoots([xval.neg(), xval])
        lines.push(`\\Rightarrow x = ${xs1.toLatex()}, \\quad ${xs2.toLatex()}`)
      }
    } else {
      if (sqrtVal.isZero()) {
        // D=0 → 重解
        const x0 = b.neg().div(twoA)
        lines.push(`\\Rightarrow x = ${x0.toLatex()} \\text{（重解）}`)
      } else {
        const xRaw1 = b.neg().add(sqrtVal).div(twoA)
        const xRaw2 = b.neg().sub(sqrtVal).div(twoA)
        const [xs1, xs2] = sortRoots([xRaw1, xRaw2])
        lines.push(`\\Rightarrow x = ${xs1.toLatex()}, \\quad ${xs2.toLatex()}`)
      }
    }
  } else if (sqrtD && sqrtD.radicand > 1n) {
    // 無理数 → GCD 約分した exact form を表示
    const negBBig2 = b.neg().num
    const coefBig2 = sqrtD.coef.num
    const twoABig2 = twoA.num
    const g2       = gcdBig(gcdBig(negBBig2 < 0n ? -negBBig2 : negBBig2, coefBig2), twoABig2)
    const sNegB2   = negBBig2 / g2
    const sCoef2   = coefBig2 / g2
    const sDenom2  = twoABig2 / g2
    const sSqrt2   = sCoef2 === 1n ? `\\sqrt{${sqrtD.radicand}}` : `${sCoef2}\\sqrt{${sqrtD.radicand}}`
    const exact2   = sDenom2 === 1n ? `x = ${sNegB2} \\pm ${sSqrt2}` : `x = \\dfrac{${sNegB2} \\pm ${sSqrt2}}{${sDenom2}}`
    lines.push(`\\Rightarrow ${exact2}`)
  } else {
    // fallback: 数値近似
    const dNum = D.toNumber()
    const x1Num = (-b.toNumber() + Math.sqrt(dNum)) / twoA.toNumber()
    const x2Num = (-b.toNumber() - Math.sqrt(dNum)) / twoA.toNumber()
    const [xn1, xn2] = x1Num <= x2Num ? [x1Num, x2Num] : [x2Num, x1Num]
    lines.push(`\\Rightarrow x \\approx ${xn1.toFixed(6)}, \\quad ${xn2.toFixed(6)}`)
  }

  return {
    label: '解の公式（別解）',
    latex: `\\begin{aligned}\n${lines.join(' \\\\\\\\\n')}\n\\end{aligned}`,
  }
}

// ========== ヘルパ: 平方完成の手順（最後まで答えを出す）==========
function buildCompleteSquareAlt(a: Rational, b: Rational, c: Rational): { label: string; latex: string } {
  const twoA    = Rational.of(2).mul(a)
  const halfB   = b.div(twoA)                                    // b/(2a)
  const halfBSq = halfB.mul(halfB)                               // (b/(2a))²
  const D       = b.mul(b).sub(Rational.of(4).mul(a).mul(c))
  const rhs     = D.div(Rational.of(4).mul(a).mul(a))           // D/(4a²)
  const halfBSign = halfB.isNegative() ? '-' : '+'
  const halfBAbs  = halfB.abs()
  const negHalfB  = halfB.neg()   // -b/(2a)
  const bIsZero   = b.isZero()

  const lines: string[] = []
  const polyStr = formatPoly(a, b, c)
  lines.push(`${polyStr} = 0`)

  // ---- b=0: ax²+c=0 → x²=-c/a のみ ----
  if (bIsZero) {
    if (!a.isOne()) {
      lines.push(`${formatPoly(Rational.ONE, Rational.ZERO, c.div(a))} = 0`)
    }
    lines.push(`x^2 = ${rhs.toLatex()}`)
    if (D.isZero()) {
      lines.push(`x = 0 \\text{（重解）}`)
    } else if (D.isNegative()) {
      lines.push(`\\text{右辺} < 0 \\Rightarrow \\text{実数解なし}`)
      const negD = D.neg()
      const sqrtForm = simpleSqrt(negD)
      const imagCoef = sqrtForm ? sqrtForm.coef.div(twoA) : Rational.ONE.div(twoA)
      const radicand  = sqrtForm ? sqrtForm.radicand : negD.num
      lines.push(formatComplexAnswer(negHalfB, imagCoef, radicand))
    } else {
      const sqrtRhs = simpleSqrt(rhs)
      if (sqrtRhs && sqrtRhs.radicand === 1n) {
        lines.push(`x = \\pm ${sqrtRhs.coef.toLatex()}`)
      } else {
        const sqrtStr = sqrtRhs ? sqrtFormToLatex(sqrtRhs) : `\\sqrt{${rhs.toLatex()}}`
        lines.push(`x = \\pm ${sqrtStr}`)
      }
    }
    return {
      label: '平方完成の手順',
      latex: `\\begin{aligned}\n${lines.join(' \\\\\\\\\n')}\n\\end{aligned}`,
    }
  }

  // ---- b≠0: 4ステップで平方完成 ----
  const ba    = b.div(a)    // b/a
  const ca    = c.div(a)    // c/a
  const negCA = ca.neg()    // -c/a

  // ステップ2（a≠1）: 両辺÷a を実際の値で表示
  if (!a.isOne()) {
    lines.push(`${formatPoly(Rational.ONE, ba, ca)} = 0`)
  }

  // ステップ3: 定数項を右辺へ移項
  const lhsNoConst = formatPoly(Rational.ONE, ba, Rational.ZERO)  // x²+(b/a)x
  lines.push(`${lhsNoConst} = ${negCA.toLatex()}`)

  // ステップ4: 両辺に (b/(2a))² を加える
  lines.push(`${lhsNoConst} + ${halfBSq.toLatex()} = ${negCA.toLatex()} + ${halfBSq.toLatex()}`)

  // ステップ5: 左辺を完全平方に
  lines.push(`\\left(x ${halfBSign} ${halfBAbs.toLatex()}\\right)^2 = ${rhs.toLatex()}`)

  // ステップ6+: x を解く
  if (D.isZero()) {
    lines.push(`x ${halfBSign} ${halfBAbs.toLatex()} = 0`)
    lines.push(`x = ${negHalfB.toLatex()} \\text{（重解）}`)
  } else if (D.isNegative()) {
    lines.push(`\\text{右辺} < 0 \\Rightarrow \\text{実数解なし}`)
    const negD     = D.neg()
    const sqrtForm = simpleSqrt(negD)
    const imagCoef = sqrtForm ? sqrtForm.coef.div(twoA) : Rational.ONE.div(twoA)
    const radicand  = sqrtForm ? sqrtForm.radicand : negD.num
    lines.push(formatComplexAnswer(negHalfB, imagCoef, radicand))
  } else {
    const sqrtRhs = simpleSqrt(rhs)
    if (sqrtRhs && sqrtRhs.radicand === 1n) {
      const sqrtVal = sqrtRhs.coef
      lines.push(`x ${halfBSign} ${halfBAbs.toLatex()} = \\pm ${sqrtVal.toLatex()}`)
      lines.push(`x = ${negHalfB.toLatex()} \\pm ${sqrtVal.toLatex()}`)
      const [xs1, xs2] = sortRoots([negHalfB.add(sqrtVal), negHalfB.sub(sqrtVal)])
      lines.push(`\\Rightarrow x = ${xs1.toLatex()}, \\quad ${xs2.toLatex()}`)
    } else {
      const sqrtStr = sqrtRhs ? sqrtFormToLatex(sqrtRhs) : `\\sqrt{${rhs.toLatex()}}`
      lines.push(`x ${halfBSign} ${halfBAbs.toLatex()} = \\pm ${sqrtStr}`)
      lines.push(`x = ${negHalfB.toLatex()} \\pm ${sqrtStr}`)
      const dNum  = D.toNumber()
      const x1Num = (-b.toNumber() + Math.sqrt(dNum)) / twoA.toNumber()
      const x2Num = (-b.toNumber() - Math.sqrt(dNum)) / twoA.toNumber()
      const [xn1, xn2] = x1Num <= x2Num ? [x1Num, x2Num] : [x2Num, x1Num]
      lines.push(`\\Rightarrow x \\approx ${xn1.toFixed(6)}, \\quad ${xn2.toFixed(6)}`)
    }
  }

  return {
    label: '平方完成の手順',
    latex: `\\begin{aligned}\n${lines.join(' \\\\\\\\\n')}\n\\end{aligned}`,
  }
}

// ========== ヘルパ: 解と係数の関係 ==========
function buildVieta(a: Rational, b: Rational, c: Rational): { label: string; latex: string } {
  const sum  = b.neg().div(a)
  const prod = c.div(a)
  return {
    label: '解と係数の関係',
    latex: `x_1 + x_2 = -\\dfrac{b}{a} = ${sum.toLatex()}, \\quad x_1 x_2 = \\dfrac{c}{a} = ${prod.toLatex()}`,
  }
}

// ========== ヘルパ: 平方完成の LaTeX（一行・詳細Steps用）==========
function buildCompleteSquareLatex(a: Rational, b: Rational, c: Rational): string {
  const twoA = Rational.of(2).mul(a)
  const halfB = b.div(twoA)
  const rhs = b.mul(b).sub(Rational.of(4).mul(a).mul(c)).div(Rational.of(4).mul(a).mul(a))
  if (b.isZero()) return `x^2 = ${rhs.toLatex()}`
  const sign = halfB.isNegative() ? '-' : '+'
  const absHb = halfB.abs()
  return `\\left(x ${sign} ${absHb.toLatex()}\\right)^2 = ${rhs.toLatex()}`
}

// ========== ヘルパ: 多項式の LaTeX（係数1省略・0項省略）==========
export function formatPoly(a: Rational, b: Rational, c: Rational): string {
  let s = ''
  if      (a.isOne())                  s += 'x^2'
  else if (a.equals(Rational.NEG_ONE)) s += '-x^2'
  else                                 s += `${a.toLatex()} x^2`
  if (!b.isZero()) {
    if      (b.isOne())                  s += ' + x'
    else if (b.equals(Rational.NEG_ONE)) s += ' - x'
    else if (b.isPositive())             s += ` + ${b.toLatex()} x`
    else                                 s += ` - ${b.abs().toLatex()} x`
  }
  if (!c.isZero()) {
    if (c.isPositive()) s += ` + ${c.toLatex()}`
    else                s += ` - ${c.abs().toLatex()}`
  }
  return s || '0'
}
