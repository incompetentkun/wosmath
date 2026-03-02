// ========== 定積分フォーム ==========
// 多項式の係数をUI入力

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: { coeffs: number[]; lower: number; upper: number }) => void
}

interface PolyCoeff {
  degree: number
  value: string
}

const EXAMPLES: { label: string; coeffs: number[]; lower: number; upper: number }[] = [
  { label: '∫₁³(-x³+2x²+x-2)dx', coeffs: [-2, 1, 2, -1], lower: 1, upper: 3 },
  { label: '∫₀¹(x²)dx', coeffs: [0, 0, 1], lower: 0, upper: 1 },
  { label: '∫₋₁¹(3x²)dx', coeffs: [0, 0, 3], lower: -1, upper: 1 },
  { label: '∫₀²(x³-x)dx', coeffs: [0, -1, 0, 1], lower: 0, upper: 2 },
]

function coeffsToLatex(coeffs: PolyCoeff[]): string {
  let s = ''
  const sorted = [...coeffs].filter(c => parseFloat(c.value) !== 0).sort((a, b) => b.degree - a.degree)
  if (sorted.length === 0) return '0'
  for (const { degree, value } of sorted) {
    const v = parseFloat(value)
    if (isNaN(v) || v === 0) continue
    const xp = degree === 0 ? '' : degree === 1 ? 'x' : `x^{${degree}}`
    if (s === '') {
      if (v === 1 && xp) s += xp
      else if (v === -1 && xp) s += `-${xp}`
      else s += `${v}${xp}`
    } else {
      if (v === 1 && xp) s += ` + ${xp}`
      else if (v === -1 && xp) s += ` - ${xp}`
      else if (v > 0) s += ` + ${v}${xp}`
      else s += ` - ${Math.abs(v)}${xp}`
    }
  }
  return s || '0'
}

export function IntegralForm({ onSubmit }: Props) {
  const [degree, setDegree] = useState(3)
  const [coeffs, setCoeffs] = useState<PolyCoeff[]>([
    { degree: 3, value: '-1' },
    { degree: 2, value: '2' },
    { degree: 1, value: '1' },
    { degree: 0, value: '-2' },
  ])
  const [lower, setLower] = useState('1')
  const [upper, setUpper] = useState('3')

  const updateCoeff = (deg: number, val: string) => {
    setCoeffs(prev => {
      const idx = prev.findIndex(c => c.degree === deg)
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, value: val } : c)
      return [...prev, { degree: deg, value: val }]
    })
  }

  const getCoeff = (deg: number) =>
    coeffs.find(c => c.degree === deg)?.value ?? '0'

  const changeDegree = (d: number) => {
    setDegree(d)
    const newCoeffs: PolyCoeff[] = []
    for (let i = d; i >= 0; i--) {
      newCoeffs.push({ degree: i, value: getCoeff(i) })
    }
    setCoeffs(newCoeffs)
  }

  const setExample = (ex: typeof EXAMPLES[0]) => {
    const newCoeffs: PolyCoeff[] = ex.coeffs.map((v, i) => ({ degree: i, value: String(v) }))
    const maxDeg = ex.coeffs.length - 1
    setDegree(maxDeg)
    setCoeffs(newCoeffs.reverse())
    setLower(String(ex.lower))
    setUpper(String(ex.upper))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const low = parseFloat(lower), up = parseFloat(upper)
    if (isNaN(low) || isNaN(up)) {
      alert('積分区間に数値を入力してください')
      return
    }
    // coeffsを配列に変換（index = 次数）
    const maxDeg = degree
    const coeffArr: number[] = []
    for (let i = 0; i <= maxDeg; i++) {
      const val = parseFloat(getCoeff(i))
      coeffArr.push(isNaN(val) ? 0 : val)
    }
    onSubmit({ coeffs: coeffArr, lower: low, upper: up })
  }

  const polyStr = coeffsToLatex(
    Array.from({ length: degree + 1 }, (_, i) => ({ degree: i, value: getCoeff(i) }))
  )

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="form-preview">
        <Katex latex={`\\int_{${lower}}^{${upper}} \\left(${polyStr}\\right) dx`} display />
      </div>

      <div className="form-fields">
        <label className="field-group">
          <span className="field-label">最高次数</span>
          <select
            value={degree}
            onChange={e => changeDegree(parseInt(e.target.value))}
            className="field-select"
          >
            {[1, 2, 3, 4, 5, 6].map(d => (
              <option key={d} value={d}>{d}次</option>
            ))}
          </select>
        </label>

        <div className="coeffs-grid">
          {Array.from({ length: degree + 1 }, (_, i) => degree - i).map(deg => (
            <label key={deg} className="field-group field-group--inline">
              <span className="field-label coeff-label">
                <Katex latex={deg === 0 ? '定数項' : deg === 1 ? 'x の係数' : `x^{${deg}} の係数`} />
              </span>
              <input
                type="number" step="any"
                value={getCoeff(deg)}
                onChange={e => updateCoeff(deg, e.target.value)}
                className="field-input field-input--sm"
              />
            </label>
          ))}
        </div>

        <div className="integral-bounds">
          <label className="field-group field-group--inline">
            <span className="field-label">下限 <Katex latex="a" /></span>
            <input type="number" step="any" value={lower} onChange={e => setLower(e.target.value)} className="field-input field-input--sm" />
          </label>
          <label className="field-group field-group--inline">
            <span className="field-label">上限 <Katex latex="b" /></span>
            <input type="number" step="any" value={upper} onChange={e => setUpper(e.target.value)} className="field-input field-input--sm" />
          </label>
        </div>
      </div>

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
