// ========== 二項分布ソルバ ==========
// X ~ B(n, p), P(X=k) を計算

import type { CalcResult } from '../../types'

export interface BinomialParams {
  n: number   // 試行回数
  p: number   // 成功確率
  k: number   // 成功回数
  queryType: 'exact' | 'leq' | 'geq'  // P(X=k), P(X≤k), P(X≥k)
}

function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0
  if (r === 0 || r === n) return 1
  const k = Math.min(r, n - r)
  let result = 1
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1)
  }
  return result
}

function binomProb(n: number, p: number, k: number): number {
  return nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k)
}

export function solveBinomial(params: BinomialParams): CalcResult {
  const { n, p, k, queryType } = params

  if (n < 0 || !Number.isInteger(n)) throw new Error('n は非負整数にしてください')
  if (k < 0 || !Number.isInteger(k)) throw new Error('k は非負整数にしてください')
  if (k > n) throw new Error(`k ≤ n にしてください（k=${k} > n=${n}）`)
  if (p < 0 || p > 1) throw new Error('p は 0 以上 1 以下にしてください')

  const steps: string[] = []
  const altForms: { label: string; latex: string }[] = []

  const q = 1 - p
  const pStr = formatProb(p)
  const qStr = formatProb(q)

  steps.push(`X \\sim B(n, p) = B(${n}, ${p})`)
  steps.push(`q = 1 - p = 1 - ${p} = ${q}`)

  // P(X=k) の計算
  const probK = binomProb(n, p, k)
  const cStr = nCr(n, k).toString()

  steps.push(`\\text{二項分布の確率: } P(X = k) = {}_{n}C_{k} \\, p^k \\, q^{n-k}`)
  steps.push(`P(X = ${k}) = {}_{${n}}C_{${k}} \\cdot ${p}^{${k}} \\cdot ${q}^{${n - k}}`)
  steps.push(`= ${cStr} \\times ${p}^{${k}} \\times ${q}^{${n - k}}`)
  steps.push(`\\approx ${probK.toFixed(8)}`)

  let answerLatex = ''
  let finalProb = 0

  switch (queryType) {
    case 'exact':
      answerLatex = `P(X = ${k}) \\approx ${probK.toFixed(6)}`
      finalProb = probK
      break

    case 'leq': {
      // P(X ≤ k)
      let sum = 0
      const terms: string[] = []
      for (let i = 0; i <= k; i++) {
        const p_i = binomProb(n, p, i)
        sum += p_i
        terms.push(`P(X=${i}) \\approx ${p_i.toFixed(6)}`)
      }
      steps.push(`P(X \\leq ${k}) = \\sum_{i=0}^{${k}} P(X=i)`)
      steps.push(terms.join(', \\\\'))
      steps.push(`P(X \\leq ${k}) \\approx ${sum.toFixed(6)}`)
      answerLatex = `P(X \\leq ${k}) \\approx ${sum.toFixed(6)}`
      finalProb = sum
      break
    }

    case 'geq': {
      // P(X ≥ k)
      let sum = 0
      const terms: string[] = []
      for (let i = k; i <= n; i++) {
        const p_i = binomProb(n, p, i)
        sum += p_i
        terms.push(`P(X=${i}) \\approx ${p_i.toFixed(6)}`)
      }
      steps.push(`P(X \\geq ${k}) = \\sum_{i=${k}}^{${n}} P(X=i)`)
      steps.push(terms.join(', \\\\'))
      steps.push(`P(X \\geq ${k}) \\approx ${sum.toFixed(6)}`)
      answerLatex = `P(X \\geq ${k}) \\approx ${sum.toFixed(6)}`
      finalProb = sum
      break
    }
  }

  // 期待値・分散
  const mean = n * p
  const variance = n * p * q
  const sd = Math.sqrt(variance)
  altForms.push({ label: '期待値', latex: `E[X] = np = ${n} \\times ${p} = ${mean}` })
  altForms.push({ label: '分散', latex: `V[X] = npq = ${n} \\times ${p} \\times ${q} = ${variance}` })
  altForms.push({ label: '標準偏差', latex: `\\sigma = \\sqrt{npq} \\approx ${sd.toFixed(4)}` })

  // P(X=k) の分布表（n≤15の場合）
  if (n <= 15) {
    const tableRows: string[] = []
    let total = 0
    for (let i = 0; i <= n; i++) {
      const pi = binomProb(n, p, i)
      total += pi
      tableRows.push(`P(X=${i}) \\approx ${pi.toFixed(4)}`)
    }
    altForms.push({ label: '全確率分布', latex: tableRows.join(', \\quad ') })
    altForms.push({ label: '合計確認', latex: `\\sum_{k=0}^{${n}} P(X=k) \\approx ${total.toFixed(6)}` })
  }

  // Verify
  const totalProb = Array.from({ length: n + 1 }, (_, i) => binomProb(n, p, i)).reduce((a, b) => a + b, 0)
  const ok = Math.abs(totalProb - 1) < 1e-6 && finalProb >= 0 && finalProb <= 1 + 1e-9

  return {
    answerLatex,
    stepsLatex: steps,
    verify: {
      ok,
      checks: [
        `\\sum_{k=0}^{${n}} P(X=k) \\approx ${totalProb.toFixed(6)} \\approx 1 \\quad ${Math.abs(totalProb - 1) < 1e-6 ? '\\checkmark' : '\\times'}`,
        `0 \\leq ${finalProb.toFixed(6)} \\leq 1 \\quad ${finalProb >= 0 && finalProb <= 1 + 1e-9 ? '\\checkmark' : '\\times'}`,
      ],
    },
    altForms,
  }
}

function formatProb(p: number): string {
  // 分数表示が可能か簡易チェック
  const fracs: [number, string][] = [
    [0.5, '\\frac{1}{2}'], [0.25, '\\frac{1}{4}'], [0.75, '\\frac{3}{4}'],
    [1/3, '\\frac{1}{3}'], [2/3, '\\frac{2}{3}'], [0.1, '\\frac{1}{10}'],
    [0.2, '\\frac{1}{5}'], [0.4, '\\frac{2}{5}'], [0.6, '\\frac{3}{5}'], [0.8, '\\frac{4}{5}'],
  ]
  for (const [val, latex] of fracs) {
    if (Math.abs(p - val) < 1e-9) return latex
  }
  return String(p)
}
