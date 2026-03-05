// ========== Result型 ==========
export interface CalcResult {
  answerLatex: string
  stepsLatex: string[]           // 最短途中式（テスト的に解ける最小手順）
  stepsDetailLatex?: string[]   // 詳細途中式（判別式・公式適用など）
  discriminantLatex?: string[]  // 判別式タブ（二次方程式のみ）
  verify: { ok: boolean; checks: string[] }
  altForms: { label: string; latex: string }[]
  parabola?: { a: number; b: number; c: number }  // グラフタブ（二次方程式のみ）
}

// ========== WebWorker メッセージ ==========
export type CalcMode =
  | 'quadratic'       // 二次方程式
  | 'factor'          // 因数分解/展開
  | 'integral'        // 定積分
  | 'combinatorics'   // 順列・組合せ
  | 'binomial'        // 二項分布
  | 'sequence'        // 数列
  | 'linear_eq'       // 連立一次方程式

export interface WorkerRequest {
  id: string
  mode: CalcMode
  params: Record<string, number | string | number[]>
}

export interface WorkerResponse {
  id: string
  result?: CalcResult
  error?: string
}

// ========== モード定義 ==========
export interface ModeInfo {
  id: CalcMode
  slug: string
  label: string
  category: string
  description: string
}

export const MODES: ModeInfo[] = [
  { id: 'quadratic',     slug: 'quadratic',     category: '代数', label: '二次方程式',       description: 'ax²+bx+c=0 を解く' },
  { id: 'factor',        slug: 'factorization',  category: '代数', label: '因数分解',         description: '多項式の因数分解' },
  { id: 'linear_eq',     slug: 'linear-eq',      category: '代数', label: '連立一次方程式',   description: '2元・3元連立方程式' },
  { id: 'integral',      slug: 'integral',       category: '微積', label: '定積分',           description: '多項式の定積分を計算' },
  { id: 'combinatorics', slug: 'combinatorics',  category: '確率', label: '順列・組合せ',     description: 'nPr / nCr の計算' },
  { id: 'binomial',      slug: 'binomial',       category: '確率', label: '二項分布',         description: 'P(X=k) の計算' },
  { id: 'sequence',      slug: 'sequence',       category: '数列', label: '数列',             description: '等差・等比数列と和' },
]
