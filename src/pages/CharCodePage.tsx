import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SiteFooter } from '../components/SiteFooter'

const SHOW_LIMIT = 10
const MAX_GRAPHEMES = 100

// ── 型 ────────────────────────────────────────────────────
type Tab        = 'encode' | 'decode'
type DecodeMode = 'utf8' | 'utf16' | 'codepoint' | 'percent' | 'entity'

interface CharInfo {
  grapheme: string
  codePoints: number[]
  utf8Bytes: number[]
  utf8: string
  utf16Bytes: number[]
  utf16: string
  entity: string
  percent: string
}

// ── ユーティリティ ────────────────────────────────────────
function splitGraphemes(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  return [...seg.segment(text)].map(s => s.segment)
}

function analyzeGrapheme(grapheme: string): CharInfo {
  const codePoints = Array.from(grapheme).map(c => c.codePointAt(0)!)
  const utf8Bytes  = Array.from(new TextEncoder().encode(grapheme))
  const utf16Bytes: number[] = []
  for (let i = 0; i < grapheme.length; i++) {
    const cu = grapheme.charCodeAt(i)
    utf16Bytes.push(cu & 0xFF, (cu >> 8) & 0xFF)
  }
  const toHex = (b: number) => b.toString(16).toUpperCase().padStart(2, '0')
  return {
    grapheme,
    codePoints,
    utf8Bytes,
    utf8:    utf8Bytes.map(toHex).join(' '),
    utf16Bytes,
    utf16:   utf16Bytes.map(toHex).join(' '),
    entity:  codePoints.map(cp => `&#x${cp.toString(16).toUpperCase()};`).join(''),
    percent: utf8Bytes.map(b => '%' + toHex(b)).join(''),
  }
}

function toHexArray(bytes: number[]): string {
  return '[' + bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ') + ']'
}

function cpLabel(cp: number): string {
  return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
}

