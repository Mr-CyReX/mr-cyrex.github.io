import { useEffect, useRef } from 'react'
import { clamp, cubicBezier, easeInOut, easeOut, lerp, prefersReduced, useLoop } from '../lib/loop.js'

const GROUND = '#08090b'
const LINE = '#2c333b'
const DIM = '#8a949f'
const INK = '#f4f6f8'
const BLUE = '#69c8ff'
const GREEN = '#8dff78'
const RED = '#ff4458'
const DEF = '#3f7bff'
const MONO = '"Geist Mono Variable", ui-monospace, Consolas, monospace'
const HOUSE = [0.22, 1, 0.36, 1] // the curve the old site used for every cut
const house = cubicBezier(...HOUSE)
const easeIn = (x) => x * x * x

const CAPTIONS = [
  { h: 'I build the tools agents work with.', p: 'Mostly in Rust. I build tools I wish existed, then obsess over how they feel.' },
  { h: 'Agents get a real machine to work on', p: 'Computer Control MCP gives agents real Windows controls, so they stop guessing from screenshots. Hexus is my own harness for the projects, agents and tools around them, written in Rust with GPUI and SQLite.' },
  { h: "Purple teaming is where I'm heading", p: "Anything that can click, type and run commands on a machine is something I'd rather break myself first. Run the attack, watch the same run from the defender's side, fix what only one side saw." },
  { h: 'Systems that keep a record', p: 'OpsDesk moves work out of spreadsheets into roles, approvals and imports, with an audit trail over all of it and the data kept local.' },
  { h: 'I still think like a motion designer', p: 'Timing, hierarchy, transitions and polish end up in the software too. Rill is my excuse to push GPUI, Rive and window motion a little harder.' },
  { h: 'Most of my work is private', p: 'GitHub only gets to count part of it. The pieces I can share live there.', cta: true },
]
const N_SCENES = CAPTIONS.length
const DWELL = 0.5 // share of each scene's scroll spent at rest before the transition

// ---------- geometry ----------

function bez(p, t) {
  const u = 1 - t
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ]
}
function arcTable(p) {
  const out = [[0, 0]]
  let len = 0
  let prev = bez(p, 0)
  for (let i = 1; i <= 160; i++) {
    const q = bez(p, i / 160)
    len += Math.hypot(q[0] - prev[0], q[1] - prev[1])
    out.push([i / 160, len])
    prev = q
  }
  return { p, out, len }
}
function along(tab, f) {
  const target = clamp(f) * tab.len
  let lo = 0
  let hi = tab.out.length - 1
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (tab.out[m][1] < target) lo = m + 1
    else hi = m
  }
  return bez(tab.p, tab.out[lo][0])
}
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

// ---------- drawing ----------

