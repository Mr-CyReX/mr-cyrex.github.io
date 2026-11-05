import { useEffect, useRef } from 'react'
import { clamp, easeInOut, prefersReduced, useLoop } from '../lib/loop.js'

const GROUND = '#08090b'
const LINE = '#2c333b'
const DIM = '#8a949f'
const INKC = '#f4f6f8'
const BLUE = '#69c8ff'
const GREEN = '#8dff78'

const STEPS = ['focus the editor window', 'read what is on screen', 'click Save', 'run the tests again']
const KEYS = [0, 0.22, 0.47, 0.74, 1]
const SEG = 1.5 // seconds per segment, plus a hold on each keyframe
const HOLD = 0.45

function bez(p, t) {
  const u = 1 - t
  return [
    u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0],
    u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1],
  ]
}

// arc length table so keyframes sit at even distances, whatever the handles do
function table(p) {
  const out = [[0, 0]]
  let len = 0
  let prev = bez(p, 0)
  for (let i = 1; i <= 200; i++) {
    const q = bez(p, i / 200)
    len += Math.hypot(q[0] - prev[0], q[1] - prev[1])
    out.push([i / 200, len])
    prev = q
  }
  return { out, len }
}
function atDist(tab, f) {
  const target = f * tab.len
  let lo = 0
  let hi = tab.out.length - 1
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (tab.out[m][1] < target) lo = m + 1
    else hi = m
  }
  return tab.out[lo][0]
}

// where the agent is along the run at a given clock time, as a fraction of length
function progress(clock) {
  const per = SEG + HOLD
  const total = per * (KEYS.length - 1)
  const c = ((clock % total) + total) % total
  const i = Math.min(KEYS.length - 2, Math.floor(c / per))
  const local = clamp((c - i * per) / SEG)
  return { f: KEYS[i] + (KEYS[i + 1] - KEYS[i]) * easeInOut(local), seg: i, local, arrived: c - i * per >= SEG }
}

