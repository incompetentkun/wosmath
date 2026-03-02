// ========== 放物線グラフ (SVG) ==========

import { useState, useEffect } from 'react'
import { KatexBlock } from './Katex'

interface Props {
  a: number
  b: number
  c: number
}

// ---- SVG サイズ定数 ----
const W = 480, H = 320
const M = { t: 20, r: 20, b: 40, l: 52 }
const PW = W - M.l - M.r
const PH = H - M.t - M.b

// ---- 数値ユーティリティ ----
function ev(a: number, b: number, c: number, x: number) {
  return a * x * x + b * x + c
}

function gcdInt(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b)
  if (a === 0) return b || 1
  if (b === 0) return a
  while (b) { const t = b; b = a % b; a = t }
  return a
}

// 整数 p/q を LaTeX の分数に整形（自動約分）
function fracLatex(num: number, den: number): string {
  if (den === 0) return '?'
  if (num === 0) return '0'
  const sign = (num > 0) !== (den > 0) ? '-' : ''
  const n = Math.abs(num), d = Math.abs(den)
  const g = gcdInt(n, d)
  const sn = n / g, sd = d / g
  if (sd === 1) return `${sign}${sn}`
  return `${sign}\\dfrac{${sn}}{${sd}}`
}

// √D の整数係数簡略化: √D = coef * √rad
function simpleSqrtInt(D: number): { coef: number; rad: number } {
  let coef = 1, rad = D
  for (let i = 2; i * i <= rad; i++) {
    while (rad % (i * i) === 0) { rad /= i * i; coef *= i }
  }
  return { coef, rad }
}

// ---- グラフ計算ユーティリティ ----
function niceStep(span: number): number {
  if (span <= 0) return 1
  const rough = span / 5
  const exp = Math.floor(Math.log10(rough))
  const m = rough / 10 ** exp
  const s = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10
  return s * 10 ** exp
}

function computeAutoBounds(a: number, b: number, c: number) {
  const xv = -b / (2 * a)
  const yv = ev(a, b, c, xv)
  const D = b * b - 4 * a * c

  let xLo: number, xHi: number
  if (D >= 0) {
    const sq = Math.sqrt(Math.max(0, D))
    const r1 = (-b - sq) / (2 * a), r2 = (-b + sq) / (2 * a)
    const lo = Math.min(r1, r2), hi = Math.max(r1, r2)
    const span = Math.max(hi - lo, 2)
    xLo = lo - span * 0.4; xHi = hi + span * 0.4
  } else {
    const hw = Math.max(Math.sqrt(Math.abs(D)) / (2 * Math.abs(a)), 2)
    xLo = xv - hw * 1.5; xHi = xv + hw * 1.5
  }

  const ys = [ev(a, b, c, xLo), ev(a, b, c, xHi), yv, 0]
  let yLo = Math.min(...ys), yHi = Math.max(...ys)
  const ySpan = Math.max(yHi - yLo, 1)
  yLo -= ySpan * 0.15; yHi += ySpan * 0.15
  return { xLo, xHi, yLo, yHi }
}

function applyZoom(
  auto: { xLo: number; xHi: number; yLo: number; yHi: number },
  zoom: number
) {
  const xC = (auto.xLo + auto.xHi) / 2, yC = (auto.yLo + auto.yHi) / 2
  const xH = (auto.xHi - auto.xLo) / 2 * zoom
  const yH = (auto.yHi - auto.yLo) / 2 * zoom
  return { xLo: xC - xH, xHi: xC + xH, yLo: yC - yH, yHi: yC + yH }
}

function getTicks(lo: number, hi: number, step: number): number[] {
  const result: number[] = []
  const start = Math.ceil((lo - 1e-9) / step) * step
  for (let v = start; v <= hi + 1e-9; v += step)
    result.push(Math.round(v * 1e9) / 1e9)
  return result
}

// 数値をラベル用に整形
function fmt(n: number): string {
  if (Math.abs(n) < 1e-9) return '0'
  const r = Math.round(n * 10000) / 10000
  return r.toFixed(2).replace(/\.?0+$/, '')
}

// ---- サイドパネル用 LaTeX 計算 ----

