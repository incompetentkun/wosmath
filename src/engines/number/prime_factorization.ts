// ========== 素因数分解エンジン ==========

export interface PrimeFactor { prime: bigint; exp: number }

export interface PrimeFactResult {
  n:                bigint
  isPrime:          boolean
  factors:          PrimeFactor[]
  factorLatex:      string     // 途中式の結論行用: "840 = 2^3 \times 3 \times 5 \times 7"
  factorParts:      string[]   // ヒーロー flex-wrap 用: ["2^3", "3", "5", "7"]（合成数のみ、素数/1は空配列）
  divisors:         bigint[]   // 昇順
  divisorCount:     bigint
  divisorSum:       bigint
  divisionSteps:    string[]   // 割り算途中式（LaTeX 各行）
  divisorCountLatex: string[]
  divisorSumLatex:  string[]
}

// ---------- 素因数分解 ----------

function factorize(n: bigint): PrimeFactor[] {
  const result: PrimeFactor[] = []
  let d = 2n, num = n
  while (d * d <= num) {
    if (num % d === 0n) {
      let exp = 0
      while (num % d === 0n) { exp++; num /= d }
      result.push({ prime: d, exp })
    }
    d++
  }
  if (num > 1n) result.push({ prime: num, exp: 1 })
  return result
}

// ---------- 約数列挙 ----------

function getDivisors(factors: PrimeFactor[]): bigint[] {
  let divs: bigint[] = [1n]
  for (const { prime: p, exp: e } of factors) {
    const next: bigint[] = []
    let pk = 1n
    for (let k = 0; k <= e; k++) {
      for (const d of divs) next.push(d * pk)
      if (k < e) pk *= p
    }
    divs = next
  }
  return divs.sort((a, b) => (a < b ? -1 : 1))
}

// ---------- LaTeX 生成 ----------

function buildFactorLatex(n: bigint, factors: PrimeFactor[]): string {
  if (factors.length === 0) return `${n}`
  const parts = factors.map(f => f.exp === 1 ? `${f.prime}` : `${f.prime}^{${f.exp}}`)
  return `${n} = ${parts.join(' \\times ')}`
}

/** 結論行を最大 CHUNK 因数ごとに分割して複数行を返す */
function buildDivisionSteps(n: bigint, factors: PrimeFactor[], factorLatex: string): string[] {
  if (n === 1n || factors.length === 0) return []
  if (factors.length === 1 && factors[0].exp === 1) {
    return [`${n} \\text{ は素数}`]
  }

  const steps: string[] = []
  let current = n
  for (const { prime: p, exp: e } of factors) {
    for (let i = 0; i < e; i++) {
      const next = current / p
      steps.push(`${current} \\div ${p} = ${next}`)
      current = next
    }
  }

  // 結論行: 3因数以上は ∴n と = factors を別行、さらに4因数ごとに分割
  if (factors.length <= 2) {
    steps.push(`\\therefore\\; ${factorLatex}`)
  } else {
    steps.push(`\\therefore\\; ${n}`)
    const parts = factors.map(f => f.exp === 1 ? `${f.prime}` : `${f.prime}^{${f.exp}}`)
    const CHUNK = 4
    for (let i = 0; i < parts.length; i += CHUNK) {
      const chunk = parts.slice(i, i + CHUNK).join(' \\times ')
      steps.push(i === 0 ? `= ${chunk}` : `\\quad \\times ${chunk}`)
    }
  }
  return steps
}

function buildDivisorCountLatex(n: bigint, factors: PrimeFactor[], count: bigint): string[] {
  if (factors.length === 0) return [`d(${n}) = 1`]
  const termArr = factors.map(f => `(${f.exp}+1)`)
  const vals    = factors.map(f => `${f.exp + 1}`).join(' \\times ')

  // terms 行: 4因数ごとに分割
  const CHUNK = 4
  const lines: string[] = []
  for (let i = 0; i < termArr.length; i += CHUNK) {
    const chunk = termArr.slice(i, i + CHUNK).join('')
    lines.push(i === 0 ? `d(${n}) = ${chunk}` : `\\quad ${chunk}`)
  }
  // 数値 → 答え
  if (factors.length > 1) lines.push(`= ${vals}`)
  lines.push(`= ${count}`)
  return lines
}

function buildDivisorSumLatex(n: bigint, factors: PrimeFactor[], sum: bigint): string[] {
  if (factors.length === 0) return [`\\sigma(${n}) = 1`]

  // 指数が 4 以下: 全項列挙、5 以上: 省略記法
  const groupExpansion = (p: bigint, e: number, parens: boolean): string => {
    const inner = e <= 4
      ? Array.from({ length: e + 1 }, (_, k) =>
          k === 0 ? '1' : k === 1 ? `${p}` : `${p}^{${k}}`
        ).join('+')
      : `1+${p}+\\cdots+${p}^{${e}}`
    return parens ? `(${inner})` : inner
  }

  const groupSums = factors.map(({ prime: p, exp: e }) => {
    let s = 0n, pk = 1n
    for (let k = 0; k <= e; k++) { s += pk; pk *= p }
    return s
  })

  // 1因数: 括弧不要、重複なし
  if (factors.length === 1) {
    const { prime: p, exp: e } = factors[0]
    return [
      `\\sigma(${n}) = ${groupExpansion(p, e, false)}`,
      `= ${sum}`,
    ]
  }

  // 2+ 因数: σ(n) を先頭行、展開を2グループずつ
  const expansions = factors.map(({ prime: p, exp: e }) => groupExpansion(p, e, true))
  const lines: string[] = [`\\sigma(${n})`]

  const EXP_CHUNK = 2
  for (let i = 0; i < expansions.length; i += EXP_CHUNK) {
    const chunk = expansions.slice(i, i + EXP_CHUNK).join('')
    lines.push(i === 0 ? `= ${chunk}` : `\\quad ${chunk}`)
  }

  // 数値行: 4グループごとに分割
  const VAL_CHUNK = 4
  for (let i = 0; i < groupSums.length; i += VAL_CHUNK) {
    const chunk = groupSums.slice(i, i + VAL_CHUNK).join(' \\times ')
    lines.push(i === 0 ? `= ${chunk}` : `\\quad \\times ${chunk}`)
  }
  lines.push(`= ${sum}`)

  return lines
}

// ---------- メイン ----------

export function computePrimeFact(n: bigint): PrimeFactResult {
  const factors      = factorize(n)
  const isPrime      = n > 1n && factors.length === 1 && factors[0].exp === 1
  const isComposite  = !isPrime && factors.length > 0
  const divisors     = getDivisors(factors)
  const divisorCount = factors.reduce((acc, f) => acc * BigInt(f.exp + 1), 1n)
  const divisorSum   = factors.reduce((acc, { prime: p, exp: e }) => {
    let s = 0n, pk = 1n
    for (let k = 0; k <= e; k++) { s += pk; pk *= p }
    return acc * s
  }, 1n)
  const factorLatex = buildFactorLatex(n, factors)
  const factorParts = isComposite
    ? factors.map(f => f.exp === 1 ? `${f.prime}` : `${f.prime}^{${f.exp}}`)
    : []

  return {
    n, isPrime, factors, factorLatex, factorParts,
    divisors, divisorCount, divisorSum,
    divisionSteps:     buildDivisionSteps(n, factors, factorLatex),
    divisorCountLatex: buildDivisorCountLatex(n, factors, divisorCount),
    divisorSumLatex:   buildDivisorSumLatex(n, factors, divisorSum),
  }
}
