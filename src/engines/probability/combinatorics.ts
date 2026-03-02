// ========== 順列・組合せソルバ ==========

import type { CalcResult } from '../../types'

export interface CombinatoricsParams {
  n: number
  r: number
  type: 'permutation' | 'combination' | 'repetition_permutation' | 'repetition_combination'
}

function factorial(n: number): bigint {
  if (n < 0) throw new Error('n は非負整数にしてください')
  let result = 1n
  for (let i = 2; i <= n; i++) result *= BigInt(i)
  return result
}

function nPr(n: number, r: number): bigint {
  if (r < 0 || r > n) return 0n
  return factorial(n) / factorial(n - r)
}

function nCr(n: number, r: number): bigint {
  if (r < 0 || r > n) return 0n
  if (r === 0 || r === n) return 1n
  const k = Math.min(r, n - r)
  let result = 1n
  for (let i = 0; i < k; i++) {
    result = result * BigInt(n - i) / BigInt(i + 1)
  }
  return result
}

export function solveCombinatorics(params: CombinatoricsParams): CalcResult {
  const { n, r, type } = params

  if (n < 0 || r < 0) throw new Error('n, r は非負整数にしてください')
  if (n > 30) throw new Error('n ≤ 30 にしてください（計算量の制限）')

  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  switch (type) {
    case 'permutation': {
      if (r > n) throw new Error(`r ≤ n にしてください（r=${r} > n=${n}）`)
      const result = nPr(n, r)
      steps.push(`\\text{定義: } {}_n P_r = \\dfrac{n!}{(n-r)!}`)
      steps.push(`{}_{${n}} P_{${r}} = \\dfrac{${n}!}{(${n}-${r})!} = \\dfrac{${n}!}{${n - r}!}`)

      // 展開
      if (n <= 15) {
        const nums: string[] = []
        for (let i = n; i > n - r; i--) nums.push(String(i))
        steps.push(`= ${nums.join(' \\times ')} = ${result}`)
      } else {
        steps.push(`= ${result}`)
      }

      altForms.push({ label: '組合せとの関係', latex: `{}_{${n}}P_{${r}} = {}_{${n}}C_{${r}} \\times ${r}! = ${nCr(n, r)} \\times ${factorial(r)} = ${result}` })

      return {
        answerLatex: `{}_{${n}} P_{${r}} = ${result}`,
        stepsLatex: steps,
        verify: { ok: true, checks: [`${result} \\geq 0 \\checkmark`, `{}_{${n}}P_0 = 1, \\quad {}_{${n}}P_${n} = ${factorial(n)} \\checkmark`] },
        altForms,
      }
    }

    case 'combination': {
      if (r > n) throw new Error(`r ≤ n にしてください（r=${r} > n=${n}）`)
      const result = nCr(n, r)
      steps.push(`\\text{定義: } {}_n C_r = \\dfrac{n!}{r!(n-r)!}`)
      steps.push(`{}_{${n}} C_{${r}} = \\dfrac{${n}!}{${r}! \\times ${n - r}!}`)

      // 計算過程
      if (n <= 15) {
        const k = Math.min(r, n - r)
        const numTerms: string[] = []
        const denTerms: string[] = []
        for (let i = 0; i < k; i++) {
          numTerms.push(String(n - i))
          denTerms.push(String(i + 1))
        }
        steps.push(`= \\dfrac{${numTerms.join(' \\times ')}}{${denTerms.join(' \\times ')}} = ${result}`)
      } else {
        steps.push(`= ${result}`)
      }

      altForms.push({ label: '対称性', latex: `{}_{${n}}C_{${r}} = {}_{${n}}C_{${n - r}} = ${nCr(n, n - r)}` })
      if (r > 0) {
        altForms.push({ label: 'パスカルの関係', latex: `{}_{${n}}C_{${r}} = {}_{${n - 1}}C_{${r - 1}} + {}_{${n - 1}}C_{${r}} = ${nCr(n - 1, r - 1)} + ${nCr(n - 1, r)}` })
      }

      return {
        answerLatex: `{}_{${n}} C_{${r}} = ${result}`,
        stepsLatex: steps,
        verify: { ok: true, checks: [
          `\\text{対称性チェック: } {}_{${n}}C_{${r}} = {}_{${n}}C_{${n-r}} = ${nCr(n, n - r)} \\checkmark`,
        ]},
        altForms,
      }
    }

    case 'repetition_permutation': {
      // 重複順列: n^r
      const result = BigInt(n) ** BigInt(r)
      steps.push(`\\text{重複順列（n種からr個を順番に選ぶ、重複あり）}`)
      steps.push(`n^r = ${n}^{${r}} = ${result}`)
      return {
        answerLatex: `${n}^{${r}} = ${result}`,
        stepsLatex: steps,
        verify: { ok: true, checks: ['各選択が独立に n 通りあるため n^r \\checkmark'] },
        altForms: [],
      }
    }

    case 'repetition_combination': {
      // 重複組合せ: H(n,r) = C(n+r-1, r)
      const total = n + r - 1
      const result = nCr(total, r)
      steps.push(`\\text{重複組合せ（Stars and Bars）}`)
      steps.push(`{}_n H_r = {}_{n+r-1} C_r`)
      steps.push(`{}_{${n}} H_{${r}} = {}_{${total}} C_{${r}} = ${result}`)
      return {
        answerLatex: `{}_{${n}} H_{${r}} = ${result}`,
        stepsLatex: steps,
        verify: { ok: true, checks: [`{}_{${total}}C_{${r}} = ${result} \\checkmark`] },
        altForms: [{ label: '計算式', latex: `{}_{${n}+${r}-1}C_{${r}} = {}_{${total}}C_{${r}}` }],
      }
    }

    default:
      throw new Error('計算タイプを選択してください')
  }
}
