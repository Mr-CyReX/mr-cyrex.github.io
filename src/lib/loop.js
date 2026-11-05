import { useEffect, useRef } from 'react'

export const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Runs `tick(now, dt)` every frame while `ref` is on screen and the tab is visible.
export function useLoop(ref, tick, deps = []) {
  const tickRef = useRef(tick)
  tickRef.current = tick
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    let last = 0
    let visible = false
    const frame = (t) => {
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 1 / 60)
      last = t
      tickRef.current(t / 1000, dt)
      raf = requestAnimationFrame(frame)
    }
    const sync = () => {
      const run = visible && !document.hidden
      if (run && !raf) {
        last = 0
        raf = requestAnimationFrame(frame)
      } else if (!run && raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      sync()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    tickRef.current(performance.now() / 1000, 0)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t

export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const sx = (t) => ((ax * t + bx) * t + cx) * t
  const sy = (t) => ((ay * t + by) * t + cy) * t
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    let t = x
    for (let i = 0; i < 6; i++) {
      const d = dx(t)
      if (Math.abs(d) < 1e-6) break
      t -= (sx(t) - x) / d
    }
    return sy(clamp(t))
  }
}
export const easeInOut = cubicBezier(0.77, 0, 0.175, 1)
export const easeOut = cubicBezier(0.16, 1, 0.3, 1)
