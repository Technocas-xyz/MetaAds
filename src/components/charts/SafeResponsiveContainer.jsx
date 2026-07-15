/**
 * SafeResponsiveContainer — wraps Recharts' ResponsiveContainer with a guard
 * against the "width(-1) and height(-1) should be greater than 0" warning.
 *
 * This ensures the container has a minimum size before rendering the chart,
 * preventing the console warning when charts are in hidden/zero-size parents.
 */
import { useState, useRef, useEffect } from 'react'
import { ResponsiveContainer } from 'recharts'

export default function SafeResponsiveContainer({ children, minHeight = 50, ...props }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const { offsetWidth, offsetHeight } = ref.current
    if (offsetWidth > 0 && offsetHeight > 0) {
      setReady(true)
    } else {
      // Use ResizeObserver to wait until it has size
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            setReady(true)
            observer.disconnect()
          }
        }
      })
      observer.observe(ref.current)
      return () => observer.disconnect()
    }
  }, [])

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', minHeight }}>
      {ready && (
        <ResponsiveContainer width="100%" height="100%" {...props}>
          {children}
        </ResponsiveContainer>
      )}
    </div>
  )
}
