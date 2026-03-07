import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { SiteFooter } from '../components/SiteFooter'

const MAX_FILE_BYTES = 50 * 1024 * 1024  // 50MB

function fmtCount(n: number) {
  return n.toLocaleString('ja-JP') + ' 文字'
}

const MIME_EXT: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
  'application/pdf': 'pdf', 'application/zip': 'zip',
  'application/json': 'json', 'text/plain': 'txt', 'text/html': 'html',
  'text/css': 'css', 'audio/mpeg': 'mp3', 'audio/wav': 'wav',
  'video/mp4': 'mp4', 'application/wasm': 'wasm',
}

// ── エンコード関数 ────────────────────────────────────────
function encodeText(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
}

function encodeBuffer(buf: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join(''))
}

// ── デコード関数 ──────────────────────────────────────────
function decodeToText(b64: string): string {
  const cleaned = b64.trim().replace(/\s/g, '')
  const binary = atob(cleaned)
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)))
}

function downloadFromBase64(b64: string, filename: string) {
  let data = b64.trim().replace(/\s/g, '')
  let mimeType = 'application/octet-stream'
  if (data.startsWith('data:')) {
    const [header, ...rest] = data.split(',')
    mimeType = header.match(/data:([^;,]+)/)?.[1] ?? mimeType
    data = rest.join(',')
  }
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// ── コンポーネント ────────────────────────────────────────
export function Base64Page() {
  const [mode,      setMode]      = useState<'text' | 'file'>('text')
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode')
  const [textInput, setTextInput] = useState('')
  const [b64Input,  setB64Input]  = useState('')
  const [fileOutput, setFileOutput] = useState('')
  const [fileMime,  setFileMime]  = useState('')
  const [dataUrl,   setDataUrl]   = useState(false)
  const [fileName,  setFileName]  = useState('decoded')
  const [fileInfo,  setFileInfo]  = useState('')
  const [encoding,  setEncoding]  = useState(false)
  const [error,     setError]     = useState('')
  const [copied,    setCopied]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileNameEdited = useRef(false)

  useEffect(() => {
    document.title = 'Base64 エンコード・デコード | 無料計算ツール'
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'テキストや画像などのファイルをBase64に変換・復元します。HTMLへの画像埋め込み（data URL）やAPI通信でのバイナリ送信に。ブラウザ内で完結するため、データは外部に送信されません。')
  }, [])

  // テキスト→Base64 リアルタイム変換
  const textEncoded = useMemo(() => {
    if (mode !== 'text' || direction !== 'encode') return ''
    try { return encodeText(textInput) } catch { return '' }
  }, [textInput, mode, direction])

  // Base64→テキスト リアルタイム変換
  const textDecoded = useMemo(() => {
    if (mode !== 'text' || direction !== 'decode') return { value: '', error: '' }
    if (!b64Input.trim()) return { value: '', error: '' }
    try {
      return { value: decodeToText(b64Input), error: '' }
    } catch {
      return { value: '', error: '無効なBase64文字列です' }
    }
  }, [b64Input, mode, direction])

  // エラーをまとめる
  const displayError = mode === 'text' && direction === 'decode'
    ? textDecoded.error
    : error

  function handleFileSelect(file: File) {
    if (direction === 'encode' && file.size > MAX_FILE_BYTES) {
      setError(`ファイルサイズが上限（50MB）を超えています（${(file.size / 1024 / 1024).toFixed(1)} MB）`)
      return
    }
    setFileInfo(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    if (direction === 'decode') {
      setFileName(file.name)
      return
    }
    setFileMime(file.type)
    setFileOutput('')
    setEncoding(true)
    const reader = new FileReader()
    reader.onload = e => {
      const buf = e.target?.result
      if (buf instanceof ArrayBuffer) {
        setFileOutput(encodeBuffer(buf))
        setError('')
        setEncoding(false)
      }
    }
    reader.onerror = () => {
      setError('ファイルの読み込みに失敗しました')
      setEncoding(false)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDownload() {
    setError('')
    try {
      downloadFromBase64(b64Input, fileName || 'decoded')
    } catch {
      setError('無効なBase64文字列です。正しいBase64を入力してください。')
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // モード/方向切替時にリセット
  function switchMode(m: 'text' | 'file') {
    setMode(m); setTextInput(''); setB64Input(''); setFileOutput(''); setFileMime(''); setFileInfo(''); setError('')
  }
  function switchDirection(d: 'encode' | 'decode') {
    setDirection(d); setTextInput(''); setB64Input(''); setFileOutput(''); setFileInfo(''); setError('')
    setFileName('decoded'); fileNameEdited.current = false
  }

  const fileDisplayOutput = dataUrl && fileMime
    ? `data:${fileMime};base64,${fileOutput}`
    : fileOutput

  return (
    <div className="b64-page">
      {/* ヘッダー */}
      <header className="app-header">
        <div className="header-inner">
          <Link to="/" className="home-link">
            <span className="title-icon">∑</span>
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>wosmath</span>
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Base64</span>
          <div style={{ marginLeft: 'auto' }}><ThemeToggle /></div>
        </div>
      </header>

      <div className="b64-body">
        <div className="b64-heading">
          <h1 className="b64-title">Base64 エンコード・デコード</h1>
          <p className="b64-desc">テキスト・ファイルのBase64変換をブラウザ内で行います。データは外部に送信されません。</p>
        </div>

        {/* モード / 方向トグル */}
        <div className="b64-toggles">
          <div className="b64-toggle-group">
            <button className={`b64-toggle-btn${mode === 'text' ? ' active' : ''}`} onClick={() => switchMode('text')}>テキスト</button>
            <button className={`b64-toggle-btn${mode === 'file' ? ' active' : ''}`} onClick={() => switchMode('file')}>ファイル</button>
          </div>
          <div className="b64-toggle-group">
            <button className={`b64-toggle-btn${direction === 'encode' ? ' active' : ''}`} onClick={() => switchDirection('encode')}>エンコード</button>
            <button className={`b64-toggle-btn${direction === 'decode' ? ' active' : ''}`} onClick={() => switchDirection('decode')}>デコード</button>
          </div>
        </div>

        {/* ── テキスト × エンコード ── */}
        {mode === 'text' && direction === 'encode' && (
          <div className="b64-converter">
            <div className="b64-field">
              <div className="b64-field-header">
                <label className="b64-label">入力テキスト (UTF-8)</label>
                {textInput.length > 0 && <span className="b64-char-count">{fmtCount(textInput.length)}</span>}
              </div>
              <textarea
                className="b64-textarea"
                placeholder="エンコードするテキストを入力"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                rows={6}
              />
            </div>
            <div className="b64-arrow">↓</div>
            <div className="b64-field">
              <div className="b64-field-header">
                <label className="b64-label">Base64 出力</label>
                {textEncoded.length > 0 && <span className="b64-char-count">{fmtCount(textEncoded.length)}</span>}
              </div>
              <textarea
                className="b64-textarea b64-output"
                readOnly
                value={textEncoded}
                rows={6}
              />
              <button
                className={`b64-copy-btn${copied ? ' copied' : ''}`}
                onClick={() => handleCopy(textEncoded)}
                disabled={!textEncoded}
              >
                {copied ? 'コピーしました ✓' : 'コピー'}
              </button>
            </div>
          </div>
        )}

        {/* ── テキスト × デコード ── */}
        {mode === 'text' && direction === 'decode' && (
          <div className="b64-converter">
            <div className="b64-field">
              <div className="b64-field-header">
                <label className="b64-label">Base64 入力</label>
                {b64Input.length > 0 && <span className="b64-char-count">{fmtCount(b64Input.length)}</span>}
              </div>
              <textarea
                className={`b64-textarea${displayError ? ' invalid' : ''}`}
                placeholder="デコードするBase64文字列を入力"
                value={b64Input}
                onChange={e => setB64Input(e.target.value)}
                rows={6}
              />
              {displayError && <p className="b64-error">{displayError}</p>}
            </div>
            <div className="b64-arrow">↓</div>
            <div className="b64-field">
              <div className="b64-field-header">
                <label className="b64-label">デコード結果 (テキスト)</label>
                {textDecoded.value.length > 0 && <span className="b64-char-count">{fmtCount(textDecoded.value.length)}</span>}
              </div>
              <textarea
                className="b64-textarea b64-output"
                readOnly
                value={textDecoded.value}
                rows={6}
              />
              <button
                className={`b64-copy-btn${copied ? ' copied' : ''}`}
                onClick={() => handleCopy(textDecoded.value)}
                disabled={!textDecoded.value}
              >
                {copied ? 'コピーしました ✓' : 'コピー'}
              </button>
            </div>
          </div>
        )}

        {/* ── ファイル × エンコード ── */}
        {mode === 'file' && direction === 'encode' && (
          <div className="b64-converter">
            <div className="b64-field">
              <label className="b64-label">ファイルを選択</label>
              <div
                className="b64-dropzone"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                {fileInfo
                  ? <span className="b64-file-info">{fileInfo}</span>
                  : <span className="b64-drop-hint">クリックまたはドラッグ＆ドロップ</span>
                }
                <input
                  ref={fileRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
              </div>
            </div>
            <div className="b64-arrow">↓</div>
            <div className="b64-field">
              <div className="b64-output-header">
                <label className="b64-label">Base64 出力</label>
                {fileDisplayOutput.length > 0 && <span className="b64-char-count">{fmtCount(fileDisplayOutput.length)}</span>}
                <label className={`b64-dataurl-toggle${!fileMime ? ' disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={dataUrl}
                    disabled={!fileMime}
                    onChange={e => setDataUrl(e.target.checked)}
                  />
                  <span>
                    data URL 形式
                    {fileMime && <span className="b64-mime-hint"> ({fileMime})</span>}
                  </span>
                </label>
              </div>
              {encoding
                ? <div className="b64-encoding-indicator">
                    <span className="b64-encoding-spinner" />
                    変換中...
                  </div>
                : <textarea
                    className="b64-textarea b64-output"
                    readOnly
                    value={fileDisplayOutput}
                    rows={8}
                    placeholder="ファイルを選択するとBase64が表示されます"
                  />
              }
              <button
                className={`b64-copy-btn${copied ? ' copied' : ''}`}
                onClick={() => handleCopy(fileDisplayOutput)}
                disabled={!fileOutput}
              >
                {copied ? 'コピーしました ✓' : 'コピー'}
              </button>
            </div>
          </div>
        )}

        {/* ── ファイル × デコード ── */}
        {mode === 'file' && direction === 'decode' && (
          <div className="b64-converter">
            <div className="b64-field">
              <div className="b64-field-header">
                <label className="b64-label">Base64 入力</label>
                {b64Input.length > 0 && <span className="b64-char-count">{fmtCount(b64Input.length)}</span>}
              </div>
              <textarea
                className={`b64-textarea${error ? ' invalid' : ''}`}
                placeholder={'デコードするBase64文字列を貼り付け\n（data:... 形式にも対応）'}
                value={b64Input}
                onChange={e => {
                  const val = e.target.value
                  setB64Input(val)
                  setError('')
                  if (!fileNameEdited.current) {
                    const mime = val.trim().match(/^data:([^;,]+)/)?.[1]
                    if (mime && MIME_EXT[mime]) setFileName(`file.${MIME_EXT[mime]}`)
                    else if (!val.trim().startsWith('data:')) setFileName('decoded')
                  }
                }}
                rows={8}
              />
              {error && <p className="b64-error">{error}</p>}
            </div>
            <div className="b64-field b64-filename-row">
              <label className="b64-label">ダウンロードファイル名</label>
              <input
                className="b64-filename-input"
                type="text"
                value={fileName}
                onChange={e => { setFileName(e.target.value); fileNameEdited.current = true }}
                placeholder="decoded"
              />
            </div>
            <button
              className="b64-download-btn"
              onClick={handleDownload}
              disabled={!b64Input.trim()}
            >
              ダウンロード
            </button>
          </div>
        )}

        {/* 解説 */}
        <section className="b64-explain">
          <h2 className="b64-explain-title">Base64 とは</h2>
          <div className="b64-explain-block">
            <p className="b64-explain-subtitle">仕組み</p>
            <p>バイナリデータを3バイト（24ビット）ずつ取り出し、6ビットずつ4つに分割して、A–Z・a–z・0–9・+・/ の64種類の文字に変換します。末尾が不足する場合は <code>=</code> でパディングします。</p>
          </div>
          <div className="b64-explain-block">
            <p className="b64-explain-subtitle">主な用途</p>
            <ul className="b64-explain-list">
              <li>メール添付ファイル（MIME エンコード）</li>
              <li>HTMLの <code>data:</code> URL（画像・フォントのインライン埋め込み）</li>
              <li>REST API・JSON でのバイナリデータ転送</li>
              <li>Basic 認証ヘッダー（<code>Authorization: Basic ...</code>）</li>
            </ul>
          </div>
          <div className="b64-explain-block">
            <p className="b64-explain-subtitle">data URL 形式</p>
            <p>ファイルデコードは <code>data:[MIME];base64,[データ]</code> 形式にも対応しています。</p>
            <p className="b64-explain-example">例: <code>data:image/png;base64,iVBORw0KGgo...</code></p>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
