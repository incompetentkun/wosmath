// ========== 最大公約数・最小公倍数 エンジン ==========

export interface PrimeFactor { prime: bigint; exp: number }
export interface EuclidStep  { a: bigint; b: bigint; q: bigint; r: bigint }

export interface GcdLcmResult {
  numbers:      bigint[]
  gcd:          bigint
  lcm:          bigint
  primeFactors: PrimeFactor[][]   // 各数の素因数分解
  euclidean:    EuclidStep[] | null  // 2数のみ
  primeLatex:   string[]           // 各数の素因数分解 LaTeX
  gcdLatex:     string             // GCD の根拠 LaTeX
  lcmLatex:     string             // LCM の根拠 LaTeX
  euclidLatex:  string[]           // ユークリッド各ステップ LaTeX
}

// ---------- 基本計算 ----------

function gcd2(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b]
  return a
}

function lcm2(a: bigint, b: bigint): bigint {
  return (a / gcd2(a, b)) * b
}

function primeFactorize(n: bigint): PrimeFactor[] {
  const result: PrimeFactor[] = []
  let d = 2n
  while (d * d <= n) {
    if (n % d === 0n) {
      let exp = 0
      while (n % d === 0n) { exp++; n /= d }
      result.push({ prime: d, exp })
    }
    d++
  }
  if (n > 1n) result.push({ prime: n, exp: 1 })
  return result
}

function euclideanSteps(a: bigint, b: bigint): EuclidStep[] {
  const steps: EuclidStep[] = []
  if (a < b) [a, b] = [b, a]
  while (b !== 0n) {
    const q = a / b, r = a % b
    steps.push({ a, b, q, r })
    a = b; b = r
  }
  return steps
}

// ---------- LaTeX 生成 ----------

function formatPrimeLatex(n: bigint, factors: PrimeFactor[]): string {
  if (factors.length === 0) return `${n}`   // 1 または素数 (この関数は呼ばれないはず)
  const parts = factors.map(f => f.exp === 1 ? `${f.prime}` : `${f.prime}^{${f.exp}}`)
  return `${n} = ${parts.join(' \\times ')}`
}

/** 全数の素因数プールから最小指数(GCD)・最大指数(LCM)を計算してLaTeX化 */
function buildGcdLcmLatex(
  numbers: bigint[],
  allFactors: PrimeFactor[][],
): { gcdLatex: string; lcmLatex: string } {
  const primeSet = new Set<bigint>()
  allFactors.forEach(fs => fs.forEach(f => primeSet.add(f.prime)))
  const primes = [...primeSet].sort((a, b) => (a < b ? -1 : 1))

  const gcdParts: string[] = [], lcmParts: string[] = []
  let gcdVal = 1n, lcmVal = 1n

  for (const p of primes) {
    const exps = allFactors.map(fs => fs.find(f => f.prime === p)?.exp ?? 0)
    const minE = Math.min(...exps)
    const maxE = Math.max(...exps)
    if (minE > 0) { gcdVal *= p ** BigInt(minE); gcdParts.push(minE === 1 ? `${p}` : `${p}^{${minE}}`) }
    lcmVal *= p ** BigInt(maxE)
    lcmParts.push(maxE === 1 ? `${p}` : `${p}^{${maxE}}`)
  }

  const ns = numbers.map(n => String(n)).join(',\\;')
  const gcdLatex = gcdParts.length === 0
    ? `\\gcd(${ns}) = 1`
    : `\\gcd(${ns}) = ${gcdParts.join(' \\times ')} = ${gcdVal}`
  const lcmLatex = lcmParts.length === 0
    ? `\\mathrm{lcm}(${ns}) = 1`
    : `\\mathrm{lcm}(${ns}) = ${lcmParts.join(' \\times ')} = ${lcmVal}`

  return { gcdLatex, lcmLatex }
}

// ---------- メイン ----------

export function computeGcdLcm(numbers: bigint[]): GcdLcmResult {
  const gcd = numbers.reduce(gcd2)
  const lcm = numbers.reduce(lcm2)
  const primeFactors = numbers.map(n => primeFactorize(n))

  const primeLatex = numbers.map((n, i) => {
    const fs = primeFactors[i]
    return fs.length === 0 ? `${n} = 1` : formatPrimeLatex(n, fs)
  })

  const { gcdLatex, lcmLatex } = buildGcdLcmLatex(numbers, primeFactors)

  const euclidean = numbers.length === 2 ? euclideanSteps(numbers[0], numbers[1]) : null
  const euclidLatex = euclidean
    ? [
        ...euclidean.map(s =>
          s.r === 0n
            ? `${s.a} = ${s.b} \\times ${s.q}`
            : `${s.a} = ${s.b} \\times ${s.q} + ${s.r}`
        ),
        `\\therefore \\gcd = ${gcd}`,
      ]
    : []

  return { numbers, gcd, lcm, primeFactors, euclidean, primeLatex, gcdLatex, lcmLatex, euclidLatex }
}
