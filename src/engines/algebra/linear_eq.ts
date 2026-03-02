// ========== 連立一次方程式ソルバ ==========
// 2元・3元連立方程式をクラメル公式 + ガウス消去で解く

import { Rational } from '../rational'
import type { CalcResult } from '../../types'

export interface LinearEqParams {
  // 2元: [[a1,b1,c1],[a2,b2,c2]] → a1x+b1y=c1
  // 3元: [[a1,b1,c1,d1],[a2,b2,c2,d2],[a3,b3,c3,d3]] → a1x+b1y+c1z=d1
  coefficients: number[][]
}

type Matrix = Rational[][]

function det2(m: Matrix): Rational {
  return m[0][0].mul(m[1][1]).sub(m[0][1].mul(m[1][0]))
}

function det3(m: Matrix): Rational {
  return m[0][0].mul(m[1][1].mul(m[2][2]).sub(m[1][2].mul(m[2][1])))
    .sub(m[0][1].mul(m[1][0].mul(m[2][2]).sub(m[1][2].mul(m[2][0]))))
    .add(m[0][2].mul(m[1][0].mul(m[2][1]).sub(m[1][1].mul(m[2][0]))))
}

function replaceCol(m: Matrix, col: number, vals: Rational[]): Matrix {
  return m.map((row, i) => row.map((v, j) => j === col ? vals[i] : v))
}

