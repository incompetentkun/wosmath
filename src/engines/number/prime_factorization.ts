// ========== 素因数分解エンジン ==========

export interface PrimeFactor { prime: bigint; exp: number }

export interface PrimeFactResult {
  n:                bigint
  isPrime:          boolean
  factors:          PrimeFactor[]
  factorLatex:      string     // 途中式の結論行用
  factorParts:      string[]   // ヒーロー flex-wrap 用（合成数のみ）
  divisors:         bigint[]   // 昇順（大数モードでは空）
  divisorCount:     bigint     // 大数モードでは 0n
  divisorSum:       bigint     // 大数モードでは 0n
  divisionSteps:    string[]   // 大数モードでは空
  divisorCountLatex: string[]  // 大数モードでは空
  divisorSumLatex:  string[]   // 大数モードでは空
  factorComplete:   boolean    // false: Pollard's rho が途中断念
}

// 10桁以上は大数モード（Pollard's rho）
export const LARGE_THRESHOLD = 1_000_000_000n

// ---------- 通常の試し割り（〜9桁）----------

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

// ---------- 大数向け（Pollard's rho + Miller-Rabin）----------

function gcdBig(a: bigint, b: bigint): bigint {
  while (b) { [a, b] = [b, a % b] }
  return a
}

function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n
  base %= mod
  while (exp > 0n) {
    if (exp & 1n) result = result * base % mod
    exp >>= 1n
    base = base * base % mod
  }
  return result
}

// Miller-Rabin 確率的素数判定
// 証人リストにより n < 3.3 × 10^24 まで決定論的に正確
function isProbablyPrime(n: bigint): boolean {
  if (n < 2n) return false
  const smalls = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n]
  for (const p of smalls) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let d = n - 1n, r = 0
  while (d % 2n === 0n) { d >>= 1n; r++ }
  outer: for (const a of smalls) {
    let x = modpow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let i = 0; i < r - 1; i++) {
      x = x * x % n
      if (x === n - 1n) continue outer
    }
    return false
  }
  return true
}

// Pollard's rho（Floyd サイクル検出）
function pollardRho(n: bigint): bigint | null {
  if (n % 2n === 0n) return 2n
  const MAX_ITER = 200_000
  for (let ci = 1n; ci <= 20n; ci++) {
    let x = 2n, y = 2n, d = 1n, iter = 0
    while (d === 1n && iter++ < MAX_ITER) {
      x = (x * x + ci) % n
      y = (y * y + ci) % n
      y = (y * y + ci) % n
      d = gcdBig(x > y ? x - y : y - x, n)
    }
    if (d !== 1n && d !== n) return d
  }
  return null
}

// 再帰的素因数分解（Pollard's rho）
function rhoFactorize(n: bigint, acc: Map<bigint, number>): boolean {
  if (n === 1n) return true
  if (isProbablyPrime(n)) {
    acc.set(n, (acc.get(n) ?? 0) + 1)
    return true
  }
  const d = pollardRho(n)
  if (d === null) {
    acc.set(n, (acc.get(n) ?? 0) + 1)  // 分解できなかった合成数
    return false
  }
  return rhoFactorize(d, acc) && rhoFactorize(n / d, acc)
}

function factorizeLarge(n: bigint): { factors: PrimeFactor[], complete: boolean } {
  const map = new Map<bigint, number>()
  let remaining = n

  // 小さい素因数を試し割りで除去（〜10^6）
  for (let d = 2n; d <= 1_000_000n && d * d <= remaining; d += d === 2n ? 1n : 2n) {
    if (remaining % d === 0n) {
      let exp = 0
      while (remaining % d === 0n) { exp++; remaining /= d }
      map.set(d, exp)
    }
  }

  const complete = remaining > 1n ? rhoFactorize(remaining, map) : true
  const factors = [...map.entries()]
    .map(([prime, exp]) => ({ prime, exp }))
    .sort((a, b) => a.prime < b.prime ? -1 : 1)

  return { factors, complete }
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
  const CHUNK = 4
  const lines: string[] = []
  for (let i = 0; i < termArr.length; i += CHUNK) {
    const chunk = termArr.slice(i, i + CHUNK).join('')
    lines.push(i === 0 ? `d(${n}) = ${chunk}` : `\\quad ${chunk}`)
  }
  if (factors.length > 1) lines.push(`= ${vals}`)
  lines.push(`= ${count}`)
  return lines
}

function buildDivisorSumLatex(n: bigint, factors: PrimeFactor[], sum: bigint): string[] {
  if (factors.length === 0) return [`\\sigma(${n}) = 1`]

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

  if (factors.length === 1) {
    const { prime: p, exp: e } = factors[0]
    return [
      `\\sigma(${n}) = ${groupExpansion(p, e, false)}`,
      `= ${sum}`,
    ]
  }

  const expansions = factors.map(({ prime: p, exp: e }) => groupExpansion(p, e, true))
  const lines: string[] = [`\\sigma(${n})`]

  const EXP_CHUNK = 2
  for (let i = 0; i < expansions.length; i += EXP_CHUNK) {
    const chunk = expansions.slice(i, i + EXP_CHUNK).join('')
    lines.push(i === 0 ? `= ${chunk}` : `\\quad ${chunk}`)
  }

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
  const isLarge = n >= LARGE_THRESHOLD
  let factors: PrimeFactor[]
  let factorComplete = true

  if (isLarge) {
    const r = factorizeLarge(n)
    factors = r.factors
    factorComplete = r.complete
  } else {
    factors = factorize(n)
  }

  const isPrime     = n > 1n && factors.length === 1 && factors[0].exp === 1
  const isComposite = !isPrime && factors.length > 0

  const divisors     = isLarge ? [] : getDivisors(factors)
  const divisorCount = isLarge ? 0n : factors.reduce((acc, f) => acc * BigInt(f.exp + 1), 1n)
  const divisorSum   = isLarge ? 0n : factors.reduce((acc, { prime: p, exp: e }) => {
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
    divisionSteps:     isLarge ? [] : buildDivisionSteps(n, factors, factorLatex),
    divisorCountLatex: isLarge ? [] : buildDivisorCountLatex(n, factors, divisorCount),
    divisorSumLatex:   isLarge ? [] : buildDivisorSumLatex(n, factors, divisorSum),
    factorComplete,
  }
}