// 対称軸の計算ステップ
function buildSymmLines(a: number, b: number): string[] {
  const lines: string[] = ['x = -\\dfrac{b}{2a}']
  if (b === 0) {
    lines.push('= 0')
    return lines
  }
  // 代入ステップ: 符号に注意して表示
  const bDisp = b < 0 ? `(${b})` : String(b)
  const aDisp = a < 0 ? `(${a})` : String(a)
  lines.push(`= -\\dfrac{${bDisp}}{2 \\cdot ${aDisp}}`)
  // 常に計算結果を表示（中間式と見た目が異なるため必須）
  lines.push(`= ${fracLatex(-b, 2 * a)}`)
  return lines
}

// 頂点座標の LaTeX
function buildVertexLine(a: number, b: number, c: number): string {
  const xvLatex = fracLatex(-b, 2 * a)
  // yv = (4ac - b²) / (4a)
  const yvLatex = fracLatex(4 * a * c - b * b, 4 * a)
  return `\\left(\\, ${xvLatex},\\ ${yvLatex} \\,\\right)`
}

// x軸との交点の LaTeX 行リスト（点 (x, 0) 形式）
function buildInterceptLinesClean(a: number, b: number, c: number): string[] {
  const D = b * b - 4 * a * c

  if (D < 0) return [`D = ${D} < 0`, '\\text{実数解なし（交点なし）}']
  if (D === 0) {
    return [`\\left(${fracLatex(-b, 2 * a)},\\ 0\\right) \\text{（接点）}`]
  }

  const { coef, rad } = simpleSqrtInt(D)

  if (rad === 1) {
    // 完全平方: 2点を (r, 0) 形式で表示
    const v1 = (-b - coef) / (2 * a), v2 = (-b + coef) / (2 * a)
    const lo = v1 <= v2 ? fracLatex(-b - coef, 2 * a) : fracLatex(-b + coef, 2 * a)
    const hi = v1 <= v2 ? fracLatex(-b + coef, 2 * a) : fracLatex(-b - coef, 2 * a)
    return [`\\left(${lo},\\ 0\\right) \\quad \\left(${hi},\\ 0\\right)`]
  }

  // 無理数: GCD 約分後に + / - を別々の点として表示
  const negB = -b, twoA = 2 * a
  const g = gcdInt(gcdInt(Math.abs(negB), coef), Math.abs(twoA))
  const sNegB = negB / g, sCoef = coef / g, sDenom = twoA / g

  // (baseNum + signedCoef*√rad) / den を LaTeX 分数に整形（den は正に正規化）
  function fmtSurdFrac(baseNum: number, signedCoef: number, den: number): string {
    let n = baseNum, c = signedCoef, d = den
    if (d < 0) { n = -n; c = -c; d = -d }
    const sqrtPart = Math.abs(c) === 1 ? `\\sqrt{${rad}}` : `${Math.abs(c)}\\sqrt{${rad}}`
    let numStr: string
    if (n === 0)    numStr = c > 0 ? sqrtPart : `-${sqrtPart}`
    else if (c > 0) numStr = `${n} + ${sqrtPart}`
    else            numStr = `${n} - ${sqrtPart}`
    return d === 1 ? numStr : `\\dfrac{${numStr}}{${d}}`
  }

  const rPlusLatex  = fmtSurdFrac(sNegB,  sCoef, sDenom)
  const rMinusLatex = fmtSurdFrac(sNegB, -sCoef, sDenom)
  const vPlus  = (-b + coef * Math.sqrt(rad)) / (2 * a)
  const vMinus = (-b - coef * Math.sqrt(rad)) / (2 * a)
  const [loL, hiL] = vPlus <= vMinus
    ? [rPlusLatex, rMinusLatex]
    : [rMinusLatex, rPlusLatex]
  return [
    `\\left(${loL},\\ 0\\right)`,
    `\\left(${hiL},\\ 0\\right)`,
  ]
}

// SVG に表示する y= 方程式ラベル（プレーンテキスト）
function buildCurveLabel(a: number, b: number, c: number): string {
  let s = 'y = '
  if (a === 1) s += 'x\u00B2'
  else if (a === -1) s += '-x\u00B2'
  else s += `${a}x\u00B2`
  if (b !== 0) {
    if (b === 1) s += ' + x'
    else if (b === -1) s += ' - x'
    else if (b > 0) s += ` + ${b}x`
    else s += ` - ${Math.abs(b)}x`
  }
  if (c !== 0) {
    if (c > 0) s += ` + ${c}`
    else s += ` - ${Math.abs(c)}`
  }
  return s
}

