// ========== メインアプリ ==========

import { useState, useCallback } from 'react'
import { MODES, type CalcMode, type ModeInfo } from './types'
import { useCalcWorker } from './hooks/useCalcWorker'
import { ResultPanel } from './components/ResultPanel'
import { QuadraticGuide } from './components/QuadraticGuide'
import { QuadraticForm } from './components/forms/QuadraticForm'
import { FactorForm } from './components/forms/FactorForm'
import { LinearEqForm } from './components/forms/LinearEqForm'
import { IntegralForm } from './components/forms/IntegralForm'
import { CombinatoricsForm } from './components/forms/CombinatoricsForm'
import { BinomialForm } from './components/forms/BinomialForm'
import { SequenceForm } from './components/forms/SequenceForm'

// カテゴリ一覧
const CATEGORIES = [...new Set(MODES.map(m => m.category))]

export default function App() {
  const [activeMode, setActiveMode] = useState<CalcMode>('quadratic')
  const [showGuide, setShowGuide] = useState(false)
  const { compute, cancel, status, result, error } = useCalcWorker()

  const currentMode = MODES.find(m => m.id === activeMode)!

  const handleSubmit = useCallback((params: Record<string, unknown>) => {
    compute({ mode: activeMode, params: params as Record<string, number | string | number[]> })
  }, [activeMode, compute])

  const handleModeChange = (mode: CalcMode) => {
    setActiveMode(mode)
    setShowGuide(false)
    cancel()
  }

  return (
    <div className="app">
      {/* ヘッダ */}
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">
            <span className="title-icon">∑</span>
            二次方程式の解き方
          </h1>
          <p className="app-subtitle">途中式・判別式・グラフつき 無料計算ツール</p>
        </div>
      </header>

      <div className="app-body">
        {/* サイドバー: モード選択 */}
        <aside className="sidebar">
          {CATEGORIES.map(cat => (
            <div key={cat} className="sidebar-category">
              <div className="sidebar-cat-label">{cat}</div>
              {MODES.filter(m => m.category === cat).map(mode => {
                const available = mode.id === 'quadratic'
                return (
                  <button
                    key={mode.id}
                    className={`sidebar-item ${activeMode === mode.id ? 'active' : ''} ${!available ? 'wip' : ''}`}
                    onClick={() => available && handleModeChange(mode.id)}
                    disabled={!available}
                    title={!available ? '準備中' : undefined}
                  >
                    <span className="sidebar-item-label">{mode.label}</span>
                    <span className="sidebar-item-desc">
                      {available ? mode.description : '準備中'}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* メインコンテンツ */}
        <main className="main-content">
          {/* モードタイトル */}
          <div className="mode-header">
            <div className="mode-title-row">
              <h2 className="mode-title">{currentMode.label}</h2>
              {activeMode === 'quadratic' && (
                <button className="guide-btn" onClick={() => setShowGuide(true)} title="解き方を見る">
                  ？
                </button>
              )}
            </div>
            <p className="mode-desc">{currentMode.description}</p>
          </div>

          {/* 入力フォーム */}
          <div className="form-section">
            <FormWrapper
              mode={activeMode}
              onSubmit={handleSubmit}
            />
          </div>

          {/* 計算中・キャンセル */}
          {status === 'computing' && (
            <div className="computing-bar">
              <div className="spinner" />
              <span>計算中...</span>
              <button className="btn-cancel" onClick={cancel}>キャンセル</button>
            </div>
          )}

          {/* エラー表示 */}
          {status === 'error' && error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>エラー</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {status === 'done' && result && (
            <div className="result-section">
              <ResultPanel result={result} />
            </div>
          )}
        </main>
      </div>

      {showGuide && <QuadraticGuide onClose={() => setShowGuide(false)} />}
    </div>
  )
}

// ========== フォームディスパッチャ ==========
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
