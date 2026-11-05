import { glow, gust, hexA, streak } from '../../lib/canvas.js'

// A night field: layered hills, slow clouds, grass that leans with the wind,
// and fireflies that smear as they speed up. Scroll speed and pointer movement
// both push the wind.
export function createMeadow({ reduce }) {
  let w = 0
  let h = 0
  let blades = []
  let flies = []
  let clouds = []
  let stars = []
  let windX = 0 // smoothed wind, px/s
  let ptr = { x: -9999, y: -9999, push: 0 }
  const calm = reduce ? 0.35 : 1

  function build() {
    const horizon = h * 0.72
    const count = Math.min(520, Math.round(w / 2.6))
    blades = Array.from({ length: count }, (_, i) => {
      const depth = Math.random()
      return {
        x: (i / count) * (w + 40) - 20 + Math.random() * 6,
        y: horizon + 18 + depth * (h - horizon - 6),
        len: 26 + depth * 58 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        stiff: 0.6 + Math.random() * 0.6,
        depth,
        bend: 0,
      }
    }).sort((a, b) => a.depth - b.depth)

    const flyCount = Math.round(Math.min(34, 14 + w / 60))
    flies = Array.from({ length: flyCount }, () => {
      const x = Math.random() * w
      const y = horizon - 40 + Math.random() * (h - horizon)
      return {
        x, y, px: x, py: y,
        seed: Math.random() * 100,
        speed: 14 + Math.random() * 26,
        color: Math.random() < 0.62 ? '#8dff78' : '#69c8ff',
        size: 1.4 + Math.random() * 1.4,
        pulse: Math.random() * Math.PI * 2,
      }
    })

    clouds = Array.from({ length: 6 }, (_, i) => ({
      x: (i / 6) * w * 1.3 - w * 0.15,
      y: h * (0.12 + Math.random() * 0.32),
      s: 0.7 + Math.random() * 0.8,
      v: 3 + Math.random() * 5,
      lobes: Array.from({ length: 6 }, () => [
        (Math.random() - 0.5) * 220,
        (Math.random() - 0.5) * 36,
        60 + Math.random() * 70,
      ]),
    }))

    stars = Array.from({ length: Math.round(w / 9) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.6,
      r: Math.random() * 1.1 + 0.2,
      tw: Math.random() * Math.PI * 2,
    }))
  }

  function hill(ctx, base, amp, freq, offset, color) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w + 20; x += 20) {
      const y =
        base +
        Math.sin(x * freq + offset) * amp +
        Math.sin(x * freq * 2.3 + offset * 1.7) * amp * 0.35
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      build()
    },
    pointer(x, y, dx) {
      ptr.x = x
      ptr.y = y
      ptr.push += dx * 6
    },
    leave() {
      ptr.x = ptr.y = -9999
    },
    frame(ctx, dt, now) {
      const g = gust(now)
      const target = (12 + g * 160 + ptr.push) * calm
      windX += (target - windX) * Math.min(1, dt * 2.2)
      ptr.push *= Math.pow(0.04, dt)
      const horizon = h * 0.72

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, horizon)
      sky.addColorStop(0, '#020305')
      sky.addColorStop(0.65, '#06101a')
      sky.addColorStop(1, '#0b1a28')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      // moon glow, low and to the right
      const mx = w * 0.78
      const my = h * 0.22
      const moon = ctx.createRadialGradient(mx, my, 0, mx, my, Math.max(w, h) * 0.45)
      moon.addColorStop(0, 'rgba(160,215,255,0.22)')
      moon.addColorStop(0.08, 'rgba(120,190,240,0.09)')
      moon.addColorStop(1, 'rgba(105,200,255,0)')
      ctx.fillStyle = moon
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(236,246,255,0.92)'
      ctx.beginPath()
      ctx.arc(mx, my, Math.min(w, h) * 0.035, 0, Math.PI * 2)
      ctx.fill()

      for (const s of stars) {
        const a = 0.35 + Math.sin(now * 0.8 + s.tw) * 0.25 * calm
        ctx.fillStyle = `rgba(220,235,255,${a})`
        ctx.fillRect(s.x, s.y, s.r, s.r)
      }

      // clouds: overlapping soft lobes, drifting with the wind
      for (const c of clouds) {
        c.x += (c.v + windX * 0.06) * dt
        if (c.x > w + 260) c.x = -260
        if (c.x < -280) c.x = w + 240
        // squashed vertically into long, flat banks, lit a little on top
        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.scale(1, 0.38)
        for (const [ox, oy, r] of c.lobes) {
          const rr = r * c.s
          const cg = ctx.createRadialGradient(ox, oy - rr * 0.25, 0, ox, oy, rr)
          cg.addColorStop(0, 'rgba(150,185,215,0.13)')
          cg.addColorStop(0.55, 'rgba(110,150,185,0.07)')
          cg.addColorStop(1, 'rgba(110,150,185,0)')
          ctx.fillStyle = cg
          ctx.fillRect(ox - rr, oy - rr, rr * 2, rr * 2)
        }
        ctx.restore()
      }

      hill(ctx, horizon - h * 0.08, h * 0.035, 0.0026, 1.2, '#08131d')
      hill(ctx, horizon - h * 0.02, h * 0.03, 0.0041, 4.1, '#0a1822')
      hill(ctx, horizon + h * 0.03, h * 0.022, 0.0057, 2.4, '#0c1d23')

      // grass: each blade is a curve whose tip leans with wind, a travelling
      // gust wave, and the pointer
      const strength = windX / 260
      ctx.lineCap = 'round'
      let lastBand = -1
      for (const b of blades) {
        const wave = Math.sin(b.x * 0.006 - now * 2.1) * 0.5 + 0.5
        const sway = Math.sin(now * 1.4 * calm + b.phase + b.x * 0.01) * 0.1
        let target = sway + strength * (0.35 + wave * 0.8) / b.stiff
        const dxp = b.x - ptr.x
        const dyp = b.y - b.len * 0.5 - ptr.y
        const d2 = dxp * dxp + dyp * dyp
        if (d2 < 120 * 120) target += (dxp > 0 ? 1 : -1) * (1 - Math.sqrt(d2) / 120) * 0.6 * calm
        target = Math.max(-1.25, Math.min(1.25, target))
        b.bend += (target - b.bend) * Math.min(1, dt * (5 + b.stiff * 3))

        const band = Math.floor(b.depth * 4)
        if (band !== lastBand) {
          const light = 14 + band * 7
          ctx.strokeStyle = `hsl(${150 - band * 6} 32% ${light}%)`
          ctx.lineWidth = 1 + b.depth * 1.6
          lastBand = band
        }
        const tipX = b.x + Math.sin(b.bend) * b.len
        const tipY = b.y - Math.cos(b.bend) * b.len
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.quadraticCurveTo(b.x + Math.sin(b.bend) * b.len * 0.2, b.y - b.len * 0.55, tipX, tipY)
        ctx.stroke()
      }

      // fireflies
      ctx.globalCompositeOperation = 'lighter'
      for (const f of flies) {
        f.px = f.x
        f.py = f.y
        const t = now * 0.35 + f.seed
        const vx = Math.cos(t * 1.3 + Math.sin(t * 0.7) * 2) * f.speed + windX * 0.55
        const vy = Math.sin(t * 1.1 + Math.cos(t * 0.5) * 2) * f.speed * 0.6
        f.x += vx * dt
        f.y += vy * dt
        if (f.x > w + 20) f.x = f.px = -20
        if (f.x < -20) f.x = f.px = w + 20
        if (f.y < horizon - h * 0.28) f.y += 40 * dt
        if (f.y > h - 8) f.y -= 40 * dt

        const bright = 0.55 + Math.sin(now * 2 + f.pulse) * 0.35
        // shutter: the faster it goes, the longer the smear behind it
        const speed = Math.hypot(vx, vy)
        const tail = Math.min(70, speed * 0.09 + 2)
        const ang = Math.atan2(vy, vx)
        const tx = f.x - Math.cos(ang) * tail
        const ty = f.y - Math.sin(ang) * tail
        streak(ctx, tx, ty, f.x, f.y, f.color, f.size * 1.4, 0.22 * bright)
        streak(ctx, (tx + f.x) / 2, (ty + f.y) / 2, f.x, f.y, f.color, f.size, 0.5 * bright)
        const s = glow(f.color)
        const r = 10 + f.size * 6
        ctx.globalAlpha = bright
        ctx.drawImage(s, f.x - r, f.y - r, r * 2, r * 2)
        ctx.globalAlpha = 1
      }
      ctx.globalCompositeOperation = 'source-over'

      // a little mist where the field meets the hills
      const mist = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 60)
      mist.addColorStop(0, hexA('#0b1a28', 0))
      mist.addColorStop(0.5, hexA('#16304a', 0.18))
      mist.addColorStop(1, hexA('#0b1a28', 0))
      ctx.fillStyle = mist
      ctx.fillRect(0, horizon - 30, w, 90)

      // fade into the page below
      const fade = ctx.createLinearGradient(0, h * 0.86, 0, h)
      fade.addColorStop(0, 'rgba(3,5,7,0)')
      fade.addColorStop(1, 'rgba(3,5,7,1)')
      ctx.fillStyle = fade
      ctx.fillRect(0, h * 0.86, w, h * 0.14)
    },
  }
}
