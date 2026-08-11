# CodeAnvil

**Forge Your Logic.**

CodeAnvil is a visual coding and DSA platform that lets students watch code execute step by step — through variables, stack frames, recursion trees, and algorithm animations.

> 🛠️ **Status: MVP + P1/P2 modules (Milestones 1–5 of docs/33).** Code Playback Lab, DSA Arena, Story Mode, Skill Duel, and the Universal Code Visualizer — all local-first, no backend, nothing executes user code.

## The Problem

Most beginner programmers don't struggle because syntax is hard — they struggle because code execution is invisible. Variables change invisibly. Loops repeat invisibly. The call stack grows invisibly. Recursion feels like magic.

## What it does

- **Watch code execute** — pick one of 9 examples, press play, and watch the current line glow while variables, memory, the call stack, and console output update live.
- **3D execution stage** — a toggleable Three.js stage renders array bars, variable chips, call-stack plates, and BFS/DFS grids in 3D, animating with every step.
- **Live sound + commentary** — every step taps a synthesized Web Audio hammer-tap, answers play rising arpeggios or low buzzes, and a typewriter commentary bar narrates each step in plain English (mutable in the sidebar).
- **Ambient forge** — every page sits on a slowly drifting aurora with rising ember particles, an engineering grid, and a soft glow that trails your cursor; a session-scoped "forge heat" gauge rises as you work and cools when idle.
- **See recursion grow** — the recursion tree builds call by call and resolves with return values.
- **Dry-run practice** — predict the next value/output before it's revealed; get scored with streaks that feed dashboard stats and story missions.
- **DSA Arena** — live simulators (not prebuilt traces): bubble/selection/insertion sort, binary search, and a BFS vs DFS race on mazes you build, all in 3D with real metrics and replay.
- **DSA Atlas library** — **36 data structures · 261 curated problems** across 22 topics/patterns with per-problem **LeetCode links** (each row opens the live problem for editorials), plus **company tags** (Google/Amazon/…) on the most-asked problems, a **Core 50** curated tier, a click-to-cycle **status per problem**, a full **progress matrix** with **spaced review** (attempted → 1d, solved → 3d, mastered → graduates), and a **Patterns tab** — 12 concept pages with a looping 3D bar demo for each.
- **Universal Code Visualizer** — paste code in any of 14+ language families; known patterns (sum, max, factorial, fib, binary search, bubble sort, **two sum with a hash map**) are regenerated as polished traces — the two-sum trace grows the `seen` map step by step in the 3D stage and glows the found pair — and anything else gets the **Code Galaxy**: a 3D renderer that turns every line of any-language code into a glowing arc of token-blocks on a spiral, with the executing line lighting up as you play (Stage/Galaxy toggle).
- **Story Mode** — worlds, missions, XP, and badges; unlock visual themes (Plasma / Arc / Verdant) by earning XP.
- **Skill Duel** — timed dry-run challenges, a deterministic daily duel, a local leaderboard, shareable results, and **Vs Ghost**: race the same questions against your best recorded pace — beat it and the ghost gets faster.
- **Save sessions** — playback position is saved in the browser (localStorage); resume where you left off.
- **Accounts (demo auth)** — sign up / sign in with email+password or **Google (demo OAuth)** at `#/auth`; the sidebar and dashboard show your profile. Local-first for now — real Google OAuth + sync ship with the backend (Milestone 6).
- **One motion language everywhere** — a shared animation kit (`components/motionfx.tsx`) applies the landing page's treatment to every screen: word-clip headline reveals, count-up stats, staggered card entrances, HUD-framed 3D viewports with scanning sweeps, and shimmer CTAs — all `prefers-reduced-motion` safe.

Nothing executes. Examples ship with hand-authored traces; Arena and Visualizer runs come from CodeAnvil's own simulators (see `docs/codeanvil-docs/16-trace-format.md`), so playback is deterministic and safe by design.

**Light & dark mode** — toggle from the sidebar (app screens) or the landing nav. Your choice persists in `localStorage`; first-time visitors follow their OS setting. Light mode repaints every surface via the shared CSS-variable palette and dims the 3D backdrops (cosmos/ambient) so they stay atmospheric instead of dominating.

## Demo examples

| Example | Topic | What you'll see |
| --- | --- | --- |
| Sum of Array | arrays | a loop builds up a running total |
| Max in Array | arrays | a running maximum updates only when beaten |
| Factorial (Loop) | loops | result grows 1 → 2 → 6 → 24 → 120 |
| Factorial Recursion | recursion | call stack + recursion tree for `fact(4)` |
| Fibonacci Recursion | recursion | 15 calls, overlapping subproblems in the tree |
| Binary Search | searching | probe `mid`, discard halves, find 7 in 3 steps |
| Bubble Sort | sorting | comparisons, swaps, and a sorted prefix |
| BFS on a Grid | graphs | a queue ripples level by level to the goal |
| DFS on a Grid | graphs | a stack dives deep and backtracks |
| Merge Sort | sorting | split → merge with recorded compares and writes |
| Quick Sort | sorting | Lomuto partition, pivot lands in final position |
| Heap Sort | sorting | heapify, then extract the max into the sorted tail |
| Palindrome Check | two pointers | converging pointers find the first mismatch |
| Inorder Traversal | trees | left → node → right over a heap-indexed tree |
| Two Sum (Sorted) | two pointers | converging pointers hunt the target pair |

## Tech stack

