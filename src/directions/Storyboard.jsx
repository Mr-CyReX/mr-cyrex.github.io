import { useEffect, useRef } from 'react'
import rough from 'roughjs'
import '@fontsource-variable/hanken-grotesk'
import { clamp, easeInOut, prefersReduced, useLoop } from '../lib/loop.js'

const NS = 'http://www.w3.org/2000/svg'
const INK = '#2a2f35'
const RED = '#c8453b'
const BLUE = '#3a73bd'
const TEMPLATE = '#a8c8e4'
const PAPER = '#f7f8f5'
const LEAF = '#7ea35e'

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .2 0 0 0 0 .2 0 0 0 0 .2 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// ---------- drawing helpers ----------

function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag)
  for (const k in attrs) n.setAttribute(k, attrs[k])
  parent?.appendChild(n)
  return n
}

const pencil = (seed, extra) => ({ roughness: 1.15, bowing: 1.4, stroke: INK, strokeWidth: 1.25, seed, ...extra })

// The desktop the agent works on: icons, a taskbar, and an app window with text in it.
function windowFrame(rc, svg, seed, body = true) {
  const soft = (n, extra) => pencil(seed + n, { strokeWidth: 0.8, roughness: 0.9, ...extra })
  svg.appendChild(rc.line(0, 168, 320, 168, soft(300)))
  svg.appendChild(rc.rectangle(8, 171, 12, 7, soft(301)))
  for (let i = 0; i < 3; i++) svg.appendChild(rc.rectangle(130 + i * 20, 171, 12, 7, soft(302 + i)))
  for (let i = 0; i < 3; i++) {
    svg.appendChild(rc.rectangle(14, 14 + i * 34, 16, 14, soft(310 + i)))
    svg.appendChild(rc.line(12, 34 + i * 34, 32, 34 + i * 34, soft(320 + i, { stroke: '#7d858d' })))
  }
  svg.appendChild(rc.rectangle(52, 40, 216, 124, pencil(seed, { fill: PAPER, fillStyle: 'solid' })))
  if (body) {
    for (let i = 0; i < 5; i++) {
      const w = [150, 172, 120, 160, 96][i]
      svg.appendChild(rc.line(64, 76 + i * 14, 64 + w, 76 + i * 14, soft(330 + i, { stroke: '#8a9198' })))
    }
  }
  svg.appendChild(rc.line(52, 58, 268, 58, pencil(seed + 1, { strokeWidth: 1 })))
  // minimise, maximise, close
  svg.appendChild(rc.line(222, 49, 229, 49, pencil(seed + 2, { strokeWidth: 1 })))
  svg.appendChild(rc.rectangle(236, 45, 7, 7, pencil(seed + 3, { strokeWidth: 1, roughness: 0.6 })))
  svg.appendChild(rc.line(251, 45, 258, 52, pencil(seed + 4, { strokeWidth: 1 })))
  svg.appendChild(rc.line(258, 45, 251, 52, pencil(seed + 5, { strokeWidth: 1 })))
}

function arrow(rc, svg, d, seed, color = BLUE) {
  svg.appendChild(rc.path(d.path, pencil(seed, { stroke: color, strokeWidth: 1.1, roughness: 0.9 })))
  const [x, y, a] = d.head
  const l = 9
  svg.appendChild(rc.line(x, y, x - l * Math.cos(a - 0.45), y - l * Math.sin(a - 0.45), pencil(seed + 1, { stroke: color, strokeWidth: 1.1 })))
  svg.appendChild(rc.line(x, y, x - l * Math.cos(a + 0.45), y - l * Math.sin(a + 0.45), pencil(seed + 2, { stroke: color, strokeWidth: 1.1 })))
}

