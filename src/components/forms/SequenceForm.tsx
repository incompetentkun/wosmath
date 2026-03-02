// ========== 数列フォーム ==========

import { useState } from 'react'
import { Katex } from '../Katex'
import type { SequenceType } from '../../engines/sequences/index'

interface Props {
  onSubmit: (params: Record<string, string | number>) => void
}

type SigmaType = 'k' | 'k2' | 'k3' | 'const'

export function SequenceForm({ onSubmit }: Props) {
  const [seqType, setSeqType] = useState<SequenceType>('arithmetic')
  const [a1, setA1] = useState('1')
  const [d, setD] = useState('2')
  const [r, setR] = useState('2')
  const [n, setN] = useState('10')
  const [sigmaType, setSigmaType] = useState<SigmaType>('k')
  const [sigmaConst, setSigmaConst] = useState('3')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params: Record<string, string | number> = {
      type: seqType,
      n: parseInt(n) || 10,
    }
    if (seqType === 'arithmetic') {
      params.a1 = parseFloat(a1) || 0
      params.d = parseFloat(d) || 0
    } else if (seqType === 'geometric') {
      params.a1 = parseFloat(a1) || 1
      params.r = parseFloat(r) || 2
    } else {
      params.sigmaType = sigmaType
      if (sigmaType === 'const') params.sigmaConst = parseFloat(sigmaConst) || 1
    }
    onSubmit(params)
  }

  const sigmaLabels: Record<SigmaType, string> = {
    k: '\\sum k = 1+2+\\cdots+n',
    k2: '\\sum k^2 = 1^2+2^2+\\cdots+n^2',
    k3: '\\sum k^3 = 1^3+2^3+\\cdots+n^3',
    const: `\\sum c = c \\times n`,
  }

  return (
    <form className="calc-form" onSubmit={handleSubmit}>
      <div className="mode-toggle">
        <button type="button" className={`toggle-btn ${seqType === 'arithmetic' ? 'active' : ''}`} onClick={() => setSeqType('arithmetic')}>等差数列</button>
        <button type="button" className={`toggle-btn ${seqType === 'geometric' ? 'active' : ''}`} onClick={() => setSeqType('geometric')}>等比数列</button>
        <button type="button" className={`toggle-btn ${seqType === 'sigma' ? 'active' : ''}`} onClick={() => setSeqType('sigma')}>Σ計算</button>
      </div>

      {seqType === 'arithmetic' && (
        <div className="form-fields">
          <div className="form-preview">
            <Katex latex={`a_n = ${a1} + (n-1) \\cdot ${d}`} display />
          </div>
          <label className="field-group field-group--inline">
            <span className="field-label">初項 <Katex latex="a_1" /></span>
            <input type="number" step="any" value={a1} onChange={e => setA1(e.target.value)} className="field-input field-input--sm" />
          </label>
          <label className="field-group field-group--inline">
            <span className="field-label">公差 <Katex latex="d" /></span>
            <input type="number" step="any" value={d} onChange={e => setD(e.target.value)} className="field-input field-input--sm" />
          </label>
          <label className="field-group field-group--inline">
            <span className="field-label">項数 <Katex latex="n" /></span>
            <input type="number" min="1" value={n} onChange={e => setN(e.target.value)} className="field-input field-input--sm" />
          </label>
          <div className="examples">
            <span className="examples-label">例題：</span>
            <button type="button" className="example-btn" onClick={() => { setA1('1'); setD('2'); setN('10') }}>a₁=1, d=2, n=10</button>
            <button type="button" className="example-btn" onClick={() => { setA1('3'); setD('5'); setN('20') }}>a₁=3, d=5, n=20</button>
            <button type="button" className="example-btn" onClick={() => { setA1('100'); setD('-3'); setN('15') }}>a₁=100, d=-3, n=15</button>
          </div>
        </div>
      )}

      {seqType === 'geometric' && (
        <div className="form-fields">
          <div className="form-preview">
            <Katex latex={`a_n = ${a1} \\cdot ${r}^{n-1}`} display />
          </div>
          <label className="field-group field-group--inline">
            <span className="field-label">初項 <Katex latex="a_1" /></span>
            <input type="number" step="any" value={a1} onChange={e => setA1(e.target.value)} className="field-input field-input--sm" />
          </label>
          <label className="field-group field-group--inline">
            <span className="field-label">公比 <Katex latex="r" /></span>
            <input type="number" step="any" value={r} onChange={e => setR(e.target.value)} className="field-input field-input--sm" />
          </label>
          <label className="field-group field-group--inline">
            <span className="field-label">項数 <Katex latex="n" /></span>
            <input type="number" min="1" value={n} onChange={e => setN(e.target.value)} className="field-input field-input--sm" />
          </label>
          <div className="examples">
            <span className="examples-label">例題：</span>
            <button type="button" className="example-btn" onClick={() => { setA1('1'); setR('2'); setN('10') }}>a₁=1, r=2, n=10</button>
            <button type="button" className="example-btn" onClick={() => { setA1('3'); setR('3'); setN('6') }}>a₁=3, r=3, n=6</button>
            <button type="button" className="example-btn" onClick={() => { setA1('1'); setR('0.5'); setN('8') }}>a₁=1, r=1/2, n=8</button>
          </div>
        </div>
      )}

      {seqType === 'sigma' && (
        <div className="form-fields">
          <div className="form-preview">
            <Katex latex={`\\sum_{k=1}^{${n}} ${sigmaType === 'const' ? sigmaConst : sigmaType === 'k' ? 'k' : sigmaType === 'k2' ? 'k^2' : 'k^3'}`} display />
          </div>
          <label className="field-group">
            <span className="field-label">Σの種類</span>
            <div className="radio-group">
              {(['k', 'k2', 'k3', 'const'] as SigmaType[]).map(t => (
                <label key={t} className="radio-label">
                  <input type="radio" name="sigmaType" value={t} checked={sigmaType === t} onChange={() => setSigmaType(t)} />
                  <Katex latex={sigmaLabels[t]} />
                </label>
              ))}
            </div>
          </label>
          {sigmaType === 'const' && (
            <label className="field-group field-group--inline">
              <span className="field-label">定数 <Katex latex="c" /></span>
              <input type="number" step="any" value={sigmaConst} onChange={e => setSigmaConst(e.target.value)} className="field-input field-input--sm" />
            </label>
          )}
          <label className="field-group field-group--inline">
            <span className="field-label">上限 <Katex latex="n" /></span>
            <input type="number" min="1" value={n} onChange={e => setN(e.target.value)} className="field-input field-input--sm" />
          </label>
          <div className="examples">
            <span className="examples-label">例題：</span>
            <button type="button" className="example-btn" onClick={() => { setSigmaType('k'); setN('100') }}>Σk, n=100</button>
            <button type="button" className="example-btn" onClick={() => { setSigmaType('k2'); setN('10') }}>Σk², n=10</button>
            <button type="button" className="example-btn" onClick={() => { setSigmaType('k3'); setN('5') }}>Σk³, n=5</button>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn-primary">計算する</button>
      </div>
    </form>
  )
}