// 頂点を求める平方完成の手順（LaTeX 行リスト）
// y=ax²+bx+c → y=a(x²+(b/a)x)+c → y=a((x+b/2a)²-(b/2a)²)+c → y=a(x+b/2a)²+k
function buildVertexCompletingSquare(a: number, b: number, c: number): string[] {
  if (b === 0) return []

  const lines: string[] = []

  // h' = b/(2a)（括弧内の値）
  const hPrimePos = (b > 0 && a > 0) || (b < 0 && a < 0)  // h' > 0
  const hPrimeSign = hPrimePos ? '+' : '-'
  const hPrimeAbsLatex = fracLatex(Math.abs(b), 2 * Math.abs(a))   // |h'|

  // h'² = b²/(4a²)（括弧内から引く値）
  const h2Latex = fracLatex(b * b, 4 * a * a)

  // k = (4ac−b²)/(4a)（頂点 y 座標）
  const kNum = 4 * a * c - b * b
  const kDen = 4 * a
  const kIsZero = kNum === 0
  const kIsPos  = (kNum > 0 && kDen > 0) || (kNum < 0 && kDen < 0)
  const kAbsLatex = fracLatex(Math.abs(kNum), Math.abs(kDen))
  const kSuffix   = kIsZero ? '' : kIsPos ? ` + ${kAbsLatex}` : ` - ${kAbsLatex}`

  // c の末尾表示
  const cSuffix = c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${Math.abs(c)}`

  if (Math.abs(a) === 1) {
    if (a < 0) {
      // a=−1: y = −(x²∓|b|x) + c
      const innerSign = b < 0 ? '+' : '-'
      lines.push(`y = -\\left(x^2 ${innerSign} ${Math.abs(b)}x\\right)${cSuffix}`)
    }
    const aSign = a < 0 ? '-' : ''
    lines.push(`y = ${aSign}\\left(x ${hPrimeSign} ${hPrimeAbsLatex}\\right)^2${kSuffix}`)
  } else {
    // a≠±1
    const baPos = (b > 0 && a > 0) || (b < 0 && a < 0)
    const baSign     = baPos ? '+' : '-'
    const baAbsLatex = fracLatex(Math.abs(b), Math.abs(a))
    // ステップ1: y = a(x² ± (b/a)x) + c
    lines.push(`y = ${a}\\left(x^2 ${baSign} ${baAbsLatex}x\\right)${cSuffix}`)
    // ステップ2: y = a((x ± h')² − h'²) + c
    lines.push(`y = ${a}\\left(\\left(x ${hPrimeSign} ${hPrimeAbsLatex}\\right)^2 - ${h2Latex}\\right)${cSuffix}`)
    // ステップ3: y = a(x ± h')² + k
    lines.push(`y = ${a}\\left(x ${hPrimeSign} ${hPrimeAbsLatex}\\right)^2${kSuffix}`)
  }

  return lines
}

// 曲線点列を生成
function makeCurvePts(
  fn: (x: number) => number,
  xLo: number, xHi: number,
  px: (x: number) => number,
  py: (y: number) => number,
  N = 280
): string {
  return Array.from({ length: N + 1 }, (_, i) => {
    const x = xLo + (xHi - xLo) * i / N
    return `${px(x).toFixed(1)},${py(fn(x)).toFixed(1)}`
  }).join(' ')
}

// ========== コンポーネント本体 ==========
export function ParabolaGraph({ a, b, c }: Props) {
  const [zoom, setZoom]             = useState(1.0)
  const [showRef, setShowRef]       = useState(false)
  const [showVertexSteps, setShowVertexSteps] = useState(true)
  const [showSymmLines,   setShowSymmLines]   = useState(true)

  useEffect(() => { setZoom(1.0); setShowRef(false); setShowVertexSteps(true); setShowSymmLines(true) }, [a, b, c])

  const auto = computeAutoBounds(a, b, c)
  const { xLo, xHi, yLo, yHi } = applyZoom(auto, zoom)

  const px = (x: number) => M.l + ((x - xLo) / (xHi - xLo)) * PW
  const py = (y: number) => M.t + (1 - (y - yLo) / (yHi - yLo)) * PH

  const xv = -b / (2 * a)
  const yv = ev(a, b, c, xv)
  const D  = b * b - 4 * a * c

  // 実数解
  const roots: number[] = []
  if (D > 1e-9) {
    const sq = Math.sqrt(D)
    roots.push(
      Math.min((-b - sq) / (2 * a), (-b + sq) / (2 * a)),
      Math.max((-b - sq) / (2 * a), (-b + sq) / (2 * a))
    )
  } else if (Math.abs(D) <= 1e-9) {
    roots.push(xv)
  }

  // 曲線点列
  const curvePts = makeCurvePts(x => ev(a, b, c, x), xLo, xHi, px, py)
  const refPts   = showRef ? makeCurvePts(x => x * x, xLo, xHi, px, py) : ''

  // 目盛り
  const xStep  = niceStep(xHi - xLo)
  const yStep  = niceStep(yHi - yLo)
  const xTicks = getTicks(xLo, xHi, xStep)
  const yTicks = getTicks(yLo, yHi, yStep)

  // 軸の表示判定
  const xAxisSvgY = py(0)
  const yAxisSvgX = px(0)
  const showXAxis = xAxisSvgY >= M.t - 1 && xAxisSvgY <= M.t + PH + 1
  const showYAxis = yAxisSvgX >= M.l - 1 && yAxisSvgX <= M.l + PW + 1
  const bothAxes  = showXAxis && showYAxis

  // 頂点ラベル配置
  const vsx = px(xv), vsy = py(yv)
  const vertexIsLow  = vsy > M.t + PH * 0.5
  const vLabelY      = vertexIsLow ? vsy - 9 : vsy + 16
  const vLabelAnchor = vsx > M.l + PW * 0.6 ? 'end' : 'start'
  const vLabelX      = vLabelAnchor === 'end' ? vsx - 8 : vsx + 8

  // ズーム操作
  const zoomIn    = () => setZoom(z => Math.max(0.12, z * (2 / 3)))
  const zoomOut   = () => setZoom(z => Math.min(10,  z * (3 / 2)))
  const zoomReset = () => setZoom(1.0)
  const atDefault = Math.abs(zoom - 1.0) < 0.01

  // y= ラベルの y 座標（右端付近の曲線に近い位置、クランプして枠内に収める）
  const curveLabelY = Math.max(M.t + 14, Math.min(M.t + PH - 8, py(ev(a, b, c, xHi)) + (a > 0 ? -14 : 14)))

  // サイドパネル用 LaTeX
  const symmLines      = buildSymmLines(a, b)
  const vertexLine     = buildVertexLine(a, b, c)
  const interceptLines = buildInterceptLinesClean(a, b, c)
  const vertexSteps    = buildVertexCompletingSquare(a, b, c)

  return (
    <div className="graph-wrap">

      {/* ===== 左: プロットエリア ===== */}
      <div className="graph-plot-area">

        {/* コントロールバー */}
        <div className="graph-controls">
          <div className="graph-ctrl-group">
            <span className="graph-ctrl-label">ズーム</span>
            <button className="graph-ctrl-btn" onClick={zoomOut} title="縮小">−</button>
            <button
              className={`graph-ctrl-btn graph-ctrl-reset ${atDefault ? 'disabled' : ''}`}
              onClick={zoomReset}
              disabled={atDefault}
            >
              リセット
            </button>
            <button className="graph-ctrl-btn" onClick={zoomIn} title="拡大">＋</button>
          </div>
          <button
            className={`graph-ctrl-btn graph-ctrl-toggle ${showRef ? 'active' : ''}`}
            onClick={() => setShowRef(s => !s)}
          >
            y = x² と比較
          </button>
        </div>

        {/* SVG グラフ */}
        <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg">
          <defs>
            <clipPath id="parabola-clip">
              <rect x={M.l} y={M.t} width={PW} height={PH} />
            </clipPath>
          </defs>

          <rect x={M.l} y={M.t} width={PW} height={PH} className="graph-bg" />

          <g clipPath="url(#parabola-clip)">
            {/* グリッド */}
            {xTicks.map(x => <line key={`gx${x}`} x1={px(x)} y1={M.t} x2={px(x)} y2={M.t+PH} className="graph-grid" />)}
            {yTicks.map(y => <line key={`gy${y}`} x1={M.l} y1={py(y)} x2={M.l+PW} y2={py(y)} className="graph-grid" />)}

            {/* 座標軸 */}
            {showXAxis && <line x1={M.l} y1={xAxisSvgY} x2={M.l+PW} y2={xAxisSvgY} className="graph-axis" />}
            {showYAxis && <line x1={yAxisSvgX} y1={M.t} x2={yAxisSvgX} y2={M.t+PH} className="graph-axis" />}

            {/* 対称軸 */}
            <line x1={px(xv)} y1={M.t} x2={px(xv)} y2={M.t+PH} className="graph-symm" />

            {/* 比較曲線 y=x² */}
            {showRef && <polyline points={refPts} className="graph-ref-curve" />}

            {/* 放物線 */}
            <polyline points={curvePts} className="graph-curve" />

            {/* y= ラベル */}
            <text x={M.l+PW-6} y={curveLabelY} textAnchor="end" className="graph-label graph-curve-label">
              {buildCurveLabel(a, b, c)}
            </text>

            {/* 解マーカー */}
            {roots.map((r, i) => <circle key={`r${i}`} cx={px(r)} cy={py(0)} r={5} className="graph-root" />)}

            {/* 頂点マーカー */}
            <circle cx={px(xv)} cy={py(yv)} r={5} className="graph-vertex" />
          </g>

          {/* 目盛りラベル（clipPath 外） */}
          {xTicks.map(x => {
            if (Math.abs(x) < 1e-9 && bothAxes) return null
            return <text key={`tx${x}`} x={px(x)} y={M.t+PH+16} className="graph-tick graph-tick-x">{fmt(x)}</text>
          })}
          {yTicks.map(y => {
            if (Math.abs(y) < 1e-9 && bothAxes) return null
            return <text key={`ty${y}`} x={M.l-6} y={py(y)+4} className="graph-tick graph-tick-y">{fmt(y)}</text>
          })}

          {/* 軸ラベル x, y */}
          {showXAxis && (
            <text x={M.l+PW-14} y={xAxisSvgY-6} className="graph-axis-label">x</text>
          )}
          {showYAxis && (
            <text x={yAxisSvgX+6} y={M.t+12} className="graph-axis-label">y</text>
          )}

          {/* 解のラベル */}
          {roots.map((r, i) => (
            <text key={`rl${i}`} x={px(r)} y={Math.max(py(0)-9, M.t+12)} className="graph-label graph-root-label">
              {fmt(r)}
            </text>
          ))}

          {/* 頂点ラベル */}
          <text x={vLabelX} y={vLabelY} textAnchor={vLabelAnchor} className="graph-label graph-vertex-label">
            ({fmt(xv)}, {fmt(yv)})
          </text>

          {/* 比較曲線ラベル */}
          {showRef && (
            <text x={M.l+PW-4} y={M.t+14} textAnchor="end" className="graph-ref-label">y = x²</text>
          )}

          <rect x={M.l} y={M.t} width={PW} height={PH} fill="none" className="graph-border" />
        </svg>

        {/* 凡例 */}
        <div className="graph-legend">
          <span className="graph-legend-item graph-legend-root">● 解（x軸との交点）</span>
          <span className="graph-legend-item graph-legend-vertex">● 頂点</span>
          <span className="graph-legend-item graph-legend-symm">╌ 対称軸</span>
          {showRef && <span className="graph-legend-item graph-legend-ref">— y = x²</span>}
          {D < 0 && <span className="graph-legend-note">（実数解なし・x 軸と交わらない）</span>}
        </div>
      </div>

      {/* ===== 右: サイドパネル ===== */}
      <div className="graph-info">

        {/* 対称軸 */}
        <div className="graph-info-section">
          <div
            className="graph-info-heading"
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => setShowSymmLines(s => !s)}
          >
            <span>対称軸</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{showSymmLines ? '▲' : '▼'}</span>
          </div>
          {showSymmLines && symmLines.map((line, i) => (
            <div key={i} className="graph-info-line">
              <KatexBlock latex={line} />
            </div>
          ))}
        </div>

        {/* 頂点 */}
        <div className="graph-info-section">
          <div className="graph-info-heading">頂点</div>
          <div className="graph-info-line">
            <KatexBlock latex={vertexLine} />
          </div>
        </div>

        {/* 平方完成（頂点導出） */}
        {vertexSteps.length > 0 && (
          <div className="graph-info-section">
            <div
              className="graph-info-heading"
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setShowVertexSteps(s => !s)}
            >
              <span>平方完成</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{showVertexSteps ? '▲' : '▼'}</span>
            </div>
            {showVertexSteps && vertexSteps.map((line, i) => (
              <div key={i} className="graph-info-line">
                <KatexBlock latex={line} />
              </div>
            ))}
          </div>
        )}

        {/* x軸との交点 */}
        <div className="graph-info-section">
          <div className="graph-info-heading">x 軸との交点</div>
          {interceptLines.map((line, i) => (
            <div key={i} className="graph-info-line">
              <KatexBlock latex={line} />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
