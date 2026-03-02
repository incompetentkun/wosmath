// ========== 因数分解・展開フォーム ==========

import { useState } from 'react'

interface Props {
  onSubmit: (params: Record<string, string>) => void
}

const FACTOR_EXAMPLES = [
  'x^2-9',
  'x^2+5x+6',
  '2x^2-x-3',
  'x^2-6x+9',
  'x^2+4x+4',
]

const EXPAND_EXAMPLES = [
  '(x+3)^2',
  '(x-2)^2',
  '(x+1)(x-1)',
  '(2x+1)(x-3)',
]

export function FactorForm({ onSubmit }: Props) {
  const [mode, setMode] = useState<'factor' | 'expand'>('factor')
  const [expression, setExpression] = useState('x^2-9')

  const examples = mode === 'factor' ? FACTOR_EXAMPLES : EXPAND_EXAMPLES

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!expression.trim()) {
      alert('式を入力してください')
      return
    }
    onSubmit({ expression: expression.trim(), mode })
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="mode-toggle">
        <button
          type="button"
          className={`toggle-btn ${mode === 'factor' ? 'active' : ''}`}
          onClick={() => { setMode('factor'); setExpression('x^2-9') }}
        >
          因数分解
        </button>
        <button
          type="button"
          className={`toggle-btn ${mode === 'expand' ? 'active' : ''}`}
          onClick={() => { setMode('expand'); setExpression('(x+3)^2') }}
        >
          展開
        </button>
      </div>

      <div className="form-fields">
        <label className="field-group">
          <span className="field-label">
            {mode === 'factor' ? '因数分解する式' : '展開する式'}
          </span>
          <input
            type="text"
            value={expression}
            onChange={e => setExpression(e.target.value)}
            className="field-input field-input--wide"
            placeholder={mode === 'factor' ? '例: x^2-9' : '例: (x+3)^2'}
          />
          <span className="field-hint">
            ＊ 乗は ^ で表す（例: x^2）
          </span>
        </label>
      </div>

      <div className="examples">
        <span className="examples-label">例題：</span>
        {examples.map(ex => (
          <button key={ex} type="button" className="example-btn" onClick={() => setExpression(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">計算する</button>
      </div>
    </form>
  )
}
