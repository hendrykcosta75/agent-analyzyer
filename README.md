# OpenClaw / Hermes — Agent Observatory (Frontend · Phase 1)

Read-only observability dashboard for watching agents work in real time.
This repository currently contains **only the Phase 1 frontend**: a pure,
mocked React app used to validate the visual language before any backend or
Gateway integration (Phase 2).

> No backend, no `.env`, no live connections. All data is simulated in the
> browser. The data model mirrors the Phase 2 protocol so the real adapter can
> be plugged in without touching the UI.

## Stack

- **TypeScript** (strict) + **React 18** + **Vite**
- **React Three Fiber** / **three.js** + **postprocessing** (bloom) for the
  isometric node map, with an automatic **2D SVG fallback** when WebGL is
  unavailable.
- **react-router** for routing and a frontend-only, in-memory auth session.

## Getting started

```bash
npm install
npm run dev      # http://127.0.0.1:5317
```

Other scripts:

```bash
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run typecheck  # tsc project references
```

### Demo login

Phase 1 uses a mock, in-memory session (resets on reload — no tokens, no
`localStorage`, matching the MVP security rules):

- **username:** `admin`
- **password:** `change-me`

## Screens

| Route        | Description                                                        |
| ------------ | ----------------------------------------------------------------- |
| `/login`     | Dark themed login with basic client-side rate limiting.           |
| `/overview`  | Agent network map (GRAPH / RUNS / TOOLS / TRACE) + metric cards.   |
| `/agents`    | Read-only agent roster: status, activity, sessions, tools, errors.|
| `/sessions`  | Read-only execution timeline.                                     |
| `/risks`     | Risk / error events. No operational actions (observe-only).       |

## Visual language

Adapted from the reference control-center mock:

- Near-black surfaces (`#030304`/`#050506`/`#09090a`), thin translucent
  hairlines, compact uppercase monospace type.
- Accent green `#8cff6a`, risk red `#ff4b4b`, waiting amber `#ffd15e`,
  info blue `#8ac9ff`.
- Central **gateway hub** in green, **agents** as orbital nodes, **tools /
  skills / MCPs** as smaller nodes wired to their agent. Active calls send a
  green pulse toward the target; errors turn red; completed work dims to white.

## Project structure

```
src/
  components/
    cards/        # event velocity, agent lifecycle, gateway health
    graph/        # R3F scene, flow pulses, 2D SVG fallback
    layout/       # header, sidebar, app shell
    icons.tsx
  data/           # mock agents/tools, seed events, sessions, connectors
  features/
    overview/     # network panel (graph + tabs)
  lib/            # graph layout, theme, time, webgl detection
  pages/          # login, overview, agents, sessions, risks
  state/          # auth + observatory (simulated live feed)
  styles/         # design tokens + app layout
  types/          # normalized visual model (shared with Phase 2)
```

## Phase 2 (not in this repo yet)

The `state/observatory` provider is the single seam: replace the in-browser
simulation with a real feed from the `agent-observatory-adapter`
(OpenClaw Gateway WebSocket → normalized events → SSE/WebSocket → web), keeping
the same `VisualNode` / `VisualEdge` / `NormalizedAgentEvent` contracts.
```
