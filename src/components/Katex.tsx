// ========== KaTeX レンダラーコンポーネント ==========

import { useEffect, useRef } from 'react'
import katex from 'katex'

interface KatexProps {
  latex: string
  display?: boolean
  className?: string
}

export function Katex({ latex, display = false, className }: KatexProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    try {
      katex.render(latex, ref.current, {
        displayMode: display,
        throwOnError: false,
        errorColor: '#e74c3c',
        fleqn: false,
      })
    } catch {
      if (ref.current) ref.current.textContent = latex
    }
  }, [latex, display])

  return <span ref={ref} className={className} />
}

// ブロック表示（中央寄せ）
export function KatexBlock({ latex, className }: { latex: string; className?: string }) {
  return (
    <div className={`katex-block ${className ?? ''}`}>
      <Katex latex={latex} display />
    </div>
  )
}
