// ========== 最大公約数・最小公倍数 ページ ==========

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { KatexBlock } from '../components/Katex'
import { computeGcdLcm } from '../engines/number/gcd_lcm'

const MAX_NUMS = 8
const MAX_VAL  = 999_999_999

function parseNum(s: string): bigint | null {
  const t = s.trim()
  if (t === '') return null
  const n = parseInt(t, 10)
  if (isNaN(n) || n < 1 || n > MAX_VAL || String(n) !== t) return null
  return BigInt(n)
}

export function GcdLcmPage() {
  const [values, setValues]     = useState(['12', '18'])
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    document.title = '最大公約数・最小公倍数 | wosmath'
    window.scrollTo(0, 0)
  }, [])

  const nums = useMemo(() => values.map(parseNum), [values])
  const allValid = nums.every(n => n !== null)

  const result = useMemo(() => {
    if (!allValid) return null
    return computeGcdLcm(nums as bigint[])
  }, [nums, allValid])

  const updateNum  = (i: number, v: string) => setValues(vs => vs.map((x, idx) => idx === i ? v : x))
  const addNum     = () => { if (values.length < MAX_NUMS) setValues(vs => [...vs, '']) }
  const removeNum  = (i: number) => setValues(vs => vs.filter((_, idx) => idx !== i))

  return (
    <div className="gcd-page">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <Link to="/" className="home-link">
              <span className="title-icon">∑</span>
              wosmath
            </Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">GCD・LCM</span>
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="gcd-body">
        <div className="gcd-heading">
          <h2 className="gcd-title">最大公約数・最小公倍数</h2>
          <p className="gcd-desc">整数を2つ以上入力するとすぐに計算します。</p>
        </div>

        {/* 数値入力 */}
        <div className="gcd-inputs">
          {values.map((v, i) => (
            <div key={i} className="gcd-input-wrap">
              <input
                className={`gcd-number-input${nums[i] === null && v !== '' ? ' invalid' : ''}`}
                type="number"
                inputMode="numeric"
                value={v}
                min={1}
                max={MAX_VAL}
                placeholder="整数"
                onChange={e => updateNum(i, e.target.value)}
              />
              {values.length > 2 && (
                <button className="gcd-remove-btn" onClick={() => removeNum(i)} aria-label="削除">×</button>
              )}
            </div>
          ))}
          {values.length < MAX_NUMS && (
            <button className="gcd-add-btn" onClick={addNum} title="数を追加">＋</button>
          )}
        </div>

        {/* 結果カード */}
        <div className="gcd-results">
          <div className="gcd-result-card">
            <div className="gcd-result-label">最大公約数 GCD</div>
            <div className="gcd-result-value">{result ? String(result.gcd) : '—'}</div>
          </div>
          <div className="gcd-result-card gcd-result-card--lcm">
            <div className="gcd-result-label">最小公倍数 LCM</div>
            <div className="gcd-result-value">{result ? String(result.lcm) : '—'}</div>
          </div>
        </div>

        {/* 途中式 */}
        {result && (
          <div className="gcd-steps-wrap">
            <button className="gcd-steps-toggle" onClick={() => setShowSteps(s => !s)}>
              {showSteps ? '▲ 途中式を閉じる' : '▼ 途中式を見る'}
            </button>

            {showSteps && (
              <div className="gcd-steps-content">
                <div className="gcd-steps-section">
                  <h4 className="gcd-steps-title">素因数分解</h4>
                  {result.primeLatex.map((latex, i) => (
                    <KatexBlock key={i} latex={latex} />
                  ))}
                  <div className="gcd-steps-divider" />
                  <KatexBlock latex={result.gcdLatex} />
                  <KatexBlock latex={result.lcmLatex} />
                </div>

                {result.euclidLatex.length > 0 && (
                  <div className="gcd-steps-section">
                    <h4 className="gcd-steps-title">ユークリッドの互除法（GCD）</h4>
                    {result.euclidLatex.map((latex, i) => (
                      <KatexBlock key={i} latex={latex} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p className="gcd-note">※ 1〜{MAX_VAL.toLocaleString()} の整数のみ対応</p>
        <p className="gcd-note">※ ユークリッドの互除法は2つの整数の場合のみ表示されます</p>

        {/* 解説 */}
        <div className="gcd-explain">
          <h3 className="gcd-explain-title">最大公約数・最小公倍数とは</h3>

          <div className="gcd-explain-block">
            <h4 className="gcd-explain-subtitle">最大公約数 (GCD)</h4>
            <p>2つ以上の整数に共通する約数のうち、最も大きいもの。</p>
            <p className="gcd-explain-example">例：12 と 18 の約数はそれぞれ</p>
            <p className="gcd-explain-example">　12 の約数：1, 2, 3, <strong>4, 6</strong>, 12</p>
            <p className="gcd-explain-example">　18 の約数：1, 2, 3, <strong>6</strong>, 9, 18</p>
            <p className="gcd-explain-example">共通する最大の約数 → <strong>GCD = 6</strong></p>
            <p className="gcd-explain-method">【素因数分解による求め方】各数を素因数分解し、共通する素因数を最小の指数でかけ合わせる。</p>
          </div>

          <div className="gcd-explain-block">
            <h4 className="gcd-explain-subtitle">最小公倍数 (LCM)</h4>
            <p>2つ以上の整数の公倍数のうち、最も小さいもの。</p>
            <p className="gcd-explain-example">例：12 と 18 の公倍数は 36, 72, 108, …</p>
            <p className="gcd-explain-example">最小のもの → <strong>LCM = 36</strong></p>
            <p className="gcd-explain-method">【素因数分解による求め方】各数を素因数分解し、すべての素因数を最大の指数でかけ合わせる。</p>
          </div>

          <div className="gcd-explain-block">
            <h4 className="gcd-explain-subtitle">ユークリッドの互除法（GCDの高速な求め方）</h4>
            <p>「a を b で割った余りを r とすると、gcd(a, b) = gcd(b, r)」という性質を繰り返し使う。余りが 0 になったときの割る数が GCD。</p>
            <p className="gcd-explain-example">例：gcd(252, 105)</p>
            <p className="gcd-explain-example">　252 = 105 × 2 + 42　→　gcd(252, 105) = gcd(105, 42)</p>
            <p className="gcd-explain-example">　105 = 42 × 2 + 21　 →　gcd(105, 42) = gcd(42, 21)</p>
            <p className="gcd-explain-example">　42 = 21 × 2 + 0　　 →　gcd(42, 21) = <strong>21</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
