// ========== 順列・組合せフォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: Record<string, string | number>) => void
}

type CombType = 'permutation' | 'combination' | 'repetition_permutation' | 'repetition_combination'

const TYPE_OPTIONS: { value: CombType; label: string; latex: string }[] = [
  { value: 'permutation', label: '順列 nPr', latex: '{}_n P_r' },
  { value: 'combination', label: '組合せ nCr', latex: '{}_n C_r' },
  { value: 'repetition_permutation', label: '重複順列 nⁿ', latex: 'n^r' },
  { value: 'repetition_combination', label: '重複組合せ nHr', latex: '{}_n H_r' },
]

const EXAMPLES: { type: CombType; n: number; r: number; label: string }[] = [
  { type: 'combination', n: 10, r: 3, label: '10C3=120' },
  { type: 'permutation', n: 5, r: 3, label: '5P3=60' },
  { type: 'combination', n: 6, r: 2, label: '6C2=15' },
  { type: 'repetition_combination', n: 3, r: 2, label: '3H2=6' },
]

export function CombinatoricsForm({ onSubmit }: Props) {
  const [type, setType] = useState<CombType>('combination')
  const [n, setN] = useState('10')
  const [r, setR] = useState('3')

  const selected = TYPE_OPTIONS.find(o => o.value === type)!

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nn = parseInt(n), rr = parseInt(r)
    if (isNaN(nn) || isNaN(rr)) { alert('n, r に整数を入力してください'); return }
    if (nn < 0 || rr < 0) { alert('n, r は 0 以上にしてください'); return }
    onSubmit({ n: nn, r: rr, type })
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="form-preview">
        <Katex latex={`${selected.latex.replace('n', n || 'n').replace('r', r || 'r')}`} display />
      </div>

      <div className="form-fields">
        <label className="field-group">
          <span className="field-label">計算タイプ</span>
          <select value={type} onChange={e => setType(e.target.value as CombType)} className="field-select">
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field-group field-group--inline">
          <span className="field-label"><Katex latex="n" /> （全体の数）</span>
          <input type="number" min="0" max="30" value={n} onChange={e => setN(e.target.value)} className="field-input field-input--sm" />
        </label>

        <label className="field-group field-group--inline">
          <span className="field-label"><Katex latex="r" /> （選ぶ数）</span>
          <input type="number" min="0" max="30" value={r} onChange={e => setR(e.target.value)} className="field-input field-input--sm" />
        </label>
      </div>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {EXAMPLES.map(ex => (
          <button key={ex.label} type="button" className="example-btn"
            onClick={() => { setType(ex.type); setN(String(ex.n)); setR(String(ex.r)) }}>
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
