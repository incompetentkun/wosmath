// ========== 連立一次方程式フォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'

interface Props {
  onSubmit: (params: { coefficients: number[][] }) => void
}

type Dim = 2 | 3

const EXAMPLES_2: { label: string; rows: number[][] }[] = [
  { label: 'x+y=3, x-y=1', rows: [[1, 1, 3], [1, -1, 1]] },
  { label: '2x+y=5, x+2y=4', rows: [[2, 1, 5], [1, 2, 4]] },
  { label: '3x-2y=7, x+y=4', rows: [[3, -2, 7], [1, 1, 4]] },
]

const EXAMPLES_3: { label: string; rows: number[][] }[] = [
  { label: 'x+y+z=6, x+2y+z=8, x+y+2z=8', rows: [[1,1,1,6],[1,2,1,8],[1,1,2,8]] },
  { label: '2x+y+z=4, x+3y+z=6, x+y+2z=5', rows: [[2,1,1,4],[1,3,1,6],[1,1,2,5]] },
]

function emptyMatrix(dim: Dim): number[][] {
  if (dim === 2) return [[1, 1, 3], [1, -1, 1]]
  return [[1, 1, 1, 6], [1, 2, 1, 8], [1, 1, 2, 8]]
}

export function LinearEqForm({ onSubmit }: Props) {
  const [dim, setDim] = useState<Dim>(2)
  const [matrix, setMatrix] = useState<number[][]>(emptyMatrix(2))

  const switchDim = (d: Dim) => {
    setDim(d)
    setMatrix(emptyMatrix(d))
  }

  const updateCell = (row: number, col: number, val: string) => {
    const n = parseFloat(val)
    if (isNaN(n) && val !== '' && val !== '-') return
    setMatrix(prev => prev.map((r, i) =>
      i === row ? r.map((v, j) => j === col ? (isNaN(n) ? 0 : n) : v) : r
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ coefficients: matrix })
  }

  const vars = dim === 2 ? ['x', 'y'] : ['x', 'y', 'z']
  const rhs = dim === 2 ? 2 : 3  // 定数項の列インデックス

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="mode-toggle">
        <button type="button" className={`toggle-btn ${dim === 2 ? 'active' : ''}`} onClick={() => switchDim(2)}>2元</button>
        <button type="button" className={`toggle-btn ${dim === 3 ? 'active' : ''}`} onClick={() => switchDim(3)}>3元</button>
      </div>

      <div className="matrix-form">
        <div className="matrix-header">
          {vars.map(v => <span key={v} className="matrix-var"><Katex latex={v} /></span>)}
          <span className="matrix-var">=</span>
        </div>
        {matrix.map((row, i) => (
          <div key={i} className="matrix-row">
            <span className="matrix-eq-num">{i + 1}式目：</span>
            {vars.map((v, j) => (
              <span key={j} className="matrix-cell-group">
                <input
                  type="number" step="any"
                  value={row[j]}
                  onChange={e => updateCell(i, j, e.target.value)}
                  className="matrix-input"
                />
                <Katex latex={v} />
              </span>
            ))}
            <span className="matrix-cell-group">
              <span className="matrix-eq">=</span>
              <input
                type="number" step="any"
                value={row[rhs]}
                onChange={e => updateCell(i, rhs, e.target.value)}
                className="matrix-input"
              />
            </span>
          </div>
        ))}
      </div>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {(dim === 2 ? EXAMPLES_2 : EXAMPLES_3).map(ex => (
          <button key={ex.label} type="button" className="example-btn" onClick={() => setMatrix(ex.rows)}>
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
