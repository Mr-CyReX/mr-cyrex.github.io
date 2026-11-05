// Shared plumbing for the canvas scenes: sizing, a frame loop that only runs
// while the canvas is on screen, pointer wind, and scroll velocity as a gust.

let scrollGust = 0
let lastY = typeof window !== 'undefined' ? window.scrollY : 0
let lastT = typeof performance !== 'undefined' ? performance.now() : 0
let gustStamp = 0

if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      const t = performance.now()
      const dt = Math.max(16, t - lastT)
      const v = (window.scrollY - lastY) / dt // px per ms
      scrollGust += (Math.max(-6, Math.min(6, v)) - scrollGust) * 0.35
      lastY = window.scrollY
      lastT = t
    },
    { passive: true },
  )
}

// Scroll speed in px/ms, easing back to calm. Safe to call from several scenes per frame.
export function gust(now) {
  if (now !== gustStamp) {
    scrollGust *= 0.93
    gustStamp = now
  }
  return scrollGust
}

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const spriteCache = new Map()
// A soft round glow, pre-rendered once per colour, drawn with 'lighter' blending.
export function glow(color, size = 64) {
  const key = color + size
  if (spriteCache.has(key)) return spriteCache.get(key)
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const r = size / 2
  const grad = g.createRadialGradient(r, r, 0, r, r, r)
  grad.addColorStop(0, color)
  grad.addColorStop(0.18, color)
  grad.addColorStop(0.42, hexA(color, 0.28))
  grad.addColorStop(1, hexA(color, 0))
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  spriteCache.set(key, c)
  return c
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Draws a moving light as a streak from where it was to where it is: a cheap,
// honest motion blur whose length follows speed.
export function streak(ctx, x0, y0, x1, y1, color, width, alpha = 1) {
  ctx.strokeStyle = hexA(color, alpha)
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

// cubic-bezier(x1,y1,x2,y2) as an easing function.
export function bezier(x1, y1, x2, y2) {
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
    return sy(Math.min(1, Math.max(0, t)))
  }
}

export const easeInOut = bezier(0.77, 0, 0.175, 1)
export const easeOut = bezier(0.23, 1, 0.32, 1)

// Mounts a scene on a canvas. The scene gets resize(w, h), frame(ctx, dt, now)
// and optionally pointer(x, y, dx, dy) and leave().
export function mountScene(canvas, scene) {
  const ctx = canvas.getContext('2d')
  let w = 0
  let h = 0
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    if (!r.width || !r.height) return
    const dpr = Math.min(window.devicePixelRatio || 1, r.width < 700 ? 1.5 : 2)
    w = r.width
    h = r.height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    scene.resize(w, h)
    scene.frame(ctx, 1 / 60, performance.now() / 1000)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  let raf = 0
  let visible = false
  let last = 0
  const tick = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    scene.frame(ctx, dt, t / 1000)
    raf = requestAnimationFrame(tick)
  }
  const sync = () => {
    const run = visible && !document.hidden
    if (run && !raf) {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    } else if (!run && raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
  }
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting
      sync()
    },
    { rootMargin: '120px' },
  )
  io.observe(canvas)
  document.addEventListener('visibilitychange', sync)

  const host = canvas.parentElement
  let px = null
  let py = null
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    scene.pointer?.(x, y, px === null ? 0 : x - px, py === null ? 0 : y - py)
    px = x
    py = y
  }
  const onLeave = () => {
    px = py = null
    scene.leave?.()
  }
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', sync)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerleave', onLeave)
  }
}
