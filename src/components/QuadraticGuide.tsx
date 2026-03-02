// ========== 二次方程式 解説モーダル ==========

import { useEffect } from 'react'
import { KatexBlock } from './Katex'

interface Props {
  onClose: () => void
}

export function QuadraticGuide({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">二次方程式の解き方</h3>
          <button className="modal-close" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <div className="modal-body">

          {/* 基本形 */}
          <section className="guide-section">
            <h4 className="guide-heading">基本形</h4>
            <KatexBlock latex="ax^2 + bx + c = 0 \quad (a \neq 0)" />
            <p className="guide-text">係数 a, b, c は実数。a が 0 だと二次方程式ではなくなるので a ≠ 0 が必要。</p>
          </section>

          {/* 判別式 */}
          <section className="guide-section">
            <h4 className="guide-heading">判別式 D — 解の個数を判定する</h4>
            <KatexBlock latex="D = b^2 - 4ac" />
            <ul className="guide-list">
              <li><span className="guide-badge pos">D &gt; 0</span> 異なる 2 つの実数解</li>
              <li><span className="guide-badge zero">D = 0</span> 重解（同じ実数解が 1 つ）</li>
              <li><span className="guide-badge neg">D &lt; 0</span> 異なる 2 つの虚数解</li>
            </ul>
            <p className="guide-note">b が偶数（b = 2b'）のときは D/4 が使えて計算が楽：</p>
            <KatexBlock latex="\dfrac{D}{4} = b'^2 - ac \qquad \left(b' = \dfrac{b}{2}\right)" />
          </section>

          {/* 解法1: 因数分解 */}
          <section className="guide-section">
            <h4 className="guide-heading">解法①　因数分解</h4>
            <KatexBlock latex="ax^2 + bx + c \;=\; a(x - \alpha)(x - \beta) = 0" />
            <p className="guide-text">ゼロ積の原理より x = α または x = β。</p>
            <p className="guide-note">D が完全平方数（0, 1, 4, 9, …）のとき整数係数で因数分解できる。複雑な係数にはたすき掛けを使う。</p>
          </section>

          {/* 解法2: 解の公式 */}
          <section className="guide-section">
            <h4 className="guide-heading">解法②　解の公式</h4>
            <KatexBlock latex="x = \dfrac{-b \pm \sqrt{b^2 - 4ac}}{2a}" />
            <p className="guide-note">b が偶数（b = 2b'）のときは分子分母の 2 が消えて簡略化できる：</p>
            <KatexBlock latex="x = \dfrac{-b' \pm \sqrt{b'^2 - ac}}{a} \qquad \left(b' = \dfrac{b}{2}\right)" />
            <p className="guide-text">どちらの公式でも同じ答えになる。b が偶数なら簡略版のほうが計算が速い。</p>
          </section>

          {/* 解法3: 平方完成 */}
          <section className="guide-section">
            <h4 className="guide-heading">解法③　平方完成</h4>
            <KatexBlock latex="\left(x + \dfrac{b}{2a}\right)^2 = \dfrac{b^2 - 4ac}{4a^2} = \dfrac{D}{4a^2}" />
            <KatexBlock latex="x = -\dfrac{b}{2a} \pm \sqrt{\dfrac{D}{4a^2}}" />
            <p className="guide-note">重解かどうかを見抜きやすく、虚数解も自然に求まる。解の公式の導出にも使う。</p>
          </section>

          {/* 解と係数の関係 */}
          <section className="guide-section">
            <h4 className="guide-heading">解と係数の関係（ヴィエタの公式）</h4>
            <KatexBlock latex="\alpha + \beta = -\dfrac{b}{a}, \qquad \alpha\beta = \dfrac{c}{a}" />
            <p className="guide-text">解 α, β を実際に求めなくても和と積だけが分かる。D &lt; 0 の虚数解のときも成り立つ。</p>
          </section>

        </div>
      </div>
    </div>
  )
}
