import { glow, gust, streak } from '../lib/canvas.js'

// Deep red and blue with little green in either, so where they overlap the
// added light comes out purple instead of white.
const RED = '#ff3b5c'
const BLUE = '#3d6bff'

// Red comes in from one side, blue from the other. Both spiral into the same
// orbit around the system in opposite directions, and only where they cross
// does the light add up to purple.
export function createStreams({ reduce }) {
  let w = 0
  let h = 0
  let core = { x: 0, y: 0, r: 0 }
  let parts = []

  function spawn(p, initial) {
    const left = p.side === 'red'
    p.target = core.r * (1.25 + Math.random() * 0.9)
    if (initial) {
      // start already in orbit, spread all the way round
      p.theta = Math.random() * Math.PI * 2
      p.r = p.target * (1 + Math.random() * 0.6)
    } else {
      p.theta = (left ? Math.PI : 0) + (Math.random() - 0.5) * 1.6
      p.r = Math.max(w, h) * (0.6 + Math.random() * 0.25)
    }
    p.life = 2.5 + Math.random() * 3.5
    p.age = initial ? Math.random() * 5 : 0
    p.alpha = 0
    p.dir = left ? 1 : -1
    p.wob = Math.random() * Math.PI * 2
    place(p)
    p.px = p.x
    p.py = p.y
  }

  function place(p) {
    p.x = core.x + Math.cos(p.theta) * p.r
    p.y = core.y + Math.sin(p.theta) * p.r * 0.62
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      core = { x: w * 0.5, y: h * 0.5, r: Math.min(w, h) * 0.2 }
      const n = Math.round(Math.min(80, 28 + w / 14))
      parts = Array.from({ length: n * 2 }, (_, i) => {
        const p = { side: i % 2 ? 'red' : 'blue' }
        spawn(p, true)
        return p
      })
    },
    frame(ctx, dt, now) {
      const g = Math.abs(gust(now))
      ctx.fillStyle = '#05080c'
      ctx.fillRect(0, 0, w, h)

      // the system being attacked and defended
      ctx.strokeStyle = '#303943'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.ellipse(core.x, core.y, core.r * 0.55, core.r * 0.55, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#0a1016'
      ctx.beginPath()
      ctx.ellipse(core.x, core.y, core.r * 0.42, core.r * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalCompositeOperation = 'lighter'
      const speedUp = (reduce ? 0.5 : 1) * (1 + Math.min(2, g * 0.6))
      for (const p of parts) {
        p.px = p.x
        p.py = p.y
        p.age += dt
        const k = Math.min(1, dt * (0.9 + (p.r > p.target * 1.5 ? 0.4 : 1.2)))
        p.r += (p.target - p.r) * k * speedUp
        // angular speed rises as the orbit tightens, like water down a drain
        const omega = (0.5 + (core.r * 1.6) / Math.max(p.r, 1)) * p.dir * speedUp
        p.theta += omega * dt
        place(p)
        p.y += Math.sin(now * 2 + p.wob) * 2
        const fadeIn = Math.min(1, p.age / 0.6)
        const fadeOut = Math.max(0, 1 - Math.max(0, p.age - p.life) / 0.8)
        p.alpha = fadeIn * fadeOut
        if (p.age > p.life + 0.8) spawn(p, false)

        const color = p.side === 'red' ? RED : BLUE
        const dx = p.x - p.px
        const dy = p.y - p.py
        const len = Math.hypot(dx, dy)
        const stretch = Math.min(26, len * 2.4 + 1)
        const ux = len ? dx / len : 0
        const uy = len ? dy / len : 0
        streak(ctx, p.x - ux * stretch, p.y - uy * stretch, p.x, p.y, color, 2.4, 0.4 * p.alpha)
        ctx.globalAlpha = 0.32 * p.alpha
        ctx.drawImage(glow(color, 48), p.x - 11, p.y - 11, 22, 22)
        ctx.globalAlpha = 1
      }
      ctx.globalCompositeOperation = 'source-over'

      ctx.fillStyle = '#f4f6f8'
      ctx.beginPath()
      ctx.arc(core.x, core.y, 3, 0, Math.PI * 2)
      ctx.fill()
    },
  }
}
