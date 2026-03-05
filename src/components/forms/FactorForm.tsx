// ========== 因数分解フォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: Record<string, string | number>) => void
}

function buildPreviewLatex(a: string, b: string, c: string): string {
  const an = parseInt(a, 10), bn = parseInt(b, 10), cn = parseInt(c, 10)
  if (isNaN(an) || an === 0) return '?\\,x^2 + ?\\,x + ?'
  let s = ''
  if      (an ===  1) s += 'x^2'
  else if (an === -1) s += '-x^2'
  else                s += `${an}x^2`
  if (!isNaN(bn) && bn !== 0) {
    if      (bn ===  1) s += ' + x'
    else if (bn === -1) s += ' - x'
    else if (bn > 0)    s += ` + ${bn}x`
    else                s += ` - ${Math.abs(bn)}x`
  }
  if (!isNaN(cn) && cn !== 0) {
    if (cn > 0) s += ` + ${cn}`
    else        s += ` - ${Math.abs(cn)}`
  }
  return s || '0'
}

function buildCubicPreview(a: string, b: string, c: string, d: string): string {
  const an = parseInt(a, 10), bn = parseInt(b, 10), cn = parseInt(c, 10), dn = parseInt(d, 10)
  if (isNaN(an) || an === 0) return '?\\,x^3 + ?\\,x^2 + ?\\,x + ?'
  let s = ''
  if      (an ===  1) s += 'x^3'
  else if (an === -1) s += '-x^3'
  else                s += `${an}x^3`
  if (!isNaN(bn) && bn !== 0) {
    if      (bn ===  1) s += ' + x^2'
    else if (bn === -1) s += ' - x^2'
    else if (bn > 0)    s += ` + ${bn}x^2`
    else                s += ` - ${Math.abs(bn)}x^2`
  }
  if (!isNaN(cn) && cn !== 0) {
    if      (cn ===  1) s += ' + x'
    else if (cn === -1) s += ' - x'
    else if (cn > 0)    s += ` + ${cn}x`
    else                s += ` - ${Math.abs(cn)}x`
  }
  if (!isNaN(dn) && dn !== 0) {
    if (dn > 0) s += ` + ${dn}`
    else        s += ` - ${Math.abs(dn)}`
  }
  return s || '0'
}

const EXAMPLES_2 = [
  { label: 'x²−9',       a: 1, b:  0, c:  -9 },
  { label: 'x²+5x+6',    a: 1, b:  5, c:   6 },
  { label: 'x²−5x+6',    a: 1, b: -5, c:   6 },
  { label: '2x²−x−3',    a: 2, b: -1, c:  -3 },
  { label: 'x²−6x+9',    a: 1, b: -6, c:   9 },
]

const EXAMPLES_3 = [
  { label: 'x³−6x²+11x−6', a: 1, b: -6, c:  11, d: -6 },
  { label: 'x³+3x²+3x+1',  a: 1, b:  3, c:   3, d:  1 },
  { label: 'x³−1',          a: 1, b:  0, c:   0, d: -1 },
  { label: 'x³+1',          a: 1, b:  0, c:   0, d:  1 },
  { label: '2x³+3x²−11x−6', a: 2, b:  3, c: -11, d: -6 },
]

