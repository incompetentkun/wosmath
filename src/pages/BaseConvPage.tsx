// ========== 進数変換ページ ==========

import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { KatexBlock } from '../components/Katex'
import { SiteFooter } from '../components/SiteFooter'
import {
  computeBaseConv, normalizeInput, isValidForBase, charsetDescription,
  MAX_BASE, MIN_BASE, MAX_INPUT_LEN, CHARSETS,
  type CharsetMode,
} from '../engines/number/base_conversion'

const PRESETS = [2, 8, 10, 16, 36, 62]

function parseBase(s: string): number {
  const n = parseInt(s, 10)
  if (isNaN(n)) return MIN_BASE
  return Math.min(MAX_BASE, Math.max(MIN_BASE, n))
}

function BaseSelector({
  value, onChange,
}: {
  value: string
  onChange: (s: string) => void
}) {
  const base = parseBase(value)
  return (
    <div className="bc-base-selector">
      <div className="bc-base-presets">
        {PRESETS.map(p => (
          <button
            key={p}
            className={`bc-preset-btn${base === p ? ' active' : ''}`}
            onClick={() => onChange(String(p))}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="bc-base-custom">
        <span className="bc-base-label">進数:</span>
        <input
          className="bc-base-input"
          type="number"
          min={MIN_BASE}
          max={MAX_BASE}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export function BaseConvPage() {
  const [fromInput,    setFromInput]    = useState('255')
  const [fromBaseStr,  setFromBaseStr]  = useState('10')
  const [toBaseStr,    setToBaseStr]    = useState('16')
  const [showSteps,    setShowSteps]    = useState(false)
  const [charsetMode,  setCharsetMode]  = useState<CharsetMode>('upper')
  const [copied,       setCopied]       = useState(false)

  useEffect(() => {
    document.title = '進数変換 | 無料計算ツール'
    document.querySelector('meta[name="description"]')?.setAttribute('content', '16進数・2進数・8進数など、2から62進数まで任意の基数で相互変換。変換の途中式も表示します。')
    window.scrollTo(0, 0)
  }, [])

  const fromBase = parseBase(fromBaseStr)
  const toBase   = parseBase(toBaseStr)
  const charset  = CHARSETS[charsetMode]

  const normalizedInput = normalizeInput(fromInput, fromBase, charset)
  const inputError = useMemo(() => {
    if (!fromInput.trim()) return ''
    if (fromInput.length > MAX_INPUT_LEN) return `${MAX_INPUT_LEN}文字以内で入力してください`
    if (!isValidForBase(normalizedInput, fromBase, charset))
      return `${fromBase}進数に使えない文字が含まれています（使用可: ${charsetDescription(fromBase, charset)}）`
    return ''
  }, [fromInput, fromBase, normalizedInput, charset])

  const result = useMemo(() => {
    if (!fromInput.trim() || inputError) return null
    return computeBaseConv(normalizedInput, fromBase, toBase, charsetMode)
  }, [fromInput, fromBase, toBase, charsetMode, inputError, normalizedInput])

  const STEPS_DECIMAL_LIMIT = 1_000_000_000n  // 10桁以上は省略

  const stepsOmitted = result ? result.decimal >= STEPS_DECIMAL_LIMIT : false

  const hasSteps = result && !stepsOmitted && (
    result.toDecSteps.length > 0 ||
    result.fromDecSteps.length > 0 ||
    result.groupSteps.length > 0
  )

  return (
    <div className="bc-page">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <Link to="/" className="home-link">
              <span className="title-icon">∑</span>
              wosmath
            </Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">進数変換</span>
          </h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="bc-body">
        <div className="bc-heading">
          <h2 className="bc-title">進数変換</h2>
          <p className="bc-desc">2〜62進数の相互変換。途中式もわかりやすく表示します。</p>
        </div>

        {/* 文字定義トグル */}
        <div className="bc-charset-toggle-wrap">
          <span className="bc-charset-toggle-label">文字定義:</span>
          <div className="bc-charset-toggle">
            <button
              className={`bc-charset-btn${charsetMode === 'upper' ? ' active' : ''}`}
              onClick={() => setCharsetMode('upper')}
            >
              大文字優先 (A–Z, a–z)<span className="bc-charset-hint">10=A</span>
            </button>
            <button
              className={`bc-charset-btn${charsetMode === 'lower' ? ' active' : ''}`}
              onClick={() => setCharsetMode('lower')}
            >
              小文字優先 (a–z, A–Z)<span className="bc-charset-hint">10=a</span>
            </button>
          </div>
        </div>
        <p className="bc-charset-note">
          {charsetMode === 'upper'
            ? '36進数以下は小文字入力を大文字として認識します'
            : '36進数以下は大文字入力を小文字として認識します'}
        </p>

        {/* 変換エリア */}
        <div className="bc-converter">

          {/* FROM */}
          <div className="bc-panel">
            <div className="bc-panel-label">変換元</div>
            <input
              className={`bc-number-input${inputError ? ' invalid' : ''}`}
              type="text"
              inputMode="text"
              value={fromInput}
              placeholder="数値を入力"
              onChange={e => { setFromInput(e.target.value); setShowSteps(false) }}
            />
            {inputError && <p className="bc-error">{inputError}</p>}
            <BaseSelector value={fromBaseStr} onChange={v => { setFromBaseStr(v); setShowSteps(false) }} />
            <p className="bc-charset">使用可能: {charsetDescription(fromBase, charset)}</p>
          </div>

          <div className="bc-arrow">→</div>

          {/* TO */}
          <div className="bc-panel">
            <div className="bc-panel-label">変換先</div>
            <div className="bc-result-display">
              {result ? result.toVal : '—'}
            </div>
            {result && (
              <button
                className={`bc-copy-btn${copied ? ' copied' : ''}`}
                onClick={() => {
                  navigator.clipboard.writeText(result.toVal)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? '✓ コピー済み' : 'コピー'}
              </button>
            )}
            <BaseSelector value={toBaseStr} onChange={v => { setToBaseStr(v); setShowSteps(false) }} />
            <p className="bc-charset">使用可能: {charsetDescription(toBase, charset)}</p>
          </div>

        </div>

        {/* 途中式 */}
        {result && stepsOmitted && (
          <p className="bc-steps-omitted">桁数が多いため途中式は省略しています（10進数で10桁以上）</p>
        )}
        {result && hasSteps && (
          <div className="bc-steps-wrap">
            <button className="bc-steps-toggle" onClick={() => setShowSteps(s => !s)}>
              {showSteps ? '▲ 途中式を閉じる' : '▼ 途中式を見る'}
            </button>

            {showSteps && (
              <div className="bc-steps-content">

                {result.toDecSteps.length > 0 && (
                  <div className="bc-steps-section">
                    <h4 className="bc-steps-title">{fromBase}進数 → 10進数</h4>
                    <p className="bc-steps-note">各桁の値 × 基数の累乗を足し合わせる。</p>
                    {result.toDecSteps.map((l, i) => <KatexBlock key={i} latex={l} />)}
                  </div>
                )}

                {result.fromDecSteps.length > 0 && (
                  <div className="bc-steps-section">
                    <h4 className="bc-steps-title">10進数 → {toBase}進数</h4>
                    <p className="bc-steps-note">目的の基数で繰り返し割り、余りを下から読む。</p>
                    {result.fromDecSteps.map((l, i) => <KatexBlock key={i} latex={l} />)}
                  </div>
                )}

                {result.groupSteps.length > 0 && (
                  <div className="bc-steps-section">
                    <h4 className="bc-steps-title">グループ化法（近道）</h4>
                    <p className="bc-steps-note">
                      {fromBase === 2
                        ? `2進数は${log2int(toBase)}ビットずつグループ化すると${toBase}進数に直接変換できる。`
                        : `${fromBase}進数の各桁を${log2int(fromBase)}ビットの2進数に展開する。`
                      }
                    </p>
                    {result.groupSteps.map((l, i) => <KatexBlock key={i} latex={l} />)}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* 解説 */}
        <div className="bc-explain">
          <h3 className="bc-explain-title">進数変換の仕組み</h3>

          <div className="bc-explain-block">
            <h4 className="bc-explain-subtitle">n進数とは</h4>
            <p>n進数は「n種類の数字を使って数を表す記数法」。各桁の重みは右から n⁰, n¹, n², … となる。</p>
            <p className="bc-explain-example">例：1A2₁₆ = 1×16² + 10×16¹ + 2×16⁰ = 256 + 160 + 2 = <strong>418</strong></p>
          </div>

          <div className="bc-explain-block">
            <h4 className="bc-explain-subtitle">よく使われる進数</h4>
            <p><strong>2進数（binary）</strong> — コンピュータの内部表現。0と1のみ使用。</p>
            <p><strong>8進数（octal）</strong> — UNIX系のファイルパーミッション等に使用。</p>
            <p><strong>16進数（hexadecimal）</strong> — メモリアドレス、色コード (#ff0000) 等に使用。</p>
            <p><strong>36進数</strong> — 数字と英字（大文字 or 小文字）の36種類。英数字のみで表現できるため短縮IDに使いやすい。</p>
            <p><strong>62進数</strong> — 0–9, A–Z, a–z（または 0–9, a–z, A–Z）の62種類。URLに使える記号のみで構成されるため、短縮URLサービスの内部IDなどに用いられる。</p>
          </div>

          <div className="bc-explain-block">
            <h4 className="bc-explain-subtitle">2進数 ↔ 8・16進数の近道</h4>
            <p>8 = 2³, 16 = 2⁴ の関係から、2進数を3桁（8進数）または4桁（16進数）ずつグループ化するだけで変換できる。</p>
            <p className="bc-explain-example">例：1011010₂ → <strong>001|011|010</strong> → 1, 3, 2 → <strong>132₈</strong></p>
            <p className="bc-explain-example">例：11111111₂ → <strong>1111|1111</strong> → F, F → <strong>FF₁₆</strong></p>
          </div>
        </div>

      </div>
      <SiteFooter />
    </div>
  )
}

function log2int(n: number): number {
  return Math.round(Math.log2(n))
}
