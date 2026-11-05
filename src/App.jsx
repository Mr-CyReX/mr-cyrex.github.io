import { useCallback, useRef, useState } from 'react'
import Scene from './components/Scene.jsx'
import SystemMap from './components/SystemMap.jsx'
import { createMeadow } from './scenes/meadow.js'
import { createAgents } from './scenes/agents.js'
import { createStreams } from './scenes/streams.js'
import { createLeaves } from './scenes/leaves.js'

const GITHUB = 'https://github.com/Mr-CyReX'

const NAV = [
  ['agents', 'Agents'],
  ['security', 'Security'],
  ['systems', 'Systems'],
  ['motion', 'Motion'],
]

function Mark() {
  return (
    <span className="font-mono text-[15px] font-medium tracking-tight text-ink">
      &lt;/<span className="text-sky">Cy</span>&gt;
    </span>
  )
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" aria-label="Back to the top" className="btn rounded-md">
          <Mark />
        </a>
        <nav className="flex items-center gap-6 rounded-full border border-line bg-ground/70 px-5 py-2 backdrop-blur-md">
          {NAV.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="ulink hidden text-sm text-muted transition-colors duration-200 hover:text-ink md:inline">
              {label}
            </a>
          ))}
          <a href={GITHUB} className="ulink text-sm text-ink" rel="noreferrer">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  )
}

function Words({ text, offset = 0 }) {
  return text.split(' ').map((word, i) => (
    <span key={i} className="arrive inline-block" style={{ '--i': i + offset }}>
      {word}
      {' '}
    </span>
  ))
}

function Hero() {
  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div className="absolute inset-0">
        <Scene create={createMeadow} />
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-5 pt-16 pb-40 sm:px-8">
        <p className="arrive font-mono text-sm text-muted" style={{ '--i': 0 }}>
          Ali Sh, Beirut
        </p>
        <h1 className="mt-5 max-w-4xl text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.98] font-semibold tracking-[-0.03em] text-balance">
          <Words text="I build the tools agents work with." offset={1} />
        </h1>
        <p className="arrive mt-7 max-w-xl text-lg leading-relaxed text-muted" style={{ '--i': 8 }}>
          Mostly in Rust. I build tools I wish existed, then obsess over how they feel.
        </p>
        <div className="arrive mt-9 flex flex-wrap gap-3" style={{ '--i': 9 }}>
          <a href="#agents" className="btn rounded-full bg-ink px-6 py-3 text-sm font-medium text-ground hover:bg-white">
            See what I'm building
          </a>
          <a href={GITHUB} rel="noreferrer" className="btn rounded-full border border-line-strong px-6 py-3 text-sm font-medium text-ink hover:border-dim">
            Open my GitHub
          </a>
        </div>
      </div>
    </section>
  )
}

function Section({ id, title, children, visual, flip = false }) {
  return (
    <section id={id} className="flex min-h-[100svh] scroll-mt-16 items-center py-24">
      <div
        className={`mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:gap-16 ${
          flip ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]' : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'
        }`}
      >
        <div className={flip ? 'lg:order-2' : ''}>
          <h2 className="text-[clamp(2rem,4vw,3.1rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance">{title}</h2>
          <div className="mt-6 space-y-5 text-[1.05rem] leading-relaxed text-muted">{children}</div>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>{visual}</div>
      </div>
    </section>
  )
}

function Frame({ children, className = '' }) {
  return <div className={`overflow-hidden rounded-2xl border border-line bg-panel ${className}`}>{children}</div>
}

function Chips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2 pt-1">
      {items.map((t) => (
        <li key={t} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-dim">
          {t}
        </li>
      ))}
    </ul>
  )
}

function AgentRun() {
  const [lines, setLines] = useState(() => [
    { key: -3, tool: 'memory', action: 'recall the last session', color: '#f4f6f8' },
    { key: -2, tool: 'repo', action: 'open the failing test', color: '#69c8ff' },
    { key: -1, tool: 'shell', action: 'run cargo check', color: '#8dff78' },
  ])
  const counter = useRef(0)
  const onStep = useCallback((step) => {
    counter.current += 1
    const line = { ...step, key: counter.current }
    setLines((prev) => [...prev.slice(-5), line])
  }, [])

  return (
    <Frame>
      <div className="aspect-[4/3] w-full">
        <Scene create={createAgents} options={{ onStep }} />
      </div>
      <div className="border-t border-line px-5 py-4 font-mono text-[13px]">
        <ol className="h-[9.5rem] space-y-1.5 overflow-hidden" aria-live="off">
          {lines.map((l) => (
            <li key={l.key} className="line-in flex items-baseline gap-3">
              <span className="inline-block h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full" style={{ background: l.color }} />
              <span className="w-16 shrink-0 text-dim">{l.tool}</span>
              <span className="text-ink">{l.action}</span>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />

        <Section id="agents" title="Agents get a real machine to work on" visual={<AgentRun />}>
          <p>
            Screenshot and click guessing got old, so I built Computer Control MCP. Agents get real Windows
            controls through IPC and stop hunting for pixels.
          </p>
          <p>
            Hexus takes most of my time. It's my own harness for projects, agents, tools and the machine they
            run on, written in Rust with GPUI and SQLite.
          </p>
          <Chips items={['Rust', 'GPUI', 'SQLite', 'MCP', 'Windows IPC']} />
        </Section>

        <Section
          id="security"
          flip
          title="Purple teaming is where I'm heading"
          visual={
            <Frame>
              <div className="aspect-[4/3] w-full">
                <Scene create={createStreams} />
              </div>
            </Frame>
          }
        >
          <p>
            I want both seats. Run the attack against my own systems, then watch the same run from the
            defender's side and fix what neither side caught.
          </p>
          <p>
            Building agents makes this personal. Anything that can click, type and run commands on a machine is
            something I'd rather break myself first.
          </p>
        </Section>

        <Section
          id="systems"
          title="Systems that keep a record"
          visual={
            <Frame className="p-4 sm:p-6">
              <SystemMap />
            </Frame>
          }
        >
          <p>
            I start with the boundaries, mostly who can do what and what gets written down when the data
            changes.
          </p>
          <p>
            OpsDesk is the one I can show. It moves work out of spreadsheets into roles, approvals and imports,
            with an audit trail over all of it and the data kept local.
          </p>
        </Section>

        <Section
          id="motion"
          flip
          title="I still think like a motion designer"
          visual={
            <Frame>
              <div className="aspect-[4/3] w-full cursor-crosshair">
                <Scene create={createLeaves} />
              </div>
            </Frame>
          }
        >
          <p>
            Timing, hierarchy, transitions and polish end up in the software too. I don't really separate the two
            anymore.
          </p>
          <p>
            Rill is my excuse to keep pushing GPUI, Rive, window motion and native desktop UX a little harder.
          </p>
          <Chips items={['Rive', 'GPUI', 'Slint']} />
        </Section>

        <section className="flex min-h-[70svh] items-center border-t border-line py-24">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 className="max-w-3xl text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
              Most of my work is private
            </h2>
            <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-muted">
              GitHub only gets to count part of it. The pieces I can share live there, and that's the best
              place to reach me.
            </p>
            <a
              href={GITHUB}
              rel="noreferrer"
              className="btn mt-9 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-ground hover:bg-white"
            >
              Open my GitHub
            </a>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-8 text-sm text-dim sm:px-8">
          <Mark />
          <span>Ali Sh</span>
        </div>
      </footer>
    </>
  )
}