export function FactorForm({ onSubmit }: Props) {
  const [degree, setDegree] = useState<'2' | '3'>('2')

  // 2次用
  const [a2, setA2] = useState('1')
  const [b2, setB2] = useState('5')
  const [c2, setC2] = useState('6')

  // 3次用
  const [a3, setA3] = useState('1')
  const [b3, setB3] = useState('-6')
  const [c3, setC3] = useState('11')
  const [d3, setD3] = useState('-6')

  const parseCoeff = (s: string) => { const n = parseInt(s, 10); return isNaN(n) ? 0 : n }
  const isValidCoeff = (s: string) => {
    if (s.trim() === '') return true
    const n = parseInt(s, 10)
    return !isNaN(n) && String(n) === s.trim() && Math.abs(n) <= 99_999_999
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (degree === '2') {
      if (!isValidCoeff(a2) || !isValidCoeff(b2) || !isValidCoeff(c2)) {
        alert('係数は整数で入力してください（最大8桁）')
        return
      }
      if (parseCoeff(a2) === 0) {
        alert('a ≠ 0 にしてください（x² の係数が 0 では二次式になりません）')
        return
      }
      onSubmit({ a: parseCoeff(a2), b: parseCoeff(b2), c: parseCoeff(c2), mode: 'factor', degree: 2 })
    } else {
      if (!isValidCoeff(a3) || !isValidCoeff(b3) || !isValidCoeff(c3) || !isValidCoeff(d3)) {
        alert('係数は整数で入力してください（最大8桁）')
        return
      }
      if (parseCoeff(a3) === 0) {
        alert('a ≠ 0 にしてください（x³ の係数が 0 では三次式になりません）')
        return
      }
      onSubmit({ a: parseCoeff(a3), b: parseCoeff(b3), c: parseCoeff(c3), d: parseCoeff(d3), mode: 'factor', degree: 3 })
    }
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="mode-toggle">
        <button type="button" className={`toggle-btn ${degree === '2' ? 'active' : ''}`} onClick={() => setDegree('2')}>2次</button>
        <button type="button" className={`toggle-btn ${degree === '3' ? 'active' : ''}`} onClick={() => setDegree('3')}>3次</button>
      </div>

      <div className="form-preview">
        {degree === '2'
          ? <Katex latex={buildPreviewLatex(a2, b2, c2)} display />
          : <Katex latex={buildCubicPreview(a3, b3, c3, d3)} display />
        }
      </div>

      {degree === '2' ? (
        <div className="form-fields">
          <label className="field-group">
            <span className="field-label"><Katex latex="a" /> （x² の係数）</span>
            <input type="number" value={a2} step="1" onChange={e => setA2(e.target.value)} className="field-input" placeholder="例: 1" />
          </label>
          <label className="field-group">
            <span className="field-label"><Katex latex="b" /> （x の係数）</span>
            <input type="number" value={b2} step="1" onChange={e => setB2(e.target.value)} className="field-input" placeholder="例: 5" />
          </label>
          <label className="field-group">
            <span className="field-label"><Katex latex="c" /> （定数項）</span>
            <input type="number" value={c2} step="1" onChange={e => setC2(e.target.value)} className="field-input" placeholder="例: 6" />
          </label>
        </div>
      ) : (
        <div className="form-fields">
          <label className="field-group">
            <span className="field-label"><Katex latex="a" /> （x³ の係数）</span>
            <input type="number" value={a3} step="1" onChange={e => setA3(e.target.value)} className="field-input" placeholder="例: 1" />
          </label>
          <label className="field-group">
            <span className="field-label"><Katex latex="b" /> （x² の係数）</span>
            <input type="number" value={b3} step="1" onChange={e => setB3(e.target.value)} className="field-input" placeholder="例: -6" />
          </label>
          <label className="field-group">
            <span className="field-label"><Katex latex="c" /> （x の係数）</span>
            <input type="number" value={c3} step="1" onChange={e => setC3(e.target.value)} className="field-input" placeholder="例: 11" />
          </label>
          <label className="field-group">
            <span className="field-label"><Katex latex="d" /> （定数項）</span>
            <input type="number" value={d3} step="1" onChange={e => setD3(e.target.value)} className="field-input" placeholder="例: -6" />
          </label>
        </div>
      )}

      <p className="field-hint" style={{ marginBottom: '8px' }}>※ 係数は整数のみ対応（最大8桁）</p>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {degree === '2'
          ? EXAMPLES_2.map(ex => (
              <button key={ex.label} type="button" className="example-btn" onClick={() => { setA2(String(ex.a)); setB2(String(ex.b)); setC2(String(ex.c)) }}>
                {ex.label}
              </button>
            ))
          : EXAMPLES_3.map(ex => (
              <button key={ex.label} type="button" className="example-btn" onClick={() => { setA3(String(ex.a)); setB3(String(ex.b)); setC3(String(ex.c)); setD3(String(ex.d)) }}>
                {ex.label}
              </button>
            ))
        }
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">因数分解する</button>
      </div>
    </form>
  )
}