// ── デコード関数群 ────────────────────────────────────────
function decodeUtf8Hex(input: string): string {
  const tokens = input.trim().split(/[\s,]+/).filter(Boolean)
  const bytes = tokens.map(t => {
    const n = parseInt(t.replace(/^0x/i, ''), 16)
    if (isNaN(n) || n < 0 || n > 255) throw new Error(`無効なバイト値: ${t}`)
    return n
  })
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

function decodeCodePoints(input: string): string {
  const tokens = input.trim().split(/[\s,]+/).filter(Boolean)
  return tokens.map(t => {
    const hex = t.replace(/^U\+/i, '')
    const cp  = parseInt(hex, 16)
    if (isNaN(cp) || cp < 0 || cp > 0x10FFFF) throw new Error(`無効なコードポイント: ${t}`)
    return String.fromCodePoint(cp)
  }).join('')
}

function decodeUtf16Hex(input: string): string {
  const tokens = input.trim().split(/[\s,]+/).filter(Boolean)
  const bytes = tokens.map(t => {
    const n = parseInt(t.replace(/^0x/i, ''), 16)
    if (isNaN(n) || n < 0 || n > 255) throw new Error(`無効なバイト値: ${t}`)
    return n
  })
  if (bytes.length % 2 !== 0) throw new Error('UTF-16はバイト数が偶数である必要があります')
  return new TextDecoder('utf-16le').decode(new Uint8Array(bytes))
}

function decodePercent(input: string): string {
  return decodeURIComponent(input.trim())
}

function decodeEntities(input: string): string {
  const div = document.createElement('div')
  div.innerHTML = input.trim()
  return div.textContent ?? ''
}

function runDecode(mode: DecodeMode, input: string): { result: string; error: string } {
  if (!input.trim()) return { result: '', error: '' }
  try {
    let result = ''
    if (mode === 'utf8')           result = decodeUtf8Hex(input)
    else if (mode === 'utf16')     result = decodeUtf16Hex(input)
    else if (mode === 'codepoint') result = decodeCodePoints(input)
    else if (mode === 'percent')   result = decodePercent(input)
    else                           result = decodeEntities(input)
    return { result, error: '' }
  } catch (e) {
    return { result: '', error: e instanceof Error ? e.message : '変換エラー' }
  }
}

// ── コンポーネント ────────────────────────────────────────
export function CharCodePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'encode') as Tab

  // エンコード側
  const [encInput,  setEncInput]  = useState('')
  const [showAll,   setShowAll]   = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // デコード側
  const [decMode,  setDecMode]  = useState<DecodeMode>('utf8')
  const [decInput, setDecInput] = useState('')
  const [decCopied, setDecCopied] = useState(false)

  useEffect(() => {
    document.title = '文字コード変換 | 無料計算ツール'
    document.querySelector('meta[name="description"]')?.setAttribute('content', '文字のUnicodeコードポイント・UTF-8・UTF-16・HTMLエンティティ・パーセントエンコードを一覧表示。日本語・絵文字にも対応。')
  }, [])

  useEffect(() => { setShowAll(false) }, [encInput])

  function switchTab(t: Tab) {
    setSearchParams(t === 'encode' ? {} : { tab: t })
  }

  // ── エンコード側の計算 ──
  const allGraphemes = useMemo(() => {
    if (!encInput) return []
    return splitGraphemes(encInput)
  }, [encInput])

  const tableGraphemes = useMemo(() => allGraphemes.slice(0, MAX_GRAPHEMES), [allGraphemes])
  const chars = useMemo(() => tableGraphemes.map(analyzeGrapheme), [tableGraphemes])

  const visibleChars = showAll ? chars : chars.slice(0, SHOW_LIMIT)
  const hiddenCount  = chars.length - SHOW_LIMIT

  const bulk = useMemo(() => {
    if (!allGraphemes.length) return null
    const toHex   = (b: number) => b.toString(16).toUpperCase().padStart(2, '0')
    const allUtf8  = Array.from(new TextEncoder().encode(encInput))
    const allUtf16: number[] = []
    for (let i = 0; i < encInput.length; i++) {
      const cu = encInput.charCodeAt(i)
      allUtf16.push(cu & 0xFF, (cu >> 8) & 0xFF)
    }
    return {
      unicode:    allGraphemes.map(g => Array.from(g).map(c => cpLabel(c.codePointAt(0)!)).join('+')).join(' '),
      utf8Hex:    allUtf8.map(toHex).join(' '),
      utf8Array:  toHexArray(allUtf8),
      utf16Hex:   allUtf16.map(toHex).join(' '),
      utf16Array: toHexArray(allUtf16),
      entities:   allGraphemes.map(g => Array.from(g).map(c => `&#x${c.codePointAt(0)!.toString(16).toUpperCase()};`).join('')).join(''),
      percent:    allUtf8.map(b => '%' + toHex(b)).join(''),
    }
  }, [allGraphemes, encInput])

  const copyBtns: { key: string; label: string; value: () => string }[] = bulk ? [
    { key: 'unicode',   label: 'Unicode',          value: () => bulk.unicode },
    { key: 'utf8hex',   label: 'UTF-8 (hex)',       value: () => bulk.utf8Hex },
    { key: 'utf8arr',   label: 'UTF-8 配列 (JS/C)', value: () => bulk.utf8Array },
    { key: 'utf16hex',  label: 'UTF-16LE (hex)',    value: () => bulk.utf16Hex },
    { key: 'utf16arr',  label: 'UTF-16LE 配列',     value: () => bulk.utf16Array },
    { key: 'entities',  label: 'HTML エンティティ', value: () => bulk.entities },
    { key: 'percent',   label: 'URLエンコード',      value: () => bulk.percent },
  ] : []

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    })
  }

  // ── デコード側の計算 ──
  const decoded = useMemo(() => runDecode(decMode, decInput), [decMode, decInput])

  function handleDecCopy() {
    navigator.clipboard.writeText(decoded.result).then(() => {
      setDecCopied(true)
      setTimeout(() => setDecCopied(false), 1500)
    })
  }

  const decodeModes: { key: DecodeMode; label: string; placeholder: string }[] = [
    { key: 'utf8',      label: 'UTF-8 hex',        placeholder: 'E3 81 82 41\n0xE3, 0x81, 0x82' },
    { key: 'utf16',     label: 'UTF-16LE hex',     placeholder: '42 30 41 00\n0x42, 0x30' },
    { key: 'codepoint', label: 'コードポイント',    placeholder: 'U+3042 U+0041\n3042 41' },
    { key: 'percent',   label: 'URLエンコード',    placeholder: '%E3%81%82%41' },
    { key: 'entity',    label: 'HTMLエンティティ', placeholder: '&#x3042;&#x41;' },
  ]

  return (
    <div className="cc-page">
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="home-link">
            <span className="title-icon">∑</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>wosmath</span>
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">文字コード</span>
          <div style={{ marginLeft: 'auto' }}><ThemeToggle /></div>
        </div>
      </header>

      <div className="cc-body">
        <div className="cc-heading">
          <h1 className="cc-title">文字コード変換</h1>
          <p className="cc-desc">文字のUnicode・UTF-8・UTF-16・HTMLエンティティ・URLエンコードの相互変換。日本語・絵文字にも対応。</p>
        </div>

        {/* タブ */}
        <div className="cc-tabs">
          <button className={`cc-tab${tab === 'encode' ? ' active' : ''}`} onClick={() => switchTab('encode')}>
            文字 → コード
          </button>
          <button className={`cc-tab${tab === 'decode' ? ' active' : ''}`} onClick={() => switchTab('decode')}>
            コード → 文字
          </button>
        </div>

        {/* ── エンコードタブ ── */}
        {tab === 'encode' && (
          <>
            <div className="cc-input-wrap">
              <label className="cc-label">
                テキスト入力
                {allGraphemes.length > 0 && (
                  <span className="cc-char-hint">
                    （{allGraphemes.length} 文字{allGraphemes.length > MAX_GRAPHEMES ? `・表は先頭${MAX_GRAPHEMES}件` : ''}）
                  </span>
                )}
              </label>
              <textarea
                className="cc-textarea"
                placeholder="変換したい文字を入力（例: あA😀⁉️👨‍🎓）"
                value={encInput}
                onChange={e => setEncInput(e.target.value)}
                rows={3}
              />
            </div>

            {allGraphemes.length > 0 && (
              <>
                <div className="cc-bulk">
                  <p className="cc-bulk-title">一括コピー</p>
                  <div className="cc-bulk-btns">
                    {copyBtns.map(btn => (
                      <button
                        key={btn.key}
                        className={`cc-bulk-btn${copiedKey === btn.key ? ' copied' : ''}`}
                        onClick={() => handleCopy(btn.key, btn.value())}
                      >
                        {copiedKey === btn.key ? '✓ コピー済み' : btn.label}
                      </button>
                    ))}
                  </div>
                  {copiedKey && bulk && (
                    <p className="cc-bulk-preview">
                      {copyBtns.find(b => b.key === copiedKey)?.value().slice(0, 80)}
                      {(copyBtns.find(b => b.key === copiedKey)?.value().length ?? 0) > 80 ? '…' : ''}
                    </p>
                  )}
                </div>

                <div className="cc-table-wrap">
                  <table className="cc-table">
                    <thead>
                      <tr>
                        <th>文字</th>
                        <th>コードポイント</th>
                        <th>UTF-8 (hex)</th>
                        <th>UTF-16LE (hex)</th>
                        <th>HTML エンティティ</th>
                        <th>URLエンコード</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleChars.map((c, i) => (
                        <tr key={i}>
                          <td className="cc-cell-char">{c.grapheme}</td>
                          <td className="cc-cell-mono cc-cell-cp">
                            {c.codePoints.map((cp, j) => (
                              <span key={j}>
                                {j > 0 && <span className="cc-cp-sep">+</span>}
                                {cpLabel(cp)}
                              </span>
                            ))}
                          </td>
                          <td className="cc-cell-mono">{c.utf8}</td>
                          <td className="cc-cell-mono">{c.utf16}</td>
                          <td className="cc-cell-mono">{c.entity}</td>
                          <td className="cc-cell-mono">{c.percent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!showAll && hiddenCount > 0 && (
                    <button className="cc-show-more" onClick={() => setShowAll(true)}>
                      残り {hiddenCount} 件を表示 ▼
                    </button>
                  )}
                  {showAll && hiddenCount > 0 && (
                    <button className="cc-show-more" onClick={() => setShowAll(false)}>
                      折り畳む ▲
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── デコードタブ ── */}
        {tab === 'decode' && (
          <>
            <div className="cc-decode-mode-wrap">
              <span className="cc-label">入力形式</span>
              <div className="cc-decode-modes">
                {decodeModes.map(m => (
                  <button
                    key={m.key}
                    className={`cc-decode-mode-btn${decMode === m.key ? ' active' : ''}`}
                    onClick={() => setDecMode(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cc-input-wrap">
              <label className="cc-label">入力</label>
              <textarea
                className={`cc-textarea${decoded.error ? ' invalid' : ''}`}
                placeholder={decodeModes.find(m => m.key === decMode)?.placeholder}
                value={decInput}
                onChange={e => setDecInput(e.target.value)}
                rows={4}
              />
              {decoded.error && <p className="cc-error">{decoded.error}</p>}
            </div>

            <div className="cc-decode-output-wrap">
              <div className="cc-field-header">
                <label className="cc-label">復元されたテキスト</label>
                {decoded.result && (
                  <span className="cc-char-hint">（{splitGraphemes(decoded.result).length} 文字）</span>
                )}
              </div>
              <div className={`cc-decode-output${!decoded.result ? ' empty' : ''}`}>
                {decoded.result || <span className="cc-decode-placeholder">ここに復元されたテキストが表示されます</span>}
              </div>
              <button
                className={`cc-dec-copy-btn${decCopied ? ' copied' : ''}`}
                onClick={handleDecCopy}
                disabled={!decoded.result}
              >
                {decCopied ? '✓ コピーしました' : 'コピー'}
              </button>
            </div>
          </>
        )}

        <section className="cc-explain">
          <h2 className="cc-explain-title">文字コードとは</h2>
          <div className="cc-explain-block">
            <p className="cc-explain-subtitle">Unicode / コードポイント</p>
            <p>世界中の文字に一意の番号を割り当てた規格。<code>U+3042</code> のように表記します。「あ」は U+3042、「A」は U+0041。絵文字によっては複数のコードポイントを組み合わせて1文字を表します。</p>
          </div>
          <div className="cc-explain-block">
            <p className="cc-explain-subtitle">UTF-8</p>
            <p>Unicodeをバイト列にエンコードする方式。ASCII文字は1バイト、日本語は3バイト、絵文字は4バイトになります。Webで最も広く使われています。</p>
          </div>
          <div className="cc-explain-block">
            <p className="cc-explain-subtitle">UTF-16</p>
            <p>1文字を2バイトまたは4バイト（サロゲートペア）で表します。WindowsやJavaの内部文字列で使われています。</p>
          </div>
          <div className="cc-explain-block">
            <p className="cc-explain-subtitle">HTMLエンティティ / URLエンコード</p>
            <p>HTMLでは <code>&amp;#x3042;</code> のように文字を数値参照で記述できます。URLエンコードはURLに使えない文字を <code>%XX</code> 形式で表現します。</p>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
