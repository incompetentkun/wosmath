// ========== WebWorker通信フック ==========

import { useRef, useState, useCallback } from 'react'
import type { WorkerRequest, WorkerResponse, CalcResult } from '../types'

export type CalcStatus = 'idle' | 'computing' | 'done' | 'error'

export function useCalcWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus] = useState<CalcStatus>('idle')
  const [result, setResult] = useState<CalcResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const compute = useCallback((request: Omit<WorkerRequest, 'id'>) => {
    // 前のWorkerがあればキャンセル
    if (workerRef.current) {
      workerRef.current.terminate()
    }

    setStatus('computing')
    setResult(null)
    setError(null)

    const worker = new Worker(new URL('../workers/calc.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    const id = Math.random().toString(36).slice(2)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return
      if (event.data.error) {
        setError(event.data.error)
        setStatus('error')
      } else if (event.data.result) {
        setResult(event.data.result)
        setStatus('done')
      }
      worker.terminate()
      workerRef.current = null
    }

    worker.onerror = (e) => {
      setError(`内部エラーが発生しました: ${e.message}`)
      setStatus('error')
      worker.terminate()
      workerRef.current = null
    }

    const msg: WorkerRequest = { ...request, id }
    worker.postMessage(msg)
  }, [])

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
      setStatus('idle')
    }
  }, [])

  return { compute, cancel, status, result, error }
}
