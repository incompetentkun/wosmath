import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom'
import { MODES, type CalcMode } from '../types'
import { useCalcWorker } from '../hooks/useCalcWorker'
import { ResultPanel } from '../components/ResultPanel'
import { QuadraticGuide } from '../components/QuadraticGuide'
import { ThemeToggle } from '../components/ThemeToggle'
import { QuadraticForm } from '../components/forms/QuadraticForm'
import { FactorForm } from '../components/forms/FactorForm'
import { LinearEqForm } from '../components/forms/LinearEqForm'
import { IntegralForm } from '../components/forms/IntegralForm'
import { CombinatoricsForm } from '../components/forms/CombinatoricsForm'
import { BinomialForm } from '../components/forms/BinomialForm'
import { SequenceForm } from '../components/forms/SequenceForm'

const CATEGORIES = [...new Set(MODES.map(m => m.category))]
const AVAILABLE_SLUGS = ['quadratic', 'factorization']

const MODE_DESCRIPTIONS: Record<string, string> = {
  quadratic:     '二次方程式 ax²+bx+c=0 を解いて途中式を表示。判別式・解の公式・グラフまで対応。',
  factorization: '多項式の因数分解を途中式つきで計算。因数定理・完全平方式・差の平方などに対応。',
}

export function ToolPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [showGuide, setShowGuide] = useState(false)
  const { compute, cancel, status, result, error } = useCalcWorker()
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (status === 'done' && result && resultRef.current && window.innerWidth < 769) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [status, result])

  const currentMode = MODES.find(m => m.slug === slug)

  useEffect(() => {
    if (currentMode) {
      document.title = currentMode.label
      const desc = MODE_DESCRIPTIONS[currentMode.slug]
      if (desc) document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
      cancel()
      setShowGuide(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (!currentMode) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = (params: Record<string, unknown>) => {
    compute({ mode: currentMode.id, params: params as Record<string, number | string | number[]> })
  }

  const handleModeChange = (mode: typeof MODES[0]) => {
    navigate(`/${mode.slug}`)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <Link to="/" className="home-link">
              <span className="title-icon">∑</span>
              wosmath
            </Link>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{currentMode.label}</span>
          </h1>
          <p className="app-subtitle">途中式・判別式・グラフつき 無料計算ツール</p>
          <ThemeToggle />
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          {CATEGORIES.map(cat => (
            <div key={cat} className="sidebar-category">
              <div className="sidebar-cat-label">{cat}</div>
              {MODES.filter(m => m.category === cat).map(mode => {
                const available = AVAILABLE_SLUGS.includes(mode.slug)
                return (
                  <button
                    key={mode.id}
                    className={`sidebar-item ${currentMode.id === mode.id ? 'active' : ''} ${!available ? 'wip' : ''}`}
                    onClick={() => available && handleModeChange(mode)}
                    disabled={!available}
                  >
                    <span className="sidebar-item-label">{mode.label}</span>
                    <span className="sidebar-item-desc">{available ? mode.description : '準備中'}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        <main className="main-content">
          <div className="mode-header">
            <div className="mode-title-row">
              <h2 className="mode-title">{currentMode.label}</h2>
              {currentMode.id === 'quadratic' && (
                <button className="guide-btn" onClick={() => setShowGuide(true)}>
                  解き方を見る
                </button>
              )}
            </div>
            <p className="mode-desc">{currentMode.description}</p>
          </div>

          <div className="form-section">
            <FormWrapper mode={currentMode.id} onSubmit={handleSubmit} />
          </div>

          {status === 'computing' && (
            <div className="computing-bar">
              <div className="spinner" />
              <span>計算中...</span>
              <button className="btn-cancel" onClick={cancel}>キャンセル</button>
            </div>
          )}

          {status === 'error' && error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>エラー</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {status === 'done' && result && (
            <div className="result-section" ref={resultRef}>
              <ResultPanel result={result} />
            </div>
          )}
        </main>
      </div>

      {showGuide && <QuadraticGuide onClose={() => setShowGuide(false)} />}
    </div>
  )
}

function FormWrapper({
  mode,
  onSubmit,
}: {
  mode: CalcMode
  onSubmit: (params: Record<string, unknown>) => void
}) {
  switch (mode) {
    case 'quadratic':
      return <QuadraticForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'factor':
      return <FactorForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'linear_eq':
      return <LinearEqForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'integral':
      return <IntegralForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'combinatorics':
      return <CombinatoricsForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'binomial':
      return <BinomialForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    case 'sequence':
      return <SequenceForm onSubmit={p => onSubmit(p as Record<string, unknown>)} />
    default:
      return <p>未実装のモードです</p>
  }
}
