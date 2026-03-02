// ========== 有理数クラス（exactな分数計算）==========

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

export class Rational {
  readonly num: bigint
  readonly den: bigint

  constructor(num: bigint | number, den: bigint | number = 1n) {
    const n = typeof num === 'number' ? BigInt(Math.round(num)) : num
    const d = typeof den === 'number' ? BigInt(Math.round(den)) : den
    if (d === 0n) throw new Error('分母が0です')
    const sign = d < 0n ? -1n : 1n
    const g = gcd(n < 0n ? -n : n, d < 0n ? -d : d)
    this.num = (sign * n) / g
    this.den = (sign * d) / g
  }

  static of(n: bigint | number, d: bigint | number = 1n): Rational {
    return new Rational(n, d)
  }

  static ZERO = new Rational(0n)
  static ONE  = new Rational(1n)
  static NEG_ONE = new Rational(-1n)

  add(other: Rational): Rational {
    return new Rational(this.num * other.den + other.num * this.den, this.den * other.den)
  }

  sub(other: Rational): Rational {
    return new Rational(this.num * other.den - other.num * this.den, this.den * other.den)
  }

  mul(other: Rational): Rational {
    return new Rational(this.num * other.num, this.den * other.den)
  }

  div(other: Rational): Rational {
    return new Rational(this.num * other.den, this.den * other.num)
  }

  neg(): Rational {
    return new Rational(-this.num, this.den)
  }

  abs(): Rational {
    return new Rational(this.num < 0n ? -this.num : this.num, this.den)
  }

  isZero(): boolean {
    return this.num === 0n
  }

  isOne(): boolean {
    return this.num === this.den
  }

  isInteger(): boolean {
    return this.den === 1n
  }

  isPositive(): boolean {
    return this.num > 0n
  }

  isNegative(): boolean {
    return this.num < 0n
  }

  equals(other: Rational): boolean {
    return this.num === other.num && this.den === other.den
  }

  compareTo(other: Rational): number {
    const diff = this.num * other.den - other.num * this.den
    if (diff < 0n) return -1
    if (diff > 0n) return 1
    return 0
  }

  toNumber(): number {
    return Number(this.num) / Number(this.den)
  }

  /** LaTeX文字列 */
  toLatex(forceSign = false): string {
    const sign = forceSign && this.num >= 0n ? '+' : ''
    if (this.den === 1n) return `${sign}${this.num}`
    const neg = this.num < 0n
    const absNum = neg ? -this.num : this.num
    const fracStr = `\\dfrac{${absNum}}{${this.den}}`
    return neg ? `-${fracStr}` : `${sign}${fracStr}`
  }

  toString(): string {
    if (this.den === 1n) return String(this.num)
    return `${this.num}/${this.den}`
  }
}

// ========== √の簡単化 ==========
// √(n/m) を a/b * √c の形に (a,b,c はbigint)
export interface SqrtForm {
  coef: Rational   // 有理数係数
  radicand: bigint // 根号内（整数、1以上、既約）
}

function factorOutSquares(n: bigint): { coef: bigint; rad: bigint } {
  if (n <= 0n) return { coef: 0n, rad: n }
  let coef = 1n
  let rad = n
  for (let p = 2n; p * p <= rad; p++) {
    while (rad % (p * p) === 0n) {
      coef *= p
      rad /= p * p
    }
  }
  return { coef, rad }
}

export function simpleSqrt(n: Rational): SqrtForm | null {
  // n が非負有理数 p/q のとき √(p/q) = √p/√q = (√p * √q) / q
  if (n.isNegative()) return null
  if (n.isZero()) return { coef: Rational.ZERO, radicand: 1n }
  const p = n.num < 0n ? -n.num : n.num
  const q = n.den
  const { coef: cp, rad: rp } = factorOutSquares(p)
  const { coef: cq, rad: rq } = factorOutSquares(q)
  // √(p/q) = (cp*√rp) / (cq*√rq) = (cp / (cq*rq)) * √(rp*rq)
  // ただし √(rq) が無理数の場合は有理化: * cq/cq
  // = cp/(q) * √(p*q) ... 別の方法
  // √(p/q) = √(p*q)/q = (√pq) / q
  const pq = p * q
  const { coef: cpq, rad: rpq } = factorOutSquares(pq)
  return {
    coef: new Rational(cpq, q),
    radicand: rpq,
  }
}

export function sqrtFormToLatex(s: SqrtForm): string {
  if (s.coef.isZero()) return '0'
  const sqrtPart = s.radicand === 1n ? '' : `\\sqrt{${s.radicand}}`
  if (sqrtPart === '') return s.coef.toLatex()
  if (s.coef.isOne()) return sqrtPart
  if (s.coef.equals(Rational.NEG_ONE)) return `-${sqrtPart}`
  return `${s.coef.toLatex()} ${sqrtPart}`
}
