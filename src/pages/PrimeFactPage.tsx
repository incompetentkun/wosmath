// ========== 素因数分解ページ ==========

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { Katex, KatexBlock } from '../components/Katex'
import { computePrimeFact, type PrimeFactResult } from '../engines/number/prime_factorization'

const MAX_VAL = 999_999_999

function parseInput(s: string): bigint | null {
  const t = s.trim()
  if (t === '') return null
  const n = parseInt(t, 10)
  if (isNaN(n) || n < 1 || n > MAX_VAL || String(n) !== t) return null
  return BigInt(n)
}

export function PrimeFactPage() {
  const [input, setInput]       = useState('840')
  const [result, setResult]     = useState<PrimeFactResult | null>(null)
  const [error, setError]       = useState('')
  const [showDivisors, setShowDivisors] = useState(false)
  const [showSteps, setShowSteps]       = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = '素因数分解 | wosmath'
    window.scrollTo(0, 0)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInput(input)
    if (n === null) {
      setError(`1〜${MAX_VAL.toLocaleString()} の整数を入力してください`)
      setResult(null)
      return
    }
    setError('')
    setShowDivisors(false)
    setShowSteps(false)
    const r = computePrimeFact(n)
    setResult(r)
    // モバイルは結果までスクロール
    setTimeout(() => {
      if (resultRef.current && window.innerWidth < 769) {
        resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }

  return (
    <div className="pf-page">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <Link to="/" className="home-link">
              <span className="title-icon">∑</span>
              wosmath
            </Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">素因数分解</span>
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="pf-body">
        <div className="pf-heading">
          <h2 className="pf-title">素因数分解</h2>
          <p className="pf-desc">正の整数を素因数分解し、約数の個数・和・一覧も求めます。</p>
        </div>

        {/* 入力フォーム */}
        <form className="pf-form" onSubmit={handleSubmit}>
          <input
            className={`pf-input${error ? ' invalid' : ''}`}
            type="number"
            inputMode="numeric"
            value={input}
            min={1}
            max={MAX_VAL}
            placeholder="整数を入力"
            onChange={e => { setInput(e.target.value); setError('') }}
          />
          <button type="submit" className="btn-primary pf-submit-btn">素因数分解する</button>
        </form>
        {error && <p className="pf-error">{error}</p>}
        <p className="pf-hint">※ 1〜{MAX_VAL.toLocaleString()} の整数のみ対応</p>

        {/* 結果 */}
        {result && (
          <>
          <div className="pf-result" ref={resultRef}>

            {/* 素因数分解 ヒーロー表示 */}
            <div className="pf-result-hero">
              {result.isPrime && <span className="pf-prime-badge">素数</span>}
              <div className="pf-result-n">{String(result.n)}</div>
              {result.factorParts.length > 0 && (
                <div className="pf-result-eq">
                  <span className="pf-eq-sign">=</span>
                  {result.factorParts.map((part, i) => (
                    <span key={i} className="pf-factor-wrap">
                      {i > 0 && <span className="pf-times">×</span>}
                      <Katex latex={part} />
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 約数の個数・和 カード */}
            <div className="pf-info-cards">
              <div className="pf-info-card">
                <div className="pf-info-label">約数の個数</div>
                <div className="pf-info-value">{String(result.divisorCount)}</div>
                <div className="pf-info-sub">d({String(result.n)})</div>
              </div>
              <div className="pf-info-card">
                <div className="pf-info-label">約数の和</div>
                <div className="pf-info-value pf-info-value--sum">{String(result.divisorSum)}</div>
                <div className="pf-info-sub">σ({String(result.n)})</div>
              </div>
            </div>

            {/* 約数の一覧（折り畳み） */}
            <div className="pf-collapse-wrap">
              <button
                className="pf-collapse-toggle"
                onClick={() => setShowDivisors(s => !s)}
              >
                {showDivisors ? '▲' : '▼'}
                　約数の一覧
                <span className="pf-collapse-count">（{String(result.divisorCount)}個）</span>
              </button>
              {showDivisors && (
                <div className="pf-collapse-content">
                  <div className="pf-divisor-grid">
                    {result.divisors.map((d, i) => (
                      <span key={i} className="pf-divisor-chip">{String(d)}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 途中式（折り畳み） */}
            <div className="pf-collapse-wrap">
              <button
                className="pf-collapse-toggle"
                onClick={() => setShowSteps(s => !s)}
              >
                {showSteps ? '▲' : '▼'}　途中式を見る
              </button>
              {showSteps && (
                <div className="pf-collapse-content">

                  {/* 割り算の手順 */}
                  {result.divisionSteps.length > 0 && (
                    <div className="pf-steps-section">
                      <h4 className="pf-steps-title">割り算による素因数分解</h4>
                      {result.divisionSteps.map((latex, i) => (
                        <KatexBlock key={i} latex={latex} />
                      ))}
                    </div>
                  )}

                  {/* 約数の個数 */}
                  {!result.isPrime && (
                    <div className="pf-steps-section">
                      <h4 className="pf-steps-title">約数の個数の求め方</h4>
                      <p className="pf-steps-note">
                        各素因数の指数に 1 を加えてすべてかけ合わせる。
                      </p>
                      {result.divisorCountLatex.map((latex, i) => (
                        <KatexBlock key={i} latex={latex} />
                      ))}
                    </div>
                  )}

                  {/* 約数の和 */}
                  {!result.isPrime && (
                    <div className="pf-steps-section">
                      <h4 className="pf-steps-title">約数の和の求め方</h4>
                      <p className="pf-steps-note">
                        各素因数について等比数列の和を求め、すべてかけ合わせる。
                      </p>
                      {result.divisorSumLatex.map((latex, i) => (
                        <KatexBlock key={i} latex={latex} />
                      ))}
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>

          {/* 解説 */}
          <div className="pf-explain">
            <h3 className="pf-explain-title">素因数分解・約数の求め方</h3>

            <div className="pf-explain-block">
              <h4 className="pf-explain-subtitle">素因数分解とは</h4>
              <p>1より大きい整数は必ず素数の積の形で表せる。この表し方を素因数分解という。小さい素数（2, 3, 5, 7, …）から順に割り続けて求める。</p>
              <p className="pf-explain-example">例：840 ÷ 2 = 420　→　420 ÷ 2 = 210　→　210 ÷ 2 = 105　→　105 ÷ 3 = 35　→　35 ÷ 5 = 7（素数）</p>
              <p className="pf-explain-example">　　<strong>840 = 2³ × 3 × 5 × 7</strong></p>
            </div>

            <div className="pf-explain-block">
              <h4 className="pf-explain-subtitle">約数の個数の求め方</h4>
              <p>n = p₁^e₁ × p₂^e₂ × … のとき</p>
              <p className="pf-explain-method">d(n) = (e₁+1)(e₂+1)…</p>
              <p>各指数に1を足してすべてかけると約数の個数になる。</p>
              <p className="pf-explain-example">例：840 = 2³ × 3 × 5 × 7　→　d(840) = (3+1)(1+1)(1+1)(1+1) = 4×2×2×2 = <strong>32</strong></p>
            </div>

            <div className="pf-explain-block">
              <h4 className="pf-explain-subtitle">約数の和の求め方</h4>
              <p>n = p₁^e₁ × p₂^e₂ × … のとき</p>
              <p className="pf-explain-method">σ(n) = (1+p₁+p₁²+…+p₁^e₁)(1+p₂+…+p₂^e₂)…</p>
              <p>各素因数ごとに等比数列の和を求め、すべてかけると約数の総和になる。</p>
              <p className="pf-explain-example">例：σ(840) = (1+2+4+8)(1+3)(1+5)(1+7) = 15×4×6×8 = <strong>2880</strong></p>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}
