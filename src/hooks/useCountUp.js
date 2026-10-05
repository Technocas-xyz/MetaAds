import { useEffect, useRef, useState } from 'react'

/**
 * Animate a number from its previous value to `target`.
 * Returns the target immediately when reduced motion is requested.
 */
export default function useCountUp(target, duration = 600) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(0)

  useEffect(() => {
    if (typeof target !== 'number' || !Number.isFinite(target)) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const from = fromRef.current
    if (reduce || from === target || typeof window.requestAnimationFrame !== 'function') {
      fromRef.current = target
      setValue(target)
      return undefined
    }
    const start = window.performance.now()
    let frame
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) frame = window.requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [target, duration])

  if (typeof target !== 'number') return target
  return Number.isInteger(target) ? Math.round(value) : Math.round(value * 10) / 10
}
