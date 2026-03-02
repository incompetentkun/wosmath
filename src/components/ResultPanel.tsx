// ========== 結果表示パネル ==========

import { useState } from 'react'
import type { CalcResult } from '../types'
import { KatexBlock } from './Katex'
import { ParabolaGraph } from './ParabolaGraph'

type Tab = 'answer' | 'steps' | 'steps_detail' | 'discriminant' | 'verify' | 'altforms' | 'graph'

interface ResultPanelProps {
  result: CalcResult
}

export function ResultPanel({ result }: ResultPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('answer')

  const hasDetail = !!result.stepsDetailLatex?.length
  const hasDisc   = !!result.discriminantLatex?.length
  const hasGraph  = !!result.parabola

  const tabs: { id: Tab; label: string; count?: number; hidden?: boolean }[] = [
    { id: 'answer',        label: '答え' },
    { id: 'steps',         label: '途中式',          count: result.stepsLatex.length },
    { id: 'steps_detail',  label: '途中式（詳細）',  count: result.stepsDetailLatex?.length, hidden: !hasDetail },
    { id: 'discriminant',  label: '判別式',           count: result.discriminantLatex?.length, hidden: !hasDisc },
    { id: 'verify',        label: '検算',             count: result.verify.checks.length },
    { id: 'altforms',      label: '別表現',           count: result.altForms.length },
    { id: 'graph',         label: 'グラフ',           hidden: !hasGraph },
  ]

  const visibleTabs = tabs.filter(t => !t.hidden)

  return (
    <div className="result-panel">
      {/* タブヘッダ */}
      <div className="tab-bar">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="tab-badge">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {activeTab === 'answer' && (
          <div className="answer-tab">
            <div className="answer-box">
              <KatexBlock latex={result.answerLatex} />
            </div>
          </div>
        )}

        {activeTab === 'steps' && (
          <StepsList steps={result.stepsLatex} />
        )}

        {activeTab === 'steps_detail' && (
          <StepsList steps={result.stepsDetailLatex ?? []} />
        )}

        {activeTab === 'discriminant' && (
          <StepsList steps={result.discriminantLatex ?? []} />
        )}

        {activeTab === 'verify' && (
          <div className="verify-tab">
            <div className={`verify-badge ${result.verify.ok ? 'ok' : 'ng'}`}>
              {result.verify.ok ? '✓ 検算OK' : '✗ 要確認'}
            </div>
            {result.verify.checks.map((check, i) => (
              <div key={i} className="verify-item">
                <KatexBlock latex={check} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'altforms' && (
          <div className="altforms-tab">
            {result.altForms.length === 0 ? (
              <p className="empty-msg">別表現はありません</p>
            ) : (
              result.altForms.map((alt, i) => (
                <div key={i} className="alt-item">
                  <span className="alt-label">{alt.label}</span>
                  <KatexBlock latex={alt.latex} />
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'graph' && result.parabola && (
          <div className="graph-tab">
            <ParabolaGraph
              a={result.parabola.a}
              b={result.parabola.b}
              c={result.parabola.c}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StepsList({ steps }: { steps: string[] }) {
  return (
    <div className="steps-tab">
      {steps.length === 0 ? (
        <p className="empty-msg">途中式はありません</p>
      ) : (
        <ol className="steps-list">
          {steps.map((step, i) => (
            <li key={i} className="step-item">
              <KatexBlock latex={step} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
