# Implementation Plan

## Phase 0: Foundation

Goal: prepare the project structure and design direction.

Tasks:

- finalize CodeAnvil brand tokens
- create React/Vite app
- set up Tailwind
- choose editor library
- create basic app shell
- create sample data format
- create docs/readme foundation

Output:

- running local frontend
- first dashboard shell
- first playback screen layout

## Phase 1: Code Playback Lab MVP

Goal: make code execution visible.

Tasks:

- define trace schema
- build playback controller
- build code editor panel
- build timeline
- build current line highlight
- build variable panel
- build output panel
- build call stack panel
- create 5 sample traces
- save sessions locally

Output:

- usable playback demo for loops and recursion

## Phase 2: Recursion And Practice

Goal: create the first jaw-drop learning moment.

Tasks:

- build recursion tree visualizer
- add factorial recursion trace
- add fibonacci recursion trace
- add Dry Run Practice Mode
- add score and feedback
- add simple progress tracking

Output:

- demo-ready recursion experience

## Phase 3: DSA Arena Preview

Goal: make CodeAnvil feel bigger than a debugger.

Tasks:

- build sorting visualizer
- build BFS/DFS grid visualizer
- add metrics panel
- add speed controls
- add replay mode

Output:

- first DSA Visual Battle Arena preview

## Phase 4: User Dashboard

Goal: make the app feel personal.

Tasks:

- saved sessions page
- recent activity
- topic progress
- streaks and badges
- recommended next example

Output:

- user dashboard MVP

## Phase 5: Python Backend

Goal: add durable accounts and backend intelligence.

Tasks:

- create FastAPI app
- add auth token verification
- connect Supabase Postgres
- move saved sessions to database
- add admin APIs
- add rate limiting
- add audit logging
- add tests
- pass the backend pre-deploy security gate before any public API deployment

Output:

- secure backend skeleton

## Phase 6: Admin Dashboard

Goal: safely manage platform content.

Tasks:

- admin overview
- example manager
- challenge manager
- user reports
- moderation queue
- audit log viewer

Output:

- first admin dashboard

## Phase 7: Multiplayer And Campus

Goal: make CodeAnvil spread.

Tasks:

- campus leaderboard
- daily challenge
- friend challenge links
- 1v1 duel prototype
- anti-cheat checks

Output:

- campus-growth layer

## Phase 8: Universal Code Visualization

Goal: support best-effort visualization for pasted user code without letting AI generate runtime rendering code.

Tasks:

- add language detection
- add parser/AST experiments
- add trace action builder
- add known DSA pattern matcher
- map recognized patterns to polished animations
- add generic storyboard fallback for unknown code
- validate generated trace JSON before playback

Output:

- paste-code pipeline that produces CodeAnvil trace data

## Phase 9: AI And Sandbox

Goal: support richer code explanation and controlled execution.

Tasks:

- AI tutor API
- local hosted LLM experiment
- safe prompt templates
- LLM explanations from validated trace data
- sandboxed runner only after isolation is ready
- execution timeouts
- memory limits
- network restrictions

Output:

- safer AI-assisted learning layer
