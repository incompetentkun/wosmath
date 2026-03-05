// ========== WebWorker: 計算エンジンのエントリポイント ==========

import type { WorkerRequest, WorkerResponse } from '../types'
import { solveQuadratic } from '../engines/algebra/quadratic'
import { solveFactorExpand, factorQuadratic, factorCubic } from '../engines/algebra/factor'
import { solveLinearEq } from '../engines/algebra/linear_eq'
import { solveIntegral } from '../engines/calculus/integral'
import { solveCombinatorics } from '../engines/probability/combinatorics'
import { solveBinomial } from '../engines/probability/binomial'
import { solveSequence } from '../engines/sequences/index'

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, mode, params } = event.data
  try {
    let result

    switch (mode) {
      case 'quadratic':
        result = solveQuadratic(params as { a: number; b: number; c: number })
        break
      case 'factor': {
        const fp = params as { a?: number; b?: number; c?: number; d?: number; degree?: number; expression?: string; mode: 'factor' | 'expand' }
        if (fp.a !== undefined) {
          if (fp.degree === 3) {
            result = factorCubic(BigInt(fp.a), BigInt(fp.b ?? 0), BigInt(fp.c ?? 0), BigInt(fp.d ?? 0))
          } else {
            result = factorQuadratic(BigInt(fp.a), BigInt(fp.b ?? 0), BigInt(fp.c ?? 0))
          }
        } else {
          result = solveFactorExpand(fp as { expression: string; mode: 'factor' | 'expand' })
        }
        break
      }
      case 'linear_eq':
        result = solveLinearEq(params as unknown as { coefficients: number[][] })
        break
      case 'integral':
        result = solveIntegral(params as { coeffs: number[]; lower: number; upper: number })
        break
      case 'combinatorics':
        result = solveCombinatorics(params as {
          n: number; r: number
          type: 'permutation' | 'combination' | 'repetition_permutation' | 'repetition_combination'
        })
        break
      case 'binomial':
        result = solveBinomial(params as {
          n: number; p: number; k: number
          queryType: 'exact' | 'leq' | 'geq'
        })
        break
      case 'sequence':
        result = solveSequence(params as unknown as Parameters<typeof solveSequence>[0])
        break
      default:
        throw new Error(`未対応のモード: ${mode}`)
    }

    const response: WorkerResponse = { id, result }
    self.postMessage(response)
  } catch (e) {
    const response: WorkerResponse = {
      id,
      error: e instanceof Error ? e.message : String(e),
    }
    self.postMessage(response)
  }
}
