// ========== 二項分布フォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: Record<string, string | number>) => void
}

const EXAMPLES: { n: number; p: number; k: number; queryType: string; label: string }[] = [
  { n: 5, p: 0.2, k: 2, queryType: 'exact', label: 'n=5,p=0.2,k=2' },
  { n: 10, p: 0.5, k: 5, queryType: 'exact', label: 'n=10,p=0.5,k=5' },
  { n: 6, p: 0.3, k: 2, queryType: 'leq', label: 'P(X≤2), n=6,p=0.3' },
  { n: 8, p: 0.4, k: 3, queryType: 'geq', label: 'P(X≥3), n=8,p=0.4' },
]

export function BinomialForm({ onSubmit }: Props) {
  const [n, setN] = useState('5')
  const [p, setP] = useState('0.2')
  const [k, setK] = useState('2')
  const [queryType, setQueryType] = useState<'exact' | 'leq' | 'geq'>('exact')

  const queryLabel = queryType === 'exact' ? `P(X = ${k})` : queryType === 'leq' ? `P(X \\leq ${k})` : `P(X \\geq ${k})`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nn = parseInt(n), pp = parseFloat(p), kk = parseInt(k)
    if (isNaN(nn) || isNaN(pp) || isNaN(kk)) { alert('n, p, k に数値を入力してください'); return }
    if (pp < 0 || pp > 1) { alert('p は 0 以上 1 以下にしてください'); return }
    if (nn < 0 || kk < 0) { alert('n, k は非負整数にしてください'); return }
    if (kk > nn) { alert('k ≤ n にしてください'); return }
    onSubmit({ n: nn, p: pp, k: kk, queryType })
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="form-preview">
        <Katex latex={`X \\sim B(${n}, ${p}), \\quad ${queryLabel}`} display />
      </div>

      <div className="form-fields">
        <label className="field-group field-group--inline">
          <span className="field-label"><Katex latex="n" /> （試行回数）</span>
          <input type="number" min="0" max="50" value={n} onChange={e => setN(e.target.value)} className="field-input field-input--sm" />
        </label>

        <label className="field-group field-group--inline">
          <span className="field-label"><Katex latex="p" /> （成功確率）</span>
          <input type="number" min="0" max="1" step="0.01" value={p} onChange={e => setP(e.target.value)} className="field-input field-input--sm" />
        </label>

        <label className="field-group field-group--inline">
          <span className="field-label"><Katex latex="k" /> （成功回数）</span>
          <input type="number" min="0" value={k} onChange={e => setK(e.target.value)} className="field-input field-input--sm" />
        </label>

        <label className="field-group">
          <span className="field-label">求める確率</span>
          <div className="radio-group">
            {([['exact', `P(X = k)`], ['leq', `P(X ≤ k)`], ['geq', `P(X ≥ k)`]] as const).map(([v, l]) => (
              <label key={v} className="radio-label">
                <input type="radio" name="queryType" value={v} checked={queryType === v} onChange={() => setQueryType(v)} />
                {l}
              </label>
            ))}
          </div>
        </label>
      </div>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {EXAMPLES.map(ex => (
          <button key={ex.label} type="button" className="example-btn"
            onClick={() => { setN(String(ex.n)); setP(String(ex.p)); setK(String(ex.k)); setQueryType(ex.queryType as 'exact' | 'leq' | 'geq') }}>
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