export function solveLinearEq(params: LinearEqParams): CalcResult {
  const { coefficients: raw } = params
  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  const n = raw.length

  if (n === 2) {
    // 2元: a1x+b1y=c1, a2x+b2y=c2
    const [[a1n, b1n, c1n], [a2n, b2n, c2n]] = raw
    const a1 = Rational.of(a1n), b1 = Rational.of(b1n), c1 = Rational.of(c1n)
    const a2 = Rational.of(a2n), b2 = Rational.of(b2n), c2 = Rational.of(c2n)

    steps.push(`\\text{連立方程式:}`)
    steps.push(`\\begin{cases} ${fmtEq2([a1n,b1n,c1n],['x','y'])} \\\\ ${fmtEq2([a2n,b2n,c2n],['x','y'])} \\end{cases}`)

    const A: Matrix = [[a1, b1], [a2, b2]]
    const b = [c1, c2]
    const detA = det2(A)
    steps.push(`\\text{係数行列の行列式: } D = \\begin{vmatrix} ${a1.toLatex()} & ${b1.toLatex()} \\\\ ${a2.toLatex()} & ${b2.toLatex()} \\end{vmatrix} = ${detA.toLatex()}`)

    if (detA.isZero()) {
      steps.push(`D = 0 \\Rightarrow \\text{解が1つに定まりません（不定または不能）}`)
      return {
        answerLatex: '\\text{解が一意に定まりません（D=0）}',
        stepsLatex: steps,
        verify: { ok: false, checks: ['係数行列が正則でない'] },
        altForms: [],
      }
    }

    const detX = det2(replaceCol(A, 0, b))
    const detY = det2(replaceCol(A, 1, b))
    steps.push(`D_x = \\begin{vmatrix} ${c1.toLatex()} & ${b1.toLatex()} \\\\ ${c2.toLatex()} & ${b2.toLatex()} \\end{vmatrix} = ${detX.toLatex()}`)
    steps.push(`D_y = \\begin{vmatrix} ${a1.toLatex()} & ${c1.toLatex()} \\\\ ${a2.toLatex()} & ${c2.toLatex()} \\end{vmatrix} = ${detY.toLatex()}`)

    const x = detX.div(detA)
    const y = detY.div(detA)
    steps.push(`x = \\dfrac{D_x}{D} = \\dfrac{${detX.toLatex()}}{${detA.toLatex()}} = ${x.toLatex()}`)
    steps.push(`y = \\dfrac{D_y}{D} = \\dfrac{${detY.toLatex()}}{${detA.toLatex()}} = ${y.toLatex()}`)

    // Verify
    const v1 = a1.mul(x).add(b1.mul(y))
    const v2 = a2.mul(x).add(b2.mul(y))
    const ok = v1.equals(c1) && v2.equals(c2)

    return {
      answerLatex: `x = ${x.toLatex()}, \\quad y = ${y.toLatex()}`,
      stepsLatex: steps,
      verify: {
        ok,
        checks: [
          `\\text{第1式: } ${a1.toLatex()} \\cdot ${x.toLatex()} + ${b1.toLatex()} \\cdot ${y.toLatex()} = ${v1.toLatex()} ${v1.equals(c1) ? '= ' + c1.toLatex() + ' \\checkmark' : '\\neq ' + c1.toLatex() + ' \\times'}`,
          `\\text{第2式: } ${a2.toLatex()} \\cdot ${x.toLatex()} + ${b2.toLatex()} \\cdot ${y.toLatex()} = ${v2.toLatex()} ${v2.equals(c2) ? '= ' + c2.toLatex() + ' \\checkmark' : '\\neq ' + c2.toLatex() + ' \\times'}`,
        ],
      },
      altForms: [{ label: '解', latex: `(x, y) = (${x.toLatex()}, ${y.toLatex()})` }],
    }
  }

  if (n === 3) {
    // 3元
    const rows = raw.map(row => row.map(v => Rational.of(v)))
    const [r1, r2, r3] = rows
    steps.push(`\\text{連立方程式:}`)
    steps.push(`\\begin{cases} ${fmtEq3(raw[0])} \\\\ ${fmtEq3(raw[1])} \\\\ ${fmtEq3(raw[2])} \\end{cases}`)

    const A: Matrix = [[r1[0],r1[1],r1[2]], [r2[0],r2[1],r2[2]], [r3[0],r3[1],r3[2]]]
    const b = [r1[3], r2[3], r3[3]]
    const detA = det3(A)
    steps.push(`D = \\det(A) = ${detA.toLatex()}`)

    if (detA.isZero()) {
      steps.push(`D = 0 \\Rightarrow \\text{解が一意に定まりません}`)
      return {
        answerLatex: '\\text{解が一意に定まりません（D=0）}',
        stepsLatex: steps,
        verify: { ok: false, checks: ['係数行列の行列式が0'] },
        altForms: [],
      }
    }

    const x = det3(replaceCol(A, 0, b)).div(detA)
    const y = det3(replaceCol(A, 1, b)).div(detA)
    const z = det3(replaceCol(A, 2, b)).div(detA)
    steps.push(`x = ${x.toLatex()}, \\quad y = ${y.toLatex()}, \\quad z = ${z.toLatex()}`)

    const sol = [x, y, z]
    const vars = ['x', 'y', 'z']
    const checks = rows.map((row, i) => {
      const lhs = sol.reduce((acc, v, j) => acc.add(row[j].mul(v)), Rational.ZERO)
      const ok = lhs.equals(row[3])
      return `\\text{第${i + 1}式: } ${lhs.toLatex()} ${ok ? '= ' + row[3].toLatex() + ' \\checkmark' : '\\neq ' + row[3].toLatex() + ' \\times'}`
    })
    const allOk = checks.every(c => c.includes('\\checkmark'))

    return {
      answerLatex: `x = ${x.toLatex()}, \\quad y = ${y.toLatex()}, \\quad z = ${z.toLatex()}`,
      stepsLatex: steps,
      verify: { ok: allOk, checks },
      altForms: [],
    }
  }

  throw new Error('2元または3元の連立方程式を入力してください')
}

function fmtEq2(row: number[], vars: string[]): string {
  const [a, b, c] = row
  let s = ''
  if (a !== 0) s += `${a === 1 ? '' : a === -1 ? '-' : a}${vars[0]}`
  if (b !== 0) {
    if (b === 1) s += ` + ${vars[1]}`
    else if (b === -1) s += ` - ${vars[1]}`
    else if (b > 0) s += ` + ${b}${vars[1]}`
    else s += ` - ${-b}${vars[1]}`
  }
  return `${s} = ${c}`
}

function fmtEq3(row: number[]): string {
  const [a, b, c, d] = row
  let s = ''
  if (a !== 0) s += `${a === 1 ? '' : a === -1 ? '-' : a}x`
  if (b !== 0) {
    if (b === 1) s += ` + y`
    else if (b === -1) s += ` - y`
    else if (b > 0) s += ` + ${b}y`
    else s += ` - ${-b}y`
  }
  if (c !== 0) {
    if (c === 1) s += ` + z`
    else if (c === -1) s += ` - z`
    else if (c > 0) s += ` + ${c}z`
    else s += ` - ${-c}z`
  }
  return `${s} = ${d}`
}
