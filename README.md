# glm-v1 — CUTROOM

**One continuous edit. Scroll is the playhead.**

Built from Cy's interviews, CY-DNA and the AGENT.md hard rules. Vanilla HTML/CSS/JS — zero dependencies, zero build step, zero install. v24's smooth motion + gpt-v2's clean look, without the broken scroll or the jank.

## The concept

- **Boot** — terminal roll, `</Cy>` per-char, VHS stutter bar (jams are seeded — feels different every visit), shutter exit. The room starts forming *behind* the shutters before they finish opening: anticipation first.
- **CUT01 · Cold Open** — kinetic `</Cy>`, roles as a render queue, procedural bass bars (140bpm kick, no audio file).
- **CUT02 · The Graph** — pick an easing tile, watch the dot travel the curve and the runner land with matching squash. The house curve `cubic-bezier(.22,1,.36,1)` is one click away.
- **CUT03 · Kinetic** — type as geometry: spacing, overshoot, a bar that stops being type and resolves back.
- **CUT04 · The Stack** — plate / subject / fx / grade / ui stack in with mask wipes and rebuild on every re-entry. Pointer parallax on desktop.
- **CUT05 · Final Cut** — clapper raises, holds (anticipation), slams: squash, 1-frame flash, snap. Text and CTAs flow in *after* the impact. CTA at the end only, as it should be.

## The desk (AE language, functional)

- 5 layers = 5 cuts, keyframe diamonds at boundaries
- playhead is locked to your scroll, timecode runs at 24f
- **drag the playhead to scrub the site**, click a layer to jump
- `U` folds/unfolds (AE muscle memory), auto-collapsed on mobile

## Systems

- light/dark + 4 accent skins (cobalt / ice / violet / lime) — persisted
- sound: synthesized WebAudio (tick / whoosh / clap / ambient pad) — **off by default**, toggle in topbar or `S`
- force-motion is on: no reduced-motion suppression (AGENT.md rule)
- performance grade system: weak devices get fewer bars, no grain, no parallax, no backdrop blur — the experience survives, the cost adapts
- error trap: red `ERR ×n` badge bottom-left on any error — click it to copy a relay-ready report
- easter egg: small, for people who type

## Hard rules honored

no gradients · no stroke-drawn lines · no scroll hijacking (native scroll + snap) · transform/opacity/clip-path only · 375px tested · cuts land 1–2f early · CTAs at the end only.

## Run it

No install. No build. Either:

- **double-click `index.html`** (works from disk), or
- serve the folder (nicer): `python -m http.server 8123` then open `http://localhost:8123`, or `npx serve .`

## Keys

`U` fold desk · `T` theme · `A` accent · `S` sound · arrows/PageUp/PageDown scroll natively

## Wire your links

Open `app.js`, top of file:

```js
const CY_LINKS = {
  sample: 'mailto:you@example.com?subject=free%20sample%20edit',
  hi: 'mailto:you@example.com',
};
```

Until then the CTAs show a toast instead of a dead link.

## Relay errors to GLM

1. any error → red `ERR ×n` badge appears bottom-left
2. click it → a full report (message, file:line, stack, viewport, theme, accent, scroll%) is copied to your clipboard
3. paste it back in the chat, plus a screenshot if it's visual (overlaps, clipping)
4. for visual bugs without an error: F12 → Console tab → screenshot anything red

Desktop tested at 1440×900 and mobile at 375×812 before push.
