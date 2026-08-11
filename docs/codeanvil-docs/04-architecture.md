# Architecture

## Architecture Goals

- Fast frontend-first MVP
- Clean trace format
- Secure path toward backend and multiplayer
- No unsafe arbitrary code execution
- Easy migration from local storage to Supabase
- Admin and user dashboards supported later

## High-Level Architecture

```mermaid
flowchart TD
  User[Student User] --> Web[React PWA]
  Admin[Admin User] --> Web
  Web --> LocalStore[Browser Storage]
  Web --> TraceEngine[Client Trace Player]
  Web --> Viz[Three.js/Canvas/SVG Visualizers]
  Web --> API[Python FastAPI API Later]
  API --> Supabase[(Supabase Postgres)]
  API --> Sandbox[Sandboxed Code Runner Later]
  API --> AI[AI Tutor/RAG Service Later]
  Supabase --> Auth[Supabase Auth]
```

## MVP Architecture

For MVP, CodeAnvil can run without a backend.

```mermaid
flowchart LR
  Editor[Code Editor] --> Examples[Example Library]
  Examples --> Trace[Prebuilt Trace Data]
  Trace --> Player[Playback Controller]
  Player --> Panels[Variables, Stack, Output]
  Player --> Canvas[Visual Canvas]
  Player --> Practice[Dry Run Practice]
  Player --> Storage[Local Storage]
```

MVP design decision:

- Use prebuilt traces for sample programs first.
- Do not run arbitrary user code in production MVP.
- Add a trace generator later when sandboxing is ready.

## Universal Code Visualization Architecture

The long-term paste-code feature should not generate Three.js code directly.

Instead:

```mermaid
flowchart LR
  Code[User Code] --> Detect[Language Detection]
  Detect --> Parse[Tree-sitter/AST Parser]
  Parse --> Analyze[Trace Analyzer]
  Analyze --> Pattern[Known DSA Pattern Match]
  Pattern --> Trace[Structured Trace Actions]
  Trace --> Validate[Schema Validation]
  Validate --> Renderer[CodeAnvil Renderer]
  Renderer --> Visuals[Three.js/Canvas/SVG Visuals]
  Trace --> Explain[Local LLM Explanation Layer]
```

Known algorithms should map to polished templates. Unknown code should fall back to a generic execution storyboard. AI can help explain and classify, but the renderer must only consume validated trace data.

## Core Runtime Concepts

Trace:

- ordered list of execution steps
- each step has line number, operation, variables, stack, output, and explanation

Visualizer:

- reads trace steps
- renders variable boxes, stack frames, tree nodes, arrays, grids, or graphs

Playback Controller:

- controls current step
- supports play, pause, step forward, step backward, reset, speed

Practice Engine:

- pauses at selected steps
- asks user to predict next value, next output, or next line
- records accuracy

## Future Backend Architecture

```mermaid
flowchart TD
  Web[React PWA] --> API[FastAPI]
  API --> Auth[Supabase Auth Verification]
  API --> DB[(Supabase Postgres)]
  API --> Jobs[Python Worker]
  Jobs --> Export[GIF/PDF/PPT/README Export]
  Jobs --> AI[AI Tutor/RAG]
  Jobs --> Parser[Language Parser/Trace Analyzer]
  Jobs --> Sandbox[Sandboxed Runner]
  Parser --> Trace[Generated Trace]
  Sandbox --> Trace
  Trace --> DB
```

## Security Boundaries

Important trust boundaries:

- browser to API
- API to database
- API to sandbox
- admin dashboard to privileged actions
- user-submitted code to trace engine
- public user content to frontend rendering

Most important rule:

Never trust code, text, JSON, uploaded files, local storage, route params, or API responses as safe without validation.