// The agent: a small round spirit with a sprout. Stretches along its travel,
// leaves smear outlines and speed lines behind when it moves fast.
function spirit(rc, svg, { x, y, vx = 0, vy = 0, squash = 0, look = [0, 1], seed }) {
  const speed = Math.hypot(vx, vy)
  const k = clamp(speed / 650, 0, 1)
  const ang = Math.atan2(vy, vx)
  if (k > 0.08) {
    for (let i = 1; i <= 3; i++) {
      const gx = x - Math.cos(ang) * i * 9 * k * 2
      const gy = y - Math.sin(ang) * i * 9 * k * 2
      const g = rc.ellipse(gx, gy, 22, 22, pencil(seed + 20 + i, { strokeWidth: 0.9, roughness: 1.6 }))
      g.setAttribute('opacity', String((0.42 / i) * k + 0.05))
      svg.appendChild(g)
    }
    for (let i = -1; i <= 1; i++) {
      const ox = -Math.sin(ang) * i * 7
      const oy = Math.cos(ang) * i * 7
      const len = 18 + 60 * k
      const sx = x - Math.cos(ang) * 16 + ox
      const sy = y - Math.sin(ang) * 16 + oy
      svg.appendChild(rc.line(sx, sy, sx - Math.cos(ang) * len, sy - Math.sin(ang) * len, pencil(seed + 30 + i, { strokeWidth: 0.9 })))
    }
  }
  const stretch = 1 + k * 0.55
  const sxs = (stretch + squash * 0.38)
  const sys = (1 / stretch) * (1 - squash * 0.32)
  const deg = k > 0.08 ? (ang * 180) / Math.PI : 0
  const g = el('g', { transform: `translate(${x} ${y}) rotate(${deg}) scale(${sxs} ${sys})` }, svg)
  g.appendChild(rc.ellipse(0, 0, 24, 24, pencil(seed, { fill: INK, fillStyle: 'hachure', hachureGap: 2.1, hachureAngle: -40, fillWeight: 1.1, strokeWidth: 1.5, roughness: 1.3 })))
  const un = el('g', { transform: `rotate(${-deg})` }, g)
  un.appendChild(rc.path('M0 -12 C 1 -19 5 -22 10 -22 C 8 -16 4 -14 0 -12', pencil(seed + 3, { fill: LEAF, fillStyle: 'solid', strokeWidth: 1, roughness: 0.7 })))
  for (const ex of [-4.6, 4.6]) {
    el('circle', { cx: ex + look[0] * 1.4, cy: -1 + look[1] * 1.2, r: 3, fill: PAPER }, un)
    el('circle', { cx: ex + look[0] * 2.2, cy: -1 + look[1] * 2, r: 1.25, fill: INK }, un)
  }
}

function quad(a, c, b, t) {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}

// ---------- the three panels ----------

const PERCH = [160, 34]
const ROWS = [0, 1, 1, 2, 2, 1]

