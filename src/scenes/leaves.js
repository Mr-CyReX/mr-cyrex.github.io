import { gust, hexA } from '../lib/canvas.js'

const TONES = ['#8dff78', '#6fd06a', '#4fa86a', '#b8f0a0', '#e8c46a']

// Leaves riding the wind under a big tree. Each one flips as it tumbles,
// lags behind the gust it rides, and is drawn with ghost frames behind it,
// the way hand-drawn animation shows speed.
export function createLeaves({ reduce }) {
  let w = 0
  let h = 0
  let leaves = []
  let canopy = []
  let wind = 0
  let ptr = { x: -9999, y: -9999, vx: 0, vy: 0 }

  function spawn(l, anywhere) {
    l.x = anywhere ? Math.random() * w : -30 - Math.random() * 120
    l.y = anywhere ? Math.random() * h : h * (0.05 + Math.random() * 0.55)
    l.vx = 20 + Math.random() * 30
    l.vy = 0
    l.spin = Math.random() * Math.PI * 2
    l.spinV = (Math.random() - 0.5) * 4
    l.flip = Math.random() * Math.PI * 2
    l.flipV = 2 + Math.random() * 3
    l.size = 7 + Math.random() * 9
    l.tone = TONES[Math.floor(Math.random() * TONES.length)]
    l.ghosts = []
  }

  function leafPath(ctx, s) {
    ctx.beginPath()
    ctx.moveTo(-s, 0)
    ctx.quadraticCurveTo(0, -s * 0.62, s, 0)
    ctx.quadraticCurveTo(0, s * 0.62, -s, 0)
    ctx.closePath()
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      const n = Math.round(Math.min(46, 18 + w / 26))
      leaves = Array.from({ length: n }, () => {
        const l = {}
        spawn(l, true)
        return l
      })
      const cx = w * 0.82
      const cy = h * 0.3
      canopy = Array.from({ length: 16 }, () => [
        cx + (Math.random() - 0.4) * w * 0.32,
        cy + (Math.random() - 0.5) * h * 0.32,
        Math.min(w, h) * (0.08 + Math.random() * 0.1),
      ])
    },
    pointer(x, y, dx, dy) {
      ptr.x = x
      ptr.y = y
      ptr.vx += dx * 10
      ptr.vy += dy * 10
    },
    leave() {
      ptr.x = ptr.y = -9999
    },
    frame(ctx, dt, now) {
      const g = gust(now)
      const base = (36 + Math.sin(now * 0.4) * 18 + Math.abs(g) * 140) * (reduce ? 0.4 : 1)
      wind += (base - wind) * Math.min(1, dt * 1.5)
      ptr.vx *= Math.pow(0.02, dt)
      ptr.vy *= Math.pow(0.02, dt)

      ctx.fillStyle = '#05080c'
      ctx.fillRect(0, 0, w, h)
      const sky = ctx.createRadialGradient(w * 0.7, h * 0.15, 0, w * 0.7, h * 0.15, w * 0.8)
      sky.addColorStop(0, 'rgba(105,200,255,0.10)')
      sky.addColorStop(1, 'rgba(105,200,255,0)')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      // the tree, breathing slightly with the wind
      const sway = Math.sin(now * 0.9) * 3 + wind * 0.02
      ctx.fillStyle = '#0b1612'
      ctx.fillRect(w * 0.8 - 7 + sway * 0.2, h * 0.36, 14, h * 0.7)
      for (const [x, y, r] of canopy) {
        ctx.beginPath()
        ctx.arc(x + sway * (1 - y / h), y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#08110e'
      ctx.beginPath()
      ctx.ellipse(w * 0.5, h * 1.02, w * 0.75, h * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()

      for (const l of leaves) {
        // wind, a little lift that follows the flip, gravity, and the pointer's gust
        let ax = (wind - l.vx) * 1.4
        let ay = 24 - Math.sin(l.flip) * 46 - l.vy * 0.9
        const dx = l.x - ptr.x
        const dy = l.y - ptr.y
        const d = Math.hypot(dx, dy)
        if (d < 140) {
          const f = (1 - d / 140) * (reduce ? 0.3 : 1)
          ax += ptr.vx * f * 2 + (dx / (d || 1)) * 260 * f
          ay += ptr.vy * f * 2 + (dy / (d || 1)) * 260 * f
        }
        l.vx += ax * dt
        l.vy += ay * dt
        l.x += l.vx * dt
        l.y += l.vy * dt
        l.flip += l.flipV * dt * (0.6 + Math.min(1.5, Math.hypot(l.vx, l.vy) / 120))
        l.spin += (l.spinV + l.vy * 0.004) * dt

        l.ghosts.push({ x: l.x, y: l.y, spin: l.spin, flip: l.flip })
        const keep = reduce ? 1 : 5
        while (l.ghosts.length > keep) l.ghosts.shift()

        const speed = Math.hypot(l.vx, l.vy)
        l.ghosts.forEach((gh, i) => {
          const isHead = i === l.ghosts.length - 1
          const a = isHead ? 1 : (i / l.ghosts.length) * Math.min(0.35, speed / 600)
          if (a < 0.02) return
          ctx.save()
          ctx.translate(gh.x, gh.y)
          ctx.rotate(gh.spin)
          ctx.scale(Math.max(0.12, Math.abs(Math.cos(gh.flip))), 1)
          leafPath(ctx, l.size)
          ctx.fillStyle = hexA(l.tone, a * (Math.cos(gh.flip) > 0 ? 0.95 : 0.6))
          ctx.fill()
          ctx.restore()
        })

        if (l.x > w + 40 || l.y > h + 40 || l.y < -80) spawn(l, false)
      }
    },
  }
}
