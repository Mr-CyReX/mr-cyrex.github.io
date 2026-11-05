import { lazy, Suspense, useEffect } from 'react'

// Review build: three directions side by side, picked with ?d=.
const DIRECTIONS = {
  experience: { name: 'Experience', line: 'One continuous run, scene into scene', load: lazy(() => import('./directions/Experience.jsx')) },
  storyboard: { name: 'Storyboard', line: 'Agent runs drawn as a hand animated storyboard', load: lazy(() => import('./directions/Storyboard.jsx')) },
  path: { name: 'Motion path', line: 'The cubic curve from the README, live and draggable', load: lazy(() => import('./directions/MotionPath.jsx')) },
  v1: { name: 'First version', line: 'The night meadow build, kept for comparison', load: lazy(() => import('./v1/App.jsx')) },
}

function Switcher({ current }) {
  return (
    <>
      <label className="fixed top-3 right-3 z-50 sm:hidden">
        <span className="sr-only">Direction</span>
        <select
          value={current}
          onChange={(e) => (window.location.search = `?d=${e.target.value}`)}
          className="h-9 rounded-full border border-white/15 bg-black/70 px-3 text-[13px] text-white"
        >
          {Object.entries(DIRECTIONS).map(([id, d]) => (
            <option key={id} value={id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <SwitcherBar current={current} />
    </>
  )
}

function SwitcherBar({ current }) {
  return (
    <nav
      aria-label="Directions"
      className="fixed bottom-3 left-1/2 z-50 hidden -translate-x-1/2 gap-1 rounded-full bg-black/80 p-1 text-[13px] text-white shadow-[0_6px_24px_rgba(0,0,0,0.25)] backdrop-blur sm:flex"
    >
      {Object.entries(DIRECTIONS).map(([id, d]) => (
        <a
          key={id}
          href={`?d=${id}`}
          aria-current={id === current ? 'page' : undefined}
          className={`rounded-full px-3 py-1.5 transition-colors duration-150 ${id === current ? 'bg-white text-black' : 'hover:bg-white/15'}`}
        >
          {d.name}
        </a>
      ))}
    </nav>
  )
}

function Picker() {
  useEffect(() => {
    document.documentElement.style.background = '#f4f4f2'
  }, [])
  return (
    <main className="mx-auto max-w-xl px-6 py-24 font-[Geist_Variable] text-[#17191c]">
      <h1 className="text-3xl font-semibold tracking-tight">Two directions</h1>
      <ul className="mt-10 space-y-6">
        {Object.entries(DIRECTIONS).map(([id, d]) => (
          <li key={id}>
            <a href={`?d=${id}`} className="group block">
              <span className="text-xl font-medium underline decoration-black/20 underline-offset-4 group-hover:decoration-black">{d.name}</span>
              <span className="mt-1 block text-[15px] text-black/60">{d.line}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function App() {
  const id = new URLSearchParams(window.location.search).get('d') || 'experience'
  const dir = DIRECTIONS[id]
  if (!dir) return <Picker />
  const View = dir.load
  return (
    <>
      <Suspense fallback={null}>
        <View />
      </Suspense>
      <Switcher current={id} />
    </>
  )
}