function stroke(ctx, color, width = 1.25) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
}
function curve(ctx, p, upto = 1) {
  ctx.beginPath()
  ctx.moveTo(...p[0])
  if (upto >= 1) ctx.bezierCurveTo(...p[1], ...p[2], ...p[3])
  else for (let i = 1; i <= 80 * upto; i++) ctx.lineTo(...bez(p, i / 80))
  ctx.stroke()
}
function diamond(ctx, x, y, s, fill, line) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = fill
  ctx.fillRect(-s, -s, s * 2, s * 2)
  stroke(ctx, line, 1.5)
  ctx.strokeRect(-s, -s, s * 2, s * 2)
  ctx.restore()
}
// The agent, drawn with a real shutter: it is averaged over the last slice of
// its own motion, so it smears when fast and is crisp when still.
function agent(ctx, posAt, t, reduce, color = INK, r = 6.5, shutter = 0.085) {
  const n = reduce ? 1 : 12
  ctx.fillStyle = color
  for (let k = 0; k < n; k++) {
    const [x, y] = posAt(t - (k / n) * shutter)
    ctx.globalAlpha = (reduce ? 1 : 1.7 / n) * ctx.__a
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = ctx.__a
  const [x, y] = posAt(t)
  ctx.beginPath()
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2)
  ctx.fill()
}
function label(ctx, text, x, y, color = DIM, size = 12, align = 'left') {
  ctx.font = `500 ${size}px ${MONO}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}
function withAlpha(ctx, a, fn) {
  const prev = ctx.__a ?? 1
  ctx.__a = prev * a
  ctx.globalAlpha = ctx.__a
  fn()
  ctx.__a = prev
  ctx.globalAlpha = prev
}

// ---------- layout, rebuilt on resize ----------

function layout(w, h) {
  const portrait = h > w * 1.05
  const R = portrait ? { x: w * 0.07, y: h * 0.46, w: w * 0.86, h: h * 0.42 } : { x: w * 0.53, y: h * 0.18, w: w * 0.41, h: h * 0.64 }
  const run = portrait
    ? [[w * 0.08, h * 0.92], [w * 0.3, h * 0.5], [w * 0.9, h * 1.0], [w * 0.9, h * 0.58]]
    : [[w * 0.06, h * 0.8], [w * 0.36, h * 1.04], [w * 0.5, h * 0.3], [w * 0.94, h * 0.36]]
  const win = { x: R.x, y: R.y + R.h * 0.04, w: R.w, h: R.h * 0.84 }
  const rows = Array.from({ length: 6 }, (_, i) => ({ x: win.x + 22 + [0, 1, 1, 2, 2, 1][i] * 18, y: win.y + 62 + i * Math.min(30, (win.h - 120) / 6), w: win.w * [0.5, 0.42, 0.38, 0.3, 0.34, 0.4][i] }))
  const save = { w: 92, h: 34, x: win.x + win.w - 92 - 22, y: win.y + win.h - 34 - 20 }
  const nodes = [
    ['imports', 0.08, 0.12], ['local data', 0.78, 0.12],
    ['requests', 0.08, 0.5], ['roles', 0.43, 0.5], ['approvals', 0.78, 0.5],
    ['audit trail', 0.43, 0.88],
  ].map(([id, fx, fy]) => ({ id, x: R.x + R.w * fx, y: R.y + R.h * fy }))
  const node = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const edges = [['imports', 'local data'], ['requests', 'roles'], ['roles', 'approvals'], ['approvals', 'local data'], ['roles', 'audit trail'], ['approvals', 'audit trail']].map(([a, b]) => [node[a], node[b]])
  const g = { x: R.x, y: R.y + R.h * 0.04, w: R.w, h: R.h * 0.72 }
  const ease = [[g.x, g.y + g.h], [g.x + HOUSE[0] * g.w, g.y + g.h - HOUSE[1] * g.h], [g.x + HOUSE[2] * g.w, g.y + g.h - HOUSE[3] * g.h], [g.x + g.w, g.y]]
  const close = portrait
    ? [[w * 0.12, h * 0.86], [w * 0.3, h * 0.66], [w * 0.7, h * 0.9], [w * 0.88, h * 0.7]]
    : [[w * 0.5, h * 0.74], [w * 0.62, h * 0.86], [w * 0.7, h * 0.46], [w * 0.92, h * 0.5]]
  return { w, h, portrait, R, run: arcTable(run), win, rows, save, nodes, edges, g, ease: arcTable(ease), close: arcTable(close) }
}

// ---------- the agent's own clock in each scene ----------

const KEYS = [0, 0.22, 0.47, 0.74, 1]
const STEPS = ['focus the editor window', 'read what is on screen', 'click Save']
function runProgress(t) {
  const per = 1.9
  const total = per * (KEYS.length - 1)
  const c = ((t % total) + total) % total
  const i = Math.min(KEYS.length - 2, Math.floor(c / per))
  const local = clamp((c - i * per) / 1.45)
  return { f: KEYS[i] + (KEYS[i + 1] - KEYS[i]) * easeInOut(local), seg: i, arrivedFor: c - i * per - 1.45 }
}

// the desk: land on the title bar, read the rows, press Save
const DESK = 6.4
function deskState(L, t) {
  const c = ((t % DESK) + DESK) % DESK
  const perch = [L.win.x + L.win.w * 0.5, L.win.y - 9]
  const btn = [L.save.x + L.save.w / 2, L.save.y - 8]
  if (c < 1.3) {
    const e = easeInOut(c / 1.3)
    const from = [L.win.x - 60, L.win.y + L.win.h + 40]
    const ctl = [L.win.x + L.win.w * 0.1, L.win.y - L.win.h * 0.5]
    const u = 1 - e
    return { pos: [u * u * from[0] + 2 * u * e * ctl[0] + e * e * perch[0], u * u * from[1] + 2 * u * e * ctl[1] + e * e * perch[1]], row: -1, pressed: false }
  }
  if (c < 3.8) return { pos: perch, row: Math.floor(((c - 1.3) / 2.5) * L.rows.length), part: (((c - 1.3) / 2.5) * L.rows.length) % 1, pressed: false }
  if (c < 4.6) {
    const e = easeInOut((c - 3.8) / 0.8)
    const ctl = [(perch[0] + btn[0]) / 2, Math.min(perch[1], btn[1]) - 70]
    const u = 1 - e
    return { pos: [u * u * perch[0] + 2 * u * e * ctl[0] + e * e * btn[0], u * u * perch[1] + 2 * u * e * ctl[1] + e * e * btn[1]], row: 99, pressed: false }
  }
  return { pos: btn, row: 99, pressed: c < 5.2, impact: c - 4.6 }
}

// ---------- scenes ----------

function sceneRun(ctx, L, t, reduce, opts = {}) {
  const run = opts.run ?? L.run
  const p = run.p
  stroke(ctx, LINE, 1)
  ctx.beginPath()
  ctx.moveTo(...p[0])
  ctx.lineTo(...p[1])
  ctx.moveTo(...p[3])
  ctx.lineTo(...p[2])
  ctx.stroke()
  stroke(ctx, BLUE, 1.5)
  curve(ctx, p, opts.upto ?? 1)
  for (const i of [0, 3]) {
    ctx.fillStyle = GROUND
    ctx.fillRect(p[i][0] - 5, p[i][1] - 5, 10, 10)
    stroke(ctx, INK, 1.5)
    ctx.strokeRect(p[i][0] - 5, p[i][1] - 5, 10, 10)
  }
  for (const i of [1, 2]) {
    ctx.fillStyle = GROUND
    ctx.beginPath()
    ctx.arc(p[i][0], p[i][1], 5, 0, Math.PI * 2)
    ctx.fill()
    stroke(ctx, DIM, 1.5)
    ctx.stroke()
  }
  const clock = reduce ? 0 : t
  const pr = runProgress(clock)
  KEYS.slice(1, -1).forEach((f, i) => {
    const [x, y] = along(run, f)
    const hit = pr.seg === i && pr.arrivedFor > 0
    diamond(ctx, x, y, hit ? 7 : 5, hit ? GREEN : GROUND, hit ? GREEN : BLUE)
    if (hit && !opts.quiet) label(ctx, STEPS[i], x + 16, y - 16, INK, 13)
  })
  if (!opts.noAgent) agent(ctx, (tt) => along(run, runProgress(tt).f), clock, reduce)
}

function sceneDesk(ctx, L, t, reduce) {
  const { win, rows, save } = L
  const st = deskState(L, reduce ? 2.5 : t)
  ctx.fillStyle = '#0d1014'
  ctx.fillRect(win.x, win.y, win.w, win.h)
  stroke(ctx, st.row >= 0 ? INK : DIM, 1.5)
  ctx.strokeRect(win.x, win.y, win.w, win.h)
  stroke(ctx, LINE, 1)
  ctx.beginPath()
  ctx.moveTo(win.x, win.y + 34)
  ctx.lineTo(win.x + win.w, win.y + 34)
  ctx.stroke()
  label(ctx, 'editor', win.x + 14, win.y + 17, DIM, 12)
  stroke(ctx, DIM, 1.25)
  const cx = win.x + win.w - 18
  ctx.beginPath()
  ctx.moveTo(cx - 5, win.y + 12)
  ctx.lineTo(cx + 5, win.y + 22)
  ctx.moveTo(cx + 5, win.y + 12)
  ctx.lineTo(cx - 5, win.y + 22)
  ctx.moveTo(cx - 40, win.y + 17)
  ctx.lineTo(cx - 30, win.y + 17)
  ctx.stroke()
  ctx.strokeRect(cx - 22, win.y + 12, 10, 10)
  rows.forEach((r, i) => {
    stroke(ctx, LINE, 1)
    ctx.strokeRect(r.x, r.y - 4, 8, 8)
    stroke(ctx, '#3a424b', 2)
    ctx.beginPath()
    ctx.moveTo(r.x + 18, r.y)
    ctx.lineTo(r.x + 18 + r.w, r.y)
    ctx.stroke()
    const done = st.row > i ? 1 : st.row === i ? easeOut(st.part ?? 0) : 0
    if (done > 0) {
      stroke(ctx, GREEN, 2)
      ctx.beginPath()
      ctx.moveTo(r.x - 4, r.y + 9)
      ctx.lineTo(r.x - 4 + (r.w + 26) * done, r.y + 9)
      ctx.stroke()
    }
  })
  const dy = st.pressed ? 2 : 0
  ctx.fillStyle = st.pressed ? GREEN : '#0d1014'
  ctx.fillRect(save.x, save.y + dy, save.w, save.h)
  stroke(ctx, st.pressed ? GREEN : INK, 1.5)
  ctx.strokeRect(save.x, save.y + dy, save.w, save.h)
  ctx.font = `600 14px "Geist Variable", ui-sans-serif, sans-serif`
  ctx.fillStyle = st.pressed ? GROUND : INK
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Save', save.x + save.w / 2, save.y + save.h / 2 + dy)
  if (st.impact !== undefined && st.impact < 0.7) {
    const k = easeOut(st.impact / 0.7)
    withAlpha(ctx, 1 - k, () => {
      stroke(ctx, GREEN, 1.5)
      ctx.beginPath()
      ctx.arc(save.x + save.w / 2, save.y + save.h / 2, 20 + k * 90, 0, Math.PI * 2)
      ctx.stroke()
    })
  }
  const step = st.row < 0 ? 0 : st.row < 99 ? 1 : 2
  label(ctx, STEPS[step], win.x, win.y + win.h + 24, INK, 13)
  agent(ctx, (tt) => deskState(L, reduce ? 2.5 : tt).pos, reduce ? 2.5 : t, reduce)
}

// red runs the path, blue chases it a beat behind and catches up at the end
const SEC = 4.6
function secHeads(t) {
  const c = ((t % (SEC + 1.2)) + SEC + 1.2) % (SEC + 1.2)
  const r = easeInOut(clamp(c / SEC))
  const lag = 0.22 * (1 - r)
  return { r, b: clamp(r - lag), caught: c > SEC }
}
function sceneSec(ctx, L, t, reduce) {
  const tab = L.run
  const clock = reduce ? SEC * 0.7 : t
  const h = secHeads(clock)
  stroke(ctx, LINE, 1)
  curve(ctx, tab.p)
  const trail = (to, color) => {
    ctx.beginPath()
    for (let i = 0; i <= 90; i++) {
      const [x, y] = along(tab, (i / 90) * to)
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    stroke(ctx, color, 5)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'lighter'
  withAlpha(ctx, 0.72, () => {
    trail(h.r, RED)
    trail(h.b, DEF)
  })
  agent(ctx, (tt) => along(tab, secHeads(tt).r), clock, reduce, RED, 7)
  agent(ctx, (tt) => along(tab, secHeads(tt).b), clock, reduce, DEF, 7)
  ctx.globalCompositeOperation = 'source-over'
  const [ex, ey] = along(tab, 1)
  stroke(ctx, h.caught ? INK : DIM, 1.5)
  ctx.beginPath()
  ctx.arc(ex, ey, 14, 0, Math.PI * 2)
  ctx.stroke()
  const [rx, ry] = along(tab, h.r)
  const [bx, by] = along(tab, h.b)
  if (!h.caught) {
    label(ctx, 'attack', rx + 14, ry - 18, RED, 12)
    label(ctx, 'detection', bx - 14, by + 22, DEF, 12, 'right')
  }
}

const PULSES = [0, 0.37, 0.71]
function sceneSys(ctx, L, t, reduce, draw = 1, nodePos = null, nodeShape = 0) {
  const nodes = L.nodes.map((n, i) => ({ ...n, x: nodePos ? nodePos[i][0] : n.x, y: nodePos ? nodePos[i][1] : n.y }))
  const at = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const E = L.edges.map(([a, b]) => [at[a.id], at[b.id]])
  E.forEach(([a, b], i) => {
    const k = clamp(draw * 1.4 - i * 0.08)
    if (k <= 0) return
    stroke(ctx, LINE, 1.25)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(lerp(a.x, b.x, k), lerp(a.y, b.y, k))
    ctx.stroke()
    if (k >= 1 && !reduce && nodeShape === 0) {
      for (const off of PULSES) {
        const posAt = (tt) => {
          const f = (((tt * 0.32 + off + i * 0.13) % 1) + 1) % 1
          const e = easeInOut(f)
          return [lerp(a.x, b.x, e), lerp(a.y, b.y, e)]
        }
        agent(ctx, posAt, t, reduce, i % 2 ? GREEN : BLUE, 3.2, 0.12)
      }
    }
  })
  nodes.forEach((n, i) => {
    const k = clamp(draw * 1.6 - i * 0.1)
    if (k <= 0) return
    withAlpha(ctx, k, () => {
      const bw = lerp(Math.min(108, L.R.w * 0.27), 10, nodeShape)
      const bh = lerp(36, 10, nodeShape)
      ctx.save()
      ctx.translate(n.x, n.y)
      ctx.rotate((Math.PI / 4) * nodeShape)
      const s = lerp(0.94, 1, easeOut(k))
      ctx.scale(s, s)
      ctx.fillStyle = '#0d1014'
      ctx.fillRect(-bw / 2, -bh / 2, bw, bh)
      stroke(ctx, nodeShape > 0.5 ? BLUE : '#3a424b', 1.5)
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh)
      ctx.restore()
      if (nodeShape < 0.5) withAlpha(ctx, 1 - nodeShape * 2, () => label(ctx, n.id, n.x, n.y, '#c6ccd2', 12, 'center'))
    })
  })
}

const MO = 3.2
function sceneMotion(ctx, L, t, reduce, draw = 1, keys = true) {
  const { g, ease } = L
  withAlpha(ctx, draw, () => {
    stroke(ctx, LINE, 1)
    ctx.beginPath()
    ctx.moveTo(g.x, g.y - 10)
    ctx.lineTo(g.x, g.y + g.h)
    ctx.lineTo(g.x + g.w + 10, g.y + g.h)
    ctx.moveTo(...ease.p[0])
    ctx.lineTo(...ease.p[1])
    ctx.moveTo(...ease.p[3])
    ctx.lineTo(...ease.p[2])
    ctx.stroke()
    for (const i of [1, 2]) {
      ctx.fillStyle = GROUND
      ctx.beginPath()
      ctx.arc(ease.p[i][0], ease.p[i][1], 5, 0, Math.PI * 2)
      ctx.fill()
      stroke(ctx, DIM, 1.5)
      ctx.stroke()
    }
  })
  stroke(ctx, BLUE, 1.75)
  curve(ctx, ease.p, draw)
  if (keys) [0.08, 0.22, 0.4, 0.58, 0.76, 0.92].forEach((f) => diamond(ctx, ...along(ease, f), 4, GROUND, BLUE))
  if (draw < 1) return
  const clock = reduce ? MO * 0.4 : t
  const prog = (tt) => clamp(((((tt % (MO + 0.9)) + MO + 0.9) % (MO + 0.9)) / MO))
  agent(ctx, (tt) => {
    const x = prog(tt)
    return [g.x + x * g.w, g.y + g.h - house(x) * g.h]
  }, clock, reduce, GREEN, 5.5)
  const ty = g.y + g.h + Math.min(64, L.R.h * 0.16)
  stroke(ctx, LINE, 1)
  ctx.beginPath()
  ctx.moveTo(g.x, ty)
  ctx.lineTo(g.x + g.w, ty)
  ctx.stroke()
  // the same timing applied to a block: this is what the curve feels like
  const bw = 34
  const n = reduce ? 1 : 12
  for (let k = 0; k < n; k++) {
    const x = g.x + house(prog(clock - (k / n) * 0.09)) * (g.w - bw)
    ctx.globalAlpha = (reduce ? 1 : 1.6 / n) * ctx.__a
    ctx.fillStyle = INK
    ctx.fillRect(x, ty - 12, bw, 24)
  }
  ctx.globalAlpha = ctx.__a
}

function sceneClose(ctx, L, t, reduce, draw = 1) {
  const tab = L.close
  stroke(ctx, BLUE, 1.5)
  curve(ctx, tab.p, draw)
  ctx.fillStyle = GROUND
  stroke(ctx, INK, 1.5)
  const [sx, sy] = tab.p[0]
  ctx.fillRect(sx - 5, sy - 5, 10, 10)
  ctx.strokeRect(sx - 5, sy - 5, 10, 10)
  if (draw < 1) return
  const [ex, ey] = tab.p[3]
  ctx.fillRect(ex - 5, ey - 5, 10, 10)
  ctx.strokeRect(ex - 5, ey - 5, 10, 10)
  agent(ctx, (tt) => [ex, ey - 16 - Math.sin(tt * 2.2) * (reduce ? 0 : 4)], t, reduce)
}

// ---------- transitions: each one is motivated by something already on screen ----------

const TRANSITIONS = [
  // zoom into a keyframe until its inside is the whole frame; the diamond turns and settles into the window
  (ctx, L, t, u, reduce) => {
    const [fx, fy] = along(L.run, KEYS[2])
    const a = clamp(u / 0.6)
    if (a < 1) {
      // the camera moves, not the ink: geometry is scaled, lines stay hairline
      const s = 1 + easeIn(a) * 160
      const run = arcTable(L.run.p.map(([x, y]) => [fx + (x - fx) * s, fy + (y - fy) * s]))
      sceneRun(ctx, L, t, reduce, { quiet: true, noAgent: true, run })
      diamond(ctx, fx, fy, 5 * s, GROUND, BLUE)
      if (!reduce) zoomLines(ctx, L, fx, fy, Math.sin(a * Math.PI))
    }
    const b = clamp((u - 0.45) / 0.55)
    if (b > 0) {
      const e = easeOut(b)
      const cx = L.win.x + L.win.w / 2
      const cy = L.win.y + L.win.h / 2
      ctx.save()
      ctx.translate(lerp(fx, cx, e), lerp(fy, cy, e))
      ctx.rotate((1 - e) * (Math.PI / 4))
      ctx.scale(lerp(1.5, 1, e), lerp(1.5, 1, e))
      ctx.translate(-cx, -cy)
      withAlpha(ctx, e, () => sceneDesk(ctx, L, t, reduce))
      ctx.restore()
    }
  },
  // the click's ripple keeps growing and becomes an iris into the next scene
  (ctx, L, t, u, reduce) => {
    sceneDesk(ctx, L, t, reduce)
    const cx = L.save.x + L.save.w / 2
    const cy = L.save.y + L.save.h / 2
    const r = easeInOut(u) * Math.hypot(L.w, L.h)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = GROUND
    ctx.fillRect(0, 0, L.w, L.h)
    sceneSec(ctx, L, t, reduce)
    ctx.restore()
    stroke(ctx, GREEN, 1.5)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  },
  // both trails draw in toward the system they were fighting over, and the graph draws out of them
  (ctx, L, t, u, reduce) => {
    const roles = L.nodes[3]
    const e = easeInOut(u)
    ctx.save()
    ctx.translate(roles.x, roles.y)
    ctx.scale(1 - e * 0.85, 1 - e * 0.85)
    ctx.translate(-roles.x, -roles.y)
    withAlpha(ctx, 1 - e, () => sceneSec(ctx, L, t, reduce))
    ctx.restore()
    sceneSys(ctx, L, t, reduce, clamp((u - 0.25) / 0.75))
  },
  // the nodes slide onto the easing curve and fold into its keyframes
  (ctx, L, t, u, reduce) => {
    const e = easeInOut(u)
    const fs = [0.08, 0.22, 0.4, 0.58, 0.76, 0.92]
    const pos = L.nodes.map((n, i) => mix([n.x, n.y], along(L.ease, fs[i]), e))
    sceneMotion(ctx, L, t, reduce, clamp((u - 0.35) / 0.65), false)
    withAlpha(ctx, 1 - clamp((u - 0.8) / 0.2), () => sceneSys(ctx, L, t, reduce, 1 - clamp((u - 0.45) / 0.4), pos, e))
  },
  // pull the camera out until the curve is small again, and the run comes back around it
  (ctx, L, t, u, reduce) => {
    const e = easeInOut(u)
    const cx = L.g.x + L.g.w / 2
    const cy = L.g.y + L.g.h / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1 - e * 0.8, 1 - e * 0.8)
    ctx.translate(-cx, -cy)
    withAlpha(ctx, 1 - e, () => sceneMotion(ctx, L, t, reduce))
    ctx.restore()
    withAlpha(ctx, e, () => sceneClose(ctx, L, t, reduce, e))
  },
]

function zoomLines(ctx, L, x, y, k) {
  if (k < 0.02) return
  stroke(ctx, BLUE, 1)
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + i * 0.37
    const r0 = Math.max(L.w, L.h) * (0.18 + ((i * 53) % 17) / 40)
    const r1 = r0 + Math.max(L.w, L.h) * 0.25 * k
    withAlpha(ctx, k * 0.55, () => {
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0)
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1)
      ctx.stroke()
    })
  }
}

const SCENES = [sceneRun, sceneDesk, sceneSec, sceneSys, sceneMotion, sceneClose]

export default function Experience() {
  const stage = useRef(null)
  const canvas = useRef(null)
  const caps = useRef([])
  const st = useRef({ L: null, sp: 0, reduce: false, drag: -1 })

  useEffect(() => {
    document.documentElement.style.background = GROUND
    document.title = 'Ali Sh'
    st.current.reduce = prefersReduced()
    const html = document.documentElement
    html.style.scrollSnapType = 'y proximity'
    const fit = () => {
      const c = canvas.current
      const w = c.clientWidth
      const h = c.clientHeight
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      st.current.dpr = dpr
      st.current.L = layout(w, h)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas.current)
    return () => {
      ro.disconnect()
      html.style.scrollSnapType = ''
    }
  }, [])

  // dragging the run's handles on the first scene
  const onDown = (e) => {
    const s = st.current
    if (!s.L || s.sp > 0.3) return
    const r = canvas.current.getBoundingClientRect()
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    const i = s.L.run.p.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 24)
    if (i < 0) return
    s.drag = i
    canvas.current.setPointerCapture(e.pointerId)
  }
  const onMove = (e) => {
    const s = st.current
    if (s.drag < 0) return
    const r = canvas.current.getBoundingClientRect()
    const p = s.L.run.p.map((q) => [...q])
    p[s.drag] = [clamp(e.clientX - r.left, 8, s.L.w - 8), clamp(e.clientY - r.top, 8, s.L.h - 8)]
    s.L.run = arcTable(p)
  }
  const onUp = () => (st.current.drag = -1)

  useLoop(stage, (now, dt) => {
    const s = st.current
    const L = s.L
    if (!L) return
    const el = stage.current
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight
    const target = clamp(-rect.top / Math.max(1, rect.height - vh)) * (N_SCENES - 1)
    // a little inertia on the camera so wheel steps glide instead of jump
    s.sp += (target - s.sp) * (1 - Math.exp(-dt * (s.reduce ? 30 : 9)))
    if (Math.abs(target - s.sp) < 0.0005) s.sp = target

    const ctx = canvas.current.getContext('2d')
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
    ctx.__a = 1
    ctx.globalAlpha = 1
    ctx.fillStyle = GROUND
    ctx.fillRect(0, 0, L.w, L.h)

    const i = Math.min(N_SCENES - 1, Math.floor(s.sp))
    const f = s.sp - i
    if (i >= N_SCENES - 1 || f < DWELL) SCENES[i](ctx, L, now, s.reduce)
    else {
      const u = (f - DWELL) / (1 - DWELL)
      if (s.reduce) {
        withAlpha(ctx, 1 - u, () => SCENES[i](ctx, L, now, true))
        withAlpha(ctx, u, () => SCENES[i + 1](ctx, L, now, true))
      } else TRANSITIONS[i](ctx, L, now, u, false)
    }

    // captions cross with a short blur, timed to the scene they belong to
    caps.current.forEach((n, k) => {
      if (!n) return
      const d = s.sp - k
      const vIn = k === 0 ? 1 : clamp((d + 0.2) / 0.15)
      const vOut = k === N_SCENES - 1 ? 1 : clamp((0.75 - d) / 0.2)
      const v = Math.min(vIn, vOut)
      n.style.opacity = v.toFixed(3)
      n.style.filter = s.reduce || v > 0.98 ? 'none' : `blur(${((1 - v) * 10).toFixed(1)}px)`
      n.style.transform = s.reduce ? 'none' : `translateY(${((1 - v) * (d > 0 ? -14 : 14)).toFixed(1)}px)`
      n.style.visibility = v < 0.01 ? 'hidden' : 'visible'
    })
  })

  return (
    <div style={{ background: GROUND, color: INK, fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif' }}>
      <div className="sr-only">
        {CAPTIONS.map((c, k) => (
          <section key={c.h}>
            {k === 0 ? <h1>{c.h}</h1> : <h2>{c.h}</h2>}
            <p>{c.p}</p>
          </section>
        ))}
        <a href="https://github.com/Mr-CyReX">Open my GitHub</a>
      </div>
      <div ref={stage} className="relative" style={{ height: `${100 + (N_SCENES - 1) * 110}svh` }}>
        {CAPTIONS.map((_, k) => (
          <div key={k} aria-hidden="true" className="pointer-events-none absolute left-0 h-px w-px snap-start" style={{ top: `${k * 110}svh` }} />
        ))}
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <canvas
            ref={canvas}
            aria-hidden="true"
            className="absolute inset-0 block h-full w-full"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          <div className="pointer-events-none relative mx-auto h-full max-w-6xl px-6 sm:px-10">
            {CAPTIONS.map((c, k) => (
              <div
                key={k}
                ref={(n) => (caps.current[k] = n)}
                aria-hidden="true"
                className="absolute top-20 right-6 left-6 max-w-[30rem] sm:top-24 sm:right-auto sm:left-10"
                style={{ opacity: k === 0 ? 1 : 0, visibility: k === 0 ? 'visible' : 'hidden' }}
              >
                {k === 0 ? (
                  <p className="text-[clamp(2.5rem,6vw,5.2rem)] leading-[0.96] font-semibold tracking-[-0.04em] text-balance">{c.h}</p>
                ) : (
                  <p className="text-[clamp(2rem,4.2vw,3.6rem)] leading-[1] font-semibold tracking-[-0.035em] text-balance">{c.h}</p>
                )}
                <p className="mt-5 text-[clamp(1rem,1.3vw,1.125rem)] leading-relaxed text-[#a4adb7]">{c.p}</p>
                {c.cta && (
                  <a
                    href="https://github.com/Mr-CyReX"
                    tabIndex={-1}
                    className="pointer-events-auto mt-8 inline-block rounded-full bg-[#f4f6f8] px-6 py-3 text-sm font-medium text-[#08090b] transition-transform duration-150 active:scale-[0.97]"
                  >
                    Open my GitHub
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