const PANELS = [
  {
    dur: 2.2,
    key: 0.42,
    note: 'Screenshot and click guessing got old, so I built Computer Control MCP. The agent stops squinting at pixels and lands on the window itself.',
    draw(rc, svg, t, seed, idle) {
      windowFrame(rc, svg, seed)
      const pos = (u) => quad([-34, 150], [70, -30], PERCH, easeInOut(clamp(u / 0.62)))
      const [x, y] = pos(t)
      const [px, py] = pos(t - 0.005)
      const v = 1 / (0.005 * this.dur)
      const land = t > 0.62 ? Math.max(0, Math.exp(-(t - 0.62) * 14) * Math.cos((t - 0.62) * 30)) : 0
      if (idle) arrow(rc, svg, { path: 'M 6 138 Q 70 -6 146 26', head: [146, 26, 0.35] }, seed + 40)
      spirit(rc, svg, { x, y, vx: (x - px) * v, vy: (y - py) * v, squash: land, look: [1, 0.2], seed: seed + 50 })
    },
  },
  {
    dur: 2.4,
    key: 0.55,
    note: 'It works from the controls that are actually on screen, one at a time, instead of a picture of them.',
    draw(rc, svg, t, seed) {
      windowFrame(rc, svg, seed, false)
      const cur = Math.min(ROWS.length - 1, Math.floor(t * ROWS.length))
      const part = (t * ROWS.length) % 1
      ROWS.forEach((lvl, i) => {
        const y = 74 + i * 15
        const x = 66 + lvl * 16
        svg.appendChild(rc.rectangle(x, y - 4, 6, 6, pencil(seed + 60 + i, { strokeWidth: 0.9, roughness: 0.7 })))
        svg.appendChild(rc.line(x + 12, y - 1, x + 12 + 70 - lvl * 10, y - 1, pencil(seed + 70 + i, { strokeWidth: 0.9 })))
        if (i < cur || (i === cur && part > 0)) {
          const len = (70 - lvl * 10 + 14) * (i < cur ? 1 : easeInOut(part))
          svg.appendChild(rc.line(x - 2, y + 4, x - 2 + len, y + 4, pencil(seed + 80 + i, { stroke: RED, strokeWidth: 1.3 })))
        }
      })
      const ty = 74 + cur * 15
      const lx = clamp((66 + ROWS[cur] * 16 - PERCH[0]) / 60, -1, 1)
      spirit(rc, svg, { x: PERCH[0], y: PERCH[1], look: [lx, clamp((ty - PERCH[1]) / 50, 0, 1)], seed: seed + 50 })
    },
  },
  {
    dur: 2,
    key: 0.6,
    note: 'Then it presses the real button. Hexus runs the whole loop: my own harness for projects, agents, tools and the machine, in Rust with GPUI and SQLite.',
    draw(rc, svg, t, seed, idle) {
      windowFrame(rc, svg, seed)
      const btn = [186, 128, 62, 24]
      const top = [btn[0] + btn[2] / 2, btn[1] - 12]
      const crouch = clamp(t / 0.18)
      const jump = clamp((t - 0.18) / 0.34)
      const hit = t >= 0.52
      const pressed = hit && t < 0.8
      const by = pressed ? 2 : 0
      svg.appendChild(rc.rectangle(btn[0], btn[1] + by, btn[2], btn[3], pencil(seed + 90, pressed ? { fill: BLUE, fillStyle: 'hachure', hachureGap: 3, fillWeight: 0.8 } : {})))
      const label = el('text', { x: btn[0] + btn[2] / 2, y: btn[1] + 16 + by, 'text-anchor': 'middle', 'font-size': 12, 'font-family': 'Hanken Grotesk Variable, sans-serif', 'font-weight': 600, fill: INK }, svg)
      label.textContent = 'Save'
      const c = [(PERCH[0] + top[0]) / 2, -18]
      const pos = (u) => quad(PERCH, c, top, easeInOut(clamp((u - 0.18) / 0.34)))
      let [x, y] = pos(t)
      const [px, py] = pos(t - 0.005)
      const v = 1 / (0.005 * this.dur)
      let vx = jump > 0 && jump < 1 ? (x - px) * v : 0
      let vy = jump > 0 && jump < 1 ? (y - py) * v : 0
      let squash = jump > 0 ? 0 : crouch * 0.9
      if (hit) {
        y = top[1] + by
        const s = t - 0.52
        squash = Math.max(0, Math.exp(-s * 10) * Math.cos(s * 26))
        if (s < 0.24) {
          const r0 = 18 + s * 60
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI + (i / 5) * Math.PI
            svg.appendChild(rc.line(top[0] + Math.cos(a) * r0, btn[1] + 4 + Math.sin(a) * r0 * 0.6, top[0] + Math.cos(a) * (r0 + 10), btn[1] + 4 + Math.sin(a) * (r0 + 10) * 0.6, pencil(seed + 100 + i, { stroke: RED, strokeWidth: 1.2 })))
          }
        }
      }
      if (idle) arrow(rc, svg, { path: 'M 166 18 Q 196 -16 214 96', head: [214, 96, 1.45] }, seed + 40)
      spirit(rc, svg, { x, y, vx, vy, squash, look: [0.6, 1], seed: seed + 50 })
    },
  },
]
const CYCLE = PANELS.reduce((s, p) => s + p.dur, 0) + 0.8

