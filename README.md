# mr-cyrex.github.io

Personal site for Ali Sh. It is a React and Vite app styled with Tailwind, and it runs on Cloudflare Workers.

## Run it

```
npm install
npm run dev       # local dev server
npm run build     # output goes to dist/
npm run lint
```

## What is in it

- `src/App.jsx` holds the page sections.
- `src/scenes/` holds the canvas scenes: the meadow hero, the agent hub, the orbit, and the leaves.
- `src/components/SystemMap.jsx` is the animated system diagram, driven by anime.js.
- `src/lib/canvas.js` has the shared canvas loop, which pauses off screen.
- `legacy/` is the previous static site, kept for comparison.

Fonts are Geist and Geist Mono, bundled with the build.

## Deploy

Workers Builds runs `npm run build` and serves `dist/` using `wrangler.jsonc`. Non-production branches get their own preview.
