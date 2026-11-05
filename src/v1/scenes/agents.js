import { easeInOut, glow, hexA, streak } from '../../lib/canvas.js'

export const TOOLS = [
  { id: 'desktop', actions: ['focus the editor window', 'read the accessibility tree', 'click Save'] },
  { id: 'shell', actions: ['run cargo check', 'read the compiler error', 'run the tests again'] },
  { id: 'repo', actions: ['open the failing test', 'write the patch', 'stage the change'] },
  { id: 'browser', actions: ['open the crate docs', 'copy the signature it needs'] },
  { id: 'memory', actions: ['recall the last session', 'store what changed'] },
]

const COLORS = ['#8dff78', '#69c8ff', '#f4f6f8']

// Agents leave the hub, travel an arc to a tool, settle there for a beat,
// and come back. Arcs, slow in and slow out, squash on arrival, and a smear
// that grows with speed: the old principles, applied to tool calls.
export function createAgents({ reduce, onStep }) {
  let w = 0
  let h = 0
  let hub = { x: 0, y: 0 }
  let nodes = []
  const spirits = COLORS.map((color, i) => ({
    color,
    state: 'rest',
    timer: 0.6 + i * 0.9,
    from: null,
    to: null,
    t: 0,
    dur: 1,
    bend: 0,
    x: 0,
    y: 0,
    trail: [],
    squash: 0,
    tool: null,
    step: 0,
  }))

  function layout() {
    hub = { x: w * 0.5, y: h * 0.52, r: Math.min(w, h) * 0.075, glow: 0, id: 'hexus' }
    const rx = w * 0.36
    const ry = h * 0.34
    nodes = TOOLS.map((tool, i) => {
      const a = -Math.PI / 2 + (i / TOOLS.length) * Math.PI * 2
      return { ...tool, x: hub.x + Math.cos(a) * rx, y: hub.y + Math.sin(a) * ry, r: Math.min(w, h) * 0.045, glow: 0, used: 0 }
    })
    for (const s of spirits) {
      s.x = hub.x
      s.y = hub.y
      s.trail = []
    }
  }

  function arcPoint(a, b, bend, t) {
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const cx = mx - dy * bend
    const cy = my + dx * bend
    const u = 1 - t
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
  }

  function depart(s, from, to) {
    s.from = from
    s.to = to
    s.t = 0
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    s.dur = (0.75 + dist / Math.max(w, 1) * 1.1) * (reduce ? 1.6 : 1)
    s.bend = (Math.random() < 0.5 ? -1 : 1) * (0.18 + Math.random() * 0.14)
    s.state = 'fly'
  }

  function update(s, dt) {
    if (s.state === 'rest') {
      s.timer -= dt
      if (s.timer <= 0) {
        const pool = nodes.filter((n) => !spirits.some((o) => o !== s && o.to === n))
        const pick = pool.sort((a, b) => a.used - b.used)[Math.floor(Math.random() * Math.min(2, pool.length))]
        pick.used++
        s.tool = pick
        depart(s, hub, pick)
      }
    } else if (s.state === 'fly') {
      s.t = Math.min(1, s.t + dt / s.dur)
      const p = arcPoint(s.from, s.to, s.bend, easeInOut(s.t))
      s.x = p.x
      s.y = p.y
      if (s.t >= 1) {
        s.squash = 1
        s.to.glow = 1
        if (s.to === hub) {
          s.state = 'rest'
          s.timer = 0.35 + Math.random() * 0.5
        } else {
          s.state = 'work'
          s.timer = 0.7 + Math.random() * 0.4
          const tool = s.to
          onStep?.({ tool: tool.id, action: tool.actions[s.step % tool.actions.length], color: s.color })
          s.step++
        }
      }
    } else if (s.state === 'work') {
      s.timer -= dt
      if (s.timer <= 0) depart(s, s.to, hub)
    }
    s.squash *= Math.pow(0.0025, dt)
  }

  function drawNode(ctx, n, label) {
    ctx.fillStyle = '#070b10'
    ctx.strokeStyle = n.glow > 0.02 ? hexA('#69c8ff', 0.35 + n.glow * 0.6) : '#303943'
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = n.glow > 0.02 ? hexA('#f4f6f8', 0.6 + n.glow * 0.4) : '#8a949f'
    ctx.font = `500 ${Math.max(10, Math.min(12, w / 50))}px "Geist Mono Variable", ui-monospace, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, n.x, n.y + n.r + 14)
  }

  return {
    resize(nw, nh) {
      w = nw
      h = nh
      layout()
    },
    frame(ctx, dt) {
      ctx.fillStyle = '#05080c'
      ctx.fillRect(0, 0, w, h)

      // faint dot grid
      ctx.fillStyle = '#121a22'
      for (let x = 16; x < w; x += 24) for (let y = 16; y < h; y += 24) ctx.fillRect(x, y, 1, 1)

      ctx.strokeStyle = '#1c242d'
      ctx.lineWidth = 1
      for (const n of nodes) {
        ctx.beginPath()
        ctx.moveTo(hub.x, hub.y)
        ctx.lineTo(n.x, n.y)
        ctx.stroke()
      }

      for (const s of spirits) update(s, dt)
      for (const n of [hub, ...nodes]) n.glow *= Math.pow(0.12, dt)

      for (const n of nodes) drawNode(ctx, n, n.id)
      drawNode(ctx, hub, hub.id)

      ctx.globalCompositeOperation = 'lighter'
      for (const s of spirits) {
        s.trail.push({ x: s.x, y: s.y })
        if (s.trail.length > (reduce ? 4 : 14)) s.trail.shift()
        for (let i = 1; i < s.trail.length; i++) {
          const a = s.trail[i - 1]
          const b = s.trail[i]
          const k = i / s.trail.length
          streak(ctx, a.x, a.y, b.x, b.y, s.color, 1 + k * 4, k * 0.55)
        }
        // squash and stretch: stretched along travel while fast, squashed on landing
        const last = s.trail[s.trail.length - 2] || s
        const vx = s.x - last.x
        const vy = s.y - last.y
        const sp = Math.min(1, Math.hypot(vx, vy) / 12)
        const sx = 1 + sp * 0.9 + s.squash * 0.35
        const sy = 1 / (1 + sp * 0.45) - s.squash * 0.25
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(Math.atan2(vy, vx) || 0)
        ctx.scale(sx, Math.max(0.55, sy))
        const img = glow(s.color)
        ctx.drawImage(img, -16, -16, 32, 32)
        ctx.restore()
      }
      ctx.globalCompositeOperation = 'source-over'
    },
  }
}