export default function MotionPath() {
  const root = useRef(null)
  const svg = useRef(null)
  const canvas = useRef(null)
  const graph = useRef(null)
  const trace = useRef(null)
  const st = useRef({ p: null, w: 0, h: 0, tab: null, drag: -1, reduce: false, logged: -1 })

  useEffect(() => {
    document.documentElement.style.background = GROUND
    document.title = 'Ali Sh'
    st.current.reduce = prefersReduced()
    const el = root.current
    const fit = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      const s = st.current
      const portrait = h > w
      s.w = w
      s.h = h
      s.p = portrait
        ? [[w * 0.1, h * 0.93], [w * 0.2, h * 0.55], [w * 0.95, h * 0.95], [w * 0.88, h * 0.6]]
        : [[w * 0.07, h * 0.8], [w * 0.36, h * 1.02], [w * 0.5, h * 0.3], [w * 0.93, h * 0.36]]
      s.tab = table(s.p)
      svg.current.setAttribute('viewBox', `0 0 ${w} ${h}`)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handle = (i) => ({
    onPointerDown: (e) => {
      st.current.drag = i
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e) => {
      const s = st.current
      if (s.drag !== i) return
      const r = svg.current.getBoundingClientRect()
      s.p[i] = [clamp(e.clientX - r.left, 8, s.w - 8), clamp(e.clientY - r.top, 8, s.h - 8)]
      s.tab = table(s.p)
    },
    onPointerUp: () => (st.current.drag = -1),
  })

  useLoop(root, (now) => {
    const s = st.current
    if (!s.p) return
    const p = s.p
    const S = svg.current
    S.querySelector('[data-path]').setAttribute('d', `M ${p[0]} C ${p[1]} ${p[2]} ${p[3]}`)
    const hl = S.querySelectorAll('[data-hl]')
    hl[0].setAttribute('d', `M ${p[0]} L ${p[1]}`)
    hl[1].setAttribute('d', `M ${p[3]} L ${p[2]}`)
    S.querySelectorAll('[data-h]').forEach((n, i) => n.setAttribute('transform', `translate(${p[i][0]} ${p[i][1]})`))
    const kf = S.querySelectorAll('[data-key]')
    KEYS.slice(1, -1).forEach((f, i) => {
      const [x, y] = bez(p, atDist(s.tab, f))
      kf[i].setAttribute('transform', `translate(${x} ${y})`)
    })

    const clock = s.reduce ? 0 : now
    const pr = progress(clock)

    // real shutter: average the agent over the last slice of time
    const c = canvas.current
    const ctx = c.getContext('2d')
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (c.width !== Math.round(s.w * dpr) || c.height !== Math.round(s.h * dpr)) {
      c.width = Math.round(s.w * dpr)
      c.height = Math.round(s.h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, s.w, s.h)
    const N = s.reduce ? 1 : 14
    const shutter = 0.09
    for (let k = 0; k < N; k++) {
      const q = progress(clock - (k / N) * shutter)
      const [x, y] = bez(p, atDist(s.tab, q.f))
      ctx.globalAlpha = 1.6 / N
      ctx.fillStyle = INKC
      ctx.beginPath()
      ctx.arc(x, y, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    const [ax, ay] = bez(p, atDist(s.tab, pr.f))
    ctx.fillStyle = INKC
    ctx.beginPath()
    ctx.arc(ax, ay, 4, 0, Math.PI * 2)
    ctx.fill()

    // keyframes light up as the agent lands on them, and the step prints
    kf.forEach((n, i) => n.setAttribute('data-hit', String(pr.arrived && pr.seg === i)))
    const label = pr.arrived ? STEPS[Math.min(STEPS.length - 1, pr.seg)] : null
    if (label && s.logged !== pr.seg + Math.floor(clock / ((SEG + HOLD) * 4)) * 10) {
      s.logged = pr.seg + Math.floor(clock / ((SEG + HOLD) * 4)) * 10
      const li = document.createElement('li')
      li.textContent = label
      li.className = 'trace-in'
      trace.current.appendChild(li)
      while (trace.current.children.length > 4) trace.current.firstChild.remove()
    }

    // the speed graph: how fast the agent moves through each segment
    const g = graph.current
    const gw = g.clientWidth
    const gh = g.clientHeight
    const gp = g.querySelector('path')
    const per = SEG + HOLD
    const total = per * (KEYS.length - 1)
    if (!g.dataset.w || +g.dataset.w !== gw) {
      g.dataset.w = gw
      g.setAttribute('viewBox', `0 0 ${gw} ${gh}`)
      let d = ''
      for (let i = 0; i <= 240; i++) {
        const t = (i / 240) * total
        const v = Math.abs(progress(t + 0.01).f - progress(t - 0.01).f)
        const y = gh - 4 - Math.min(1, v / 0.012) * (gh - 10)
        d += `${i ? 'L' : 'M'} ${(i / 240) * gw} ${y} `
      }
      gp.setAttribute('d', d)
    }
    const ph = g.querySelector('line')
    const x = ((clock % total) / total) * gw
    ph.setAttribute('x1', x)
    ph.setAttribute('x2', x)
  })

  return (
    <div className="min-h-screen" style={{ background: GROUND, color: INKC, fontFamily: '"Geist Variable", ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`
        [data-key] rect { transition: fill 180ms ease, transform 260ms cubic-bezier(.16,1,.3,1); transform-box: fill-box; transform-origin: center; }
        [data-key][data-hit="true"] rect { fill: ${GREEN}; stroke: ${GREEN}; transform: rotate(45deg) scale(1.35); }
        [data-h] { cursor: grab; }
        [data-h]:active { cursor: grabbing; }
        @keyframes trace-in { from { opacity: 0; transform: translateY(6px) } }
        .trace-in { animation: trace-in 220ms cubic-bezier(.16,1,.3,1) both; }
        .trace-in:not(:last-child) { color: ${DIM}; }
        @media (prefers-reduced-motion: reduce) { .trace-in { animation: none } }
      `}</style>
      <section ref={root} className="relative h-[100svh] overflow-hidden select-none">
        <svg ref={svg} className="absolute inset-0 h-full w-full touch-none" aria-hidden="true">
          <path data-path fill="none" stroke={BLUE} strokeWidth="1.5" />
          <path data-hl fill="none" stroke={LINE} strokeWidth="1" />
          <path data-hl fill="none" stroke={LINE} strokeWidth="1" />
          {KEYS.slice(1, -1).map((_, i) => (
            <g key={i} data-key>
              <rect x="-5" y="-5" width="10" height="10" fill={GROUND} stroke={BLUE} strokeWidth="1.5" style={{ transform: 'rotate(45deg)' }} />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g key={i} data-h {...handle(i)}>
              <circle r="22" fill="transparent" />
              {i === 0 || i === 3 ? (
                <rect x="-5" y="-5" width="10" height="10" fill={GROUND} stroke={INKC} strokeWidth="1.5" />
              ) : (
                <circle r="5" fill={GROUND} stroke={DIM} strokeWidth="1.5" />
              )}
            </g>
          ))}
        </svg>
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
        <div className="pointer-events-none relative mx-auto max-w-6xl px-6 pt-20 sm:px-10 sm:pt-24">
          <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,5.2rem)] leading-[0.96] font-semibold tracking-[-0.04em] text-balance">
            I build the tools agents work with.
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-[#a4adb7]">
            Mostly in Rust. I build tools I wish existed, then obsess over how they feel. Drag the handles and the run retimes itself.
          </p>
        </div>
        <div className="absolute right-6 bottom-24 left-6 sm:right-10 sm:left-auto sm:w-72">
          <ol ref={trace} className="space-y-1 font-mono text-[13px] text-[#f4f6f8]" style={{ fontFamily: '"Geist Mono Variable", ui-monospace, monospace' }} aria-live="off" />
          <svg ref={graph} className="mt-4 block h-12 w-full" aria-hidden="true">
            <path fill="none" stroke={GREEN} strokeWidth="1.25" />
            <line y1="0" y2="48" stroke={INKC} strokeWidth="1" opacity="0.6" />
          </svg>
        </div>
      </section>
      <section className="border-t border-[#1b2026] px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.03em]">Purple teaming is where I'm heading</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#a4adb7]">
            I want to run the attack against my own systems, then watch the same run from the defender's side and fix whatever only one side saw.
          </p>
        </div>
      </section>
    </div>
  )
}