function Strip() {
  const rootRef = useRef(null)
  const svgs = useRef([])
  const state = useRef({ boil: -1, active: -1 })
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = prefersReduced()
  }, [])

  useLoop(rootRef, (now) => {
    const clock = now % CYCLE
    let acc = 0
    let active = -1
    let local = 0
    PANELS.forEach((p, i) => {
      if (clock >= acc && clock < acc + p.dur) {
        active = i
        local = (clock - acc) / p.dur
      }
      acc += p.dur
    })
    // pencil lines redraw eight times a second, like hand drawn line boil
    const boil = Math.floor(now * (reduce.current ? 2 : 8)) % 3
    const boilChanged = boil !== state.current.boil
    PANELS.forEach((p, i) => {
      const svg = svgs.current[i]
      if (!svg) return
      const isActive = i === active && !reduce.current
      if (!isActive && !boilChanged && state.current.active !== i) return
      svg.replaceChildren()
      const rc = rough.svg(svg)
      const seed = 1 + boil * 97 + i * 13
      p.draw(rc, svg, isActive ? local : p.key, seed, !isActive)
      if (isActive) {
        for (const [x, y, dx, dy] of [[3, 3, 14, 0], [3, 3, 0, 14], [317, 3, -14, 0], [317, 3, 0, 14], [3, 177, 14, 0], [3, 177, 0, -14], [317, 177, -14, 0], [317, 177, 0, -14]])
          svg.appendChild(rc.line(x, y, x + dx, y + dy, pencil(seed + 200 + x + y, { stroke: RED, strokeWidth: 1.6 })))
      }
    })
    state.current = { boil, active }
  })

  return (
    <div ref={rootRef} className="grid gap-x-6 gap-y-10 md:grid-cols-3">
      {PANELS.map((p, i) => (
        <figure key={i} className="m-0">
          <div className="border-[1.5px] border-[#2a2f35] bg-white">
            <svg ref={(n) => (svgs.current[i] = n)} viewBox="0 0 320 180" className="block w-full" aria-hidden="true" />
          </div>
          <p
            className="mt-3 text-[15px] leading-[26px] text-[#2a2f35]"
            style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 25px, ${TEMPLATE} 25px 26px)` }}
          >
            {p.note}
          </p>
        </figure>
      ))}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[#a8c8e4] pb-1">
      <span className="text-[11px] tracking-[0.08em] text-[#6f98c0] uppercase">{label}</span>
      <span className="text-[15px] font-medium text-[#2a2f35]">{value}</span>
    </div>
  )
}

function Sheet({ children, fields }) {
  return (
    <section
      className="relative mx-auto max-w-[1280px] px-5 py-7 shadow-[0_18px_40px_-18px_rgba(30,40,50,0.35),0_2px_6px_rgba(30,40,50,0.08)] sm:px-10 sm:py-9"
      style={{ background: `${GRAIN}, ${PAPER}` }}
    >
      <div className="grid gap-4 sm:grid-cols-3">{fields.map(([l, v]) => <Field key={l} label={l} value={v} />)}</div>
      {children}
    </section>
  )
}

function PurpleSketch() {
  const ref = useRef(null)
  const state = useRef(-1)
  useLoop(ref, (now) => {
    const boil = Math.floor(now * 8) % 3
    if (boil === state.current) return
    state.current = boil
    const svg = ref.current
    svg.replaceChildren()
    const rc = rough.svg(svg)
    const s = 300 + boil * 31
    const red = el('g', { style: 'mix-blend-mode:multiply' }, svg)
    red.appendChild(rc.path('M 20 150 C 160 40, 300 210, 460 90 S 700 60, 780 120 L 780 160 C 690 120, 600 140, 460 140 S 170 220, 20 190 Z', { seed: s, stroke: RED, strokeWidth: 1.3, fill: RED, fillStyle: 'hachure', hachureAngle: 30, hachureGap: 5, fillWeight: 1.4, roughness: 1.4 }))
    const blue = el('g', { style: 'mix-blend-mode:multiply' }, svg)
    blue.appendChild(rc.path('M 780 40 C 640 150, 520 30, 380 120 S 140 160, 20 100 L 20 130 C 150 190, 300 150, 380 160 S 650 200, 780 80 Z', { seed: s + 5, stroke: BLUE, strokeWidth: 1.3, fill: BLUE, fillStyle: 'hachure', hachureAngle: -40, hachureGap: 5, fillWeight: 1.4, roughness: 1.4 }))
  })
  return (
    <div className="border-[1.5px] border-[#2a2f35] bg-white">
      <svg ref={ref} viewBox="0 0 800 240" className="block w-full" aria-hidden="true" />
    </div>
  )
}

export default function Storyboard() {
  useEffect(() => {
    document.documentElement.style.background = '#dfe3e2'
    document.title = 'Ali Sh'
  }, [])
  return (
    <div className="min-h-screen pt-6 pb-24 sm:pt-10" style={{ fontFamily: '"Hanken Grotesk Variable", ui-sans-serif, system-ui, sans-serif', background: `${GRAIN}, #dfe3e2` }}>
      <Sheet fields={[['Production', 'Ali Sh'], ['Location', 'Beirut'], ['Scene', 'Hexus']]}>
        <div className="mt-9 grid items-end gap-6 lg:grid-cols-[1.4fr_1fr]">
          <h1 className="text-[clamp(2.4rem,5.2vw,4.6rem)] leading-[0.98] font-semibold tracking-[-0.035em] text-balance text-[#22272c]">
            I build the tools agents work with.
          </h1>
          <p className="max-w-md text-[17px] leading-relaxed text-[#4a5159]">
            Mostly in Rust. I build tools I wish existed, then obsess over how they feel. I still think like a motion designer.
          </p>
        </div>
        <div className="mt-10">
          <Strip />
        </div>
      </Sheet>

      <div className="h-10" />

      <Sheet fields={[['Production', 'Ali Sh'], ['Location', 'Beirut'], ['Scene', 'Both seats']]}>
        <h2 className="mt-9 max-w-3xl text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-[#22272c]">
          Purple teaming is where I'm heading
        </h2>
        <div className="mt-8">
          <PurpleSketch />
        </div>
        <p
          className="mt-3 max-w-2xl text-[15px] leading-[26px] text-[#2a2f35]"
          style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 25px, ${TEMPLATE} 25px 26px)` }}
        >
          I want to run the attack against my own systems, then watch the same run from the defender's side and fix whatever only one side saw.
        </p>
      </Sheet>
    </div>
  )
}