- React 19 + Vite + TypeScript
- Tailwind CSS (v4)
- Three.js + @react-three/fiber + @react-three/drei (3D forge hero, 3D execution stage, 3D arena visualizers — all code-split)
- Motion (scroll reveals, reduced-motion aware)
- CodeMirror 6 (code panel with executing-line highlight)
- Space Grotesk + JetBrains Mono (self-hosted via Fontsource)
- Lucide icons
- localStorage (MVP storage)
- Vitest (unit tests) — including a **verification gate** (`src/engine/verify.ts`): every example trace is schema-validated, every sorting simulator is replay-checked to a sorted result, binary search / BFS / DFS invariants are asserted, and detection round-trips are proven for known + unknown code

## Pages

- **`/`** — landing page with the 3D forge hero; every part of the product is reachable from it
- **`#/dashboard`** — user dashboard (real stats, topic progress, badges, recommended next)
- **`#/roadmap`** — the Roadmap: a 3D topic-dependency graph, per-topic problems, and the Core 50 starter grid (statuses cycle on click, persisted)
- **`#/lab/[exampleId]/[step]`** — Code Playback Lab (deep-linkable per example and step). 15 examples now, and most have **editable inputs** (array / n / target / word / tree) that **re-forge the trace** live via CodeAnvil's own simulators, plus a **Py ⇄ JS** source switcher with line-aligned highlights
- **`#/saved`** — saved sessions (resume / delete)
- **`#/arena`** — DSA Visual Battle Arena (sort / search / BFS-vs-DFS race)
- **`#/story`** — Story Mode (worlds, missions, XP, themes)
- **`#/duel`** — Skill Duel (timed challenges, daily duel, leaderboard)
- **`#/visualize`** — Universal Code Visualizer (paste code → generated trace or Code Galaxy). A new **Story Script** mode is the local-first tracer API: declarative commands (`array`/`compare`/`swap`/`visit`/`mark`/`push`/`pop`/`set`/`print`/`step`/`note`) describe state changes and get replayed as a full 3D trace — no execution, no pattern matching needed
- **`#/auth`** — sign in / sign up (email+password or Google demo)

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run unit tests
npm run build      # type-check + production build
npm run preview    # serve the production build
```

## Architecture

```text
src/
  data/traces/     hand-authored trace builders + generated-trace builders
  engine/          playback reducer, step playback, simulators, pattern detection
  components/      code panel, visual stage, recursion tree, inspector, controls
  components/three 3D stage, 3D bars, 3D grid (code-split)
  screens/         Landing, Dashboard, Lab, Saved, Arena, Story, Duel, Visualizer
  lib/             localStorage adapter (sessions, progress, story, arena, duels)
  types/           trace schema (docs/16)
```

Trace pipeline (docs/36):

```text
user code → language detection → pattern match → simulators/actions
          → validated trace JSON → CodeAnvil renderer (2D or Three.js)
```

The renderer only ever consumes validated trace data — no AI-generated rendering code, and pasted user code is never executed.

## Sound & ambient design

- **Sounds are synthesized** with the Web Audio API (no audio files, ~2 KB of code): a soft hammer-tap per code step, an arpeggio on correct answers, a low buzz on wrong ones, a chime on resolution/save, and a fanfare when a duel completes. The AudioContext unlocks on your first gesture and everything respects the sidebar mute toggle (persisted in localStorage).
- **The brand accent is violet plasma** (`#a78bfa`) — the original warm amber was retired from the CSS tokens, glows, and every Three.js material; the Arc (cyan) and Verdant (green) story themes still override it when unlocked.
- **The ambient background** (aurora blobs + grid + embers + cursor glow) is pure CSS and honors `prefers-reduced-motion`; the forge-heat gauge and clock are session-live, not persisted.

## Authentication plan (recommendation)

- **Recommended: Google OAuth via Supabase** when the backend ships (docs/33 Milestone 6), because students already have Google accounts — one tap, no passwords to forget — plus email+password and magic links as fallbacks. The Auth screen's provider plan documents exactly this.
- Today the screen is a **local demo**: accounts live in this browser's localStorage and passwords are hashed locally (demo-grade, NOT production security). Nothing is sent to any server. Real authentication must wait for the [Backend Pre-Deploy Security Gate](docs/codeanvil-docs/35-backend-predeploy-security-gate.md).

## Security model

- Prebuilt traces and CodeAnvil-owned simulators only; no user code is ever executed.
- All storage reads are defensive (localStorage is untrusted).
- The docs define a mandatory [Backend Pre-Deploy Security Gate](docs/codeanvil-docs/35-backend-predeploy-security-gate.md) before any API is exposed.

## Roadmap

- [x] Playback Lab MVP (editor, playback controls, variables/stack/output panels)
- [x] Recursion tree + dry-run practice mode
- [x] 3D execution stage (explanatory Three.js renderer, Milestone 5)
- [x] Local saved sessions + dashboard (stats, topic progress, badges)
- [x] DSA Visual Arena (sorting, binary search, BFS vs DFS race)
- [x] Story Mode (worlds, missions, XP, unlockable themes)
- [x] Skill Duel (timed, daily challenge, local leaderboard)
- [x] Universal Code Visualizer (pattern detection + storyboard fallback)
- [ ] Supabase accounts + cloud saves (Milestone 6)
- [ ] Campus leaderboards and online duels (Milestone 7)
- [ ] AR Code Explainer (P3)

See `docs/codeanvil-docs/33-roadmap-and-milestones.md` for the full plan.

## Documentation

The complete product documentation lives in [`docs/`](docs/codeanvil-docs/README.md): PRD, trace format, API spec, security rules, UI/UX spec, and more.

The agent skills used to craft this UI live in `~/.agents/skills/`:

- `emilkowalski/skills` — design-engineering + animation review skills
- `taste-skill` (Leonxlnx) — anti-slop landing-page guidance
- `impeccable` (pbakaus) — design-language craft floor

## License

Proprietary / not yet licensed. See the project owners.
