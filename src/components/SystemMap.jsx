import { useEffect, useRef } from 'react'
import { animate, stagger, svg } from 'animejs'
import { reducedMotion } from '../lib/canvas.js'

const NODES = [
  { id: 'imports', x: 40, y: 60 },
  { id: 'requests', x: 40, y: 200 },
  { id: 'roles', x: 230, y: 200 },
  { id: 'approvals', x: 420, y: 200 },
  { id: 'local data', x: 420, y: 60 },
  { id: 'audit trail', x: 230, y: 340 },
]
const W = 140
const H = 44
const mid = (id) => {
  const n = NODES.find((m) => m.id === id)
  return { x: n.x + W / 2, y: n.y + H / 2 }
}

// Each route is a path a record can take; the last two feed the audit trail.
const ROUTES = [
  { d: `M${mid('imports').x + W / 2} ${mid('imports').y} L${mid('local data').x - W / 2} ${mid('local data').y}`, dur: 2600, color: '#69c8ff' },
  {
    d: `M${mid('requests').x + W / 2} ${mid('requests').y} L${mid('roles').x - W / 2} ${mid('roles').y} M${mid('roles').x + W / 2} ${mid('roles').y} L${mid('approvals').x - W / 2} ${mid('approvals').y} M${mid('approvals').x} ${mid('approvals').y - H / 2} L${mid('local data').x} ${mid('local data').y + H / 2}`,
    dur: 3400,
    color: '#8dff78',
  },
  { d: `M${mid('roles').x} ${mid('roles').y + H / 2} L${mid('audit trail').x} ${mid('audit trail').y - H / 2}`, dur: 1800, color: '#f4f6f8' },
  {
    d: `M${mid('approvals').x} ${mid('approvals').y + H / 2} C${mid('approvals').x} ${mid('audit trail').y} ${mid('approvals').x - 40} ${mid('audit trail').y} ${mid('audit trail').x + W / 2} ${mid('audit trail').y}`,
    dur: 2200,
    color: '#f4f6f8',
  },
]

const GHOSTS = 4

export default function SystemMap() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (reducedMotion()) return
    const anims = []
    root.querySelectorAll('[data-route]').forEach((path, i) => {
      const route = ROUTES[i]
      const dots = root.querySelectorAll(`[data-pulse="${i}"]`)
      // ghost copies trail the lead dot by a few frames, which reads as motion blur
      anims.push(
        animate(dots, {
          ...svg.createMotionPath(path),
          duration: route.dur,
          ease: 'inOut(2)',
          loop: true,
          loopDelay: 500 + i * 300,
          delay: stagger(26, { start: i * 450 }),
          autoplay: false,
        }),
      )
    })
    const io = new IntersectionObserver(([e]) => anims.forEach((a) => (e.isIntersecting ? a.play() : a.pause())))
    io.observe(root)
    return () => {
      io.disconnect()
      anims.forEach((a) => a.revert())
    }
  }, [])

  return (
    <svg ref={ref} viewBox="0 0 600 404" className="h-auto w-full" aria-hidden="true">
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect x="11" y="11" width="1" height="1" fill="#121a22" />
        </pattern>
      </defs>
      <rect width="600" height="404" fill="url(#grid)" />
      {ROUTES.map((r, i) => (
        <path key={i} data-route d={r.d} fill="none" stroke="#303943" strokeWidth="1.25" />
      ))}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={W} height={H} rx="10" fill="#070b10" stroke="#303943" />
          <text x={n.x + W / 2} y={n.y + H / 2 + 4} textAnchor="middle" fill="#a4adb7" fontFamily="'Geist Mono Variable', ui-monospace, Consolas, monospace" fontSize="13">
            {n.id}
          </text>
        </g>
      ))}
      {ROUTES.map((r, i) =>
        Array.from({ length: GHOSTS }, (_, k) => (
          <circle
            key={`${i}-${k}`}
            data-pulse={i}
            r={k === 0 ? 4 : 4 - k * 0.6}
            fill={r.color}
            opacity={k === 0 ? 1 : 0.45 - k * 0.1}
            cx="0"
            cy="0"
            style={{ transform: 'translate(-20px,-20px)' }}
          />
        )),
      )}
    </svg>
  )
}
