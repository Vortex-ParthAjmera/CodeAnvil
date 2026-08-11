# Tech Stack

## Stack Philosophy

Use the simplest stack that can ship a beautiful MVP quickly, while leaving room for Python-powered backend features later.

The browser must handle the visual interface. Python should be used mainly where it gives real value:

- trace generation
- parsing and static analysis
- AI/RAG tutor services
- admin automation
- exports
- analytics jobs
- safe backend APIs

## MVP Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui where useful
- Lucide icons
- Monaco Editor or CodeMirror
- Three.js for smooth 3D execution stages where it improves clarity
- SVG/Canvas/D3/DOM panels for precise 2D visualizations
- Browser storage: `localStorage` first, `IndexedDB` later

Deployment:

- Vercel or Cloudflare Pages for static frontend
- Free preview URL first
- Custom domain later: `codeanvil.app`

## Backend Stack Later

Python API:

- Python 3.12+
- FastAPI
- Pydantic
- Uvicorn/Gunicorn production runner
- SQLAlchemy or SQLModel if direct Postgres access is needed
- Ruff, Pyright/Mypy, Pytest

Database/Auth:

- Supabase Auth
- Supabase Postgres
- Row-Level Security
- Supabase Storage later for exported assets

Async/Jobs Later:

- Python worker for export jobs, trace generation, AI tasks, and cleanup
- Redis/RQ, Celery, or managed queues only if required
- Supabase scheduled jobs or edge jobs for light maintenance

AI Later:

- Python FastAPI AI gateway
- RAG service for learning explanations
- Embedding storage with pgvector if needed
- Local hosted LLM option for private code explanation and pattern detection
- LLMs should produce explanations or trace hints, not raw Three.js renderer code
- Strict usage limits and logging

Parsing And Trace Generation Later:

- Language detection before analysis
- Tree-sitter for multi-language parsing where possible
- Python `ast` for safe Python beginner subsets
- Pattern classifiers for DSA algorithms
- Structured trace/action JSON as the shared output
- CodeAnvil renderer owns Three.js/Canvas/SVG visualization

Sandboxing Later:

- Do not execute arbitrary user code in the main API process.
- Use a sandboxed environment with CPU, memory, filesystem, network, and time limits.
- Treat all pasted code as hostile input.

## Why Not Python For Everything

The browser UI, editor, animations, PWA behavior, and interactive playback must be JavaScript/TypeScript because they run in the browser.

Python is best for backend intelligence, parsing, trace generation, exports, AI, and automation.

## Recommended Repository Shape

```text
codeanvil/
  apps/
    web/
      src/
      public/
  services/
    api/
      app/
      tests/
  packages/
    trace-schema/
    examples/
  supabase/
    migrations/
    seed.sql
  docs/
```

For the first MVP, we can start smaller:

```text
codeanvil/
  src/
  public/
  docs/
```

Then split into apps/services when backend begins.

