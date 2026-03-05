// ========== 二次方程式フォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: Record<string, number>) => void
}

/** 係数1は省略、0の項は丸ごと省略してプレビュー式を生成 */
function buildPreviewLatex(a: string, b: string, c: string): string {
  const an = parseFloat(a), bn = parseFloat(b), cn = parseFloat(c)
  if (isNaN(an) || an === 0) return '?\\,x^2 + ?\\,x + ? = 0'
  let s = ''
  // x² 項
  if      (an ===  1) s += 'x^2'
  else if (an === -1) s += '-x^2'
  else                s += `${an}x^2`
  // x 項
  if (!isNaN(bn) && bn !== 0) {
    if      (bn ===  1) s += ' + x'
    else if (bn === -1) s += ' - x'
    else if (bn > 0)    s += ` + ${bn}x`
    else                s += ` - ${Math.abs(bn)}x`
  }
  // 定数項
  if (!isNaN(cn) && cn !== 0) {
    if (cn > 0) s += ` + ${cn}`
    else        s += ` - ${Math.abs(cn)}`
  }
  return `${s} = 0`
}

const EXAMPLES = [
  { label: 'x²-5x+6=0', a: 1, b: -5, c: 6 },
  { label: 'x²-9=0', a: 1, b: 0, c: -9 },
  { label: '2x²+3x-2=0', a: 2, b: 3, c: -2 },
  { label: 'x²+2x+1=0（重解）', a: 1, b: 2, c: 1 },
  { label: 'x²+1=0（虚数解）', a: 1, b: 0, c: 1 },
]

export function QuadraticForm({ onSubmit }: Props) {
  const [a, setA] = useState('1')
  const [b, setB] = useState('-5')
  const [c, setC] = useState('6')

  const MAX_DIGITS = 8
  const parseCoeff = (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? 0 : n }
  const isValidCoeff = (s: string) => {
    if (s.trim() === '') return true
    const n = parseInt(s, 10)
    return !isNaN(n) && String(n) === s.trim() && Math.abs(n) <= 99_999_999
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidCoeff(a) || !isValidCoeff(b) || !isValidCoeff(c)) {
      alert(`係数は整数で入力してください（最大${MAX_DIGITS}桁）`)
      return
    }
    const an = parseCoeff(a), bn = parseCoeff(b), cn = parseCoeff(c)
    if (an === 0) {
      alert('a ≠ 0 にしてください（a=0 では二次方程式になりません）')
      return
    }
    onSubmit({ a: an, b: bn, c: cn })
  }

  const setExample = (ex: typeof EXAMPLES[0]) => {
    setA(String(ex.a)); setB(String(ex.b)); setC(String(ex.c))
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="form-preview">
        <Katex latex={buildPreviewLatex(a, b, c)} display />
      </div>

      <div className="form-fields">
        <label className="field-group">
          <span className="field-label"><Katex latex="a" /> （x² の係数）</span>
          <input
            type="number" value={a} step="any"
            onChange={e => setA(e.target.value)}
            className="field-input"
            placeholder="例: 1"
          />
        </label>
        <label className="field-group">
          <span className="field-label"><Katex latex="b" /> （x の係数）</span>
          <input
            type="number" value={b} step="any"
            onChange={e => setB(e.target.value)}
            className="field-input"
            placeholder="例: -5"
          />
        </label>
        <label className="field-group">
          <span className="field-label"><Katex latex="c" /> （定数項）</span>
          <input
            type="number" value={c} step="any"
            onChange={e => setC(e.target.value)}
            className="field-input"
            placeholder="例: 6"
          />
        </label>
      </div>

      <p className="field-hint" style={{ marginBottom: '8px' }}>※ 係数は整数のみ対応（最大8桁）</p>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {EXAMPLES.map(ex => (
          <button key={ex.label} type="button" className="example-btn" onClick={() => setExample(ex)}>
            {ex.label}
          </button>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">計算する</button>
      </div>
    </form>
  )
}
