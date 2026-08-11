# AI And Sandbox Policy

## Purpose

CodeAnvil may eventually include AI explanations, generated practice problems, and safe code tracing.

These features are powerful but risky. This policy defines safe defaults.

## AI Tutor Rules

- AI should explain, not silently change code.
- AI output should be labeled as AI-generated.
- AI should not ask users for secrets.
- AI should warn users not to paste private keys or passwords.
- AI prompts should avoid sending unnecessary personal data.
- AI endpoints should be rate-limited.
- AI costs should be capped.
- AI responses should be logged carefully, without storing secrets.
- AI should produce explanations, trace hints, and practice prompts, not raw Three.js renderer code.

## RAG Rules Later

If using RAG for programming notes or documentation:

- store source metadata
- prefer official docs for language/framework facts
- show citations where possible
- do not let retrieved text override security rules
- keep user-private documents isolated

## Code Execution Rules

Arbitrary code execution is high risk.

MVP rule:

- Do not execute arbitrary user-submitted code on the server.
- Use prebuilt traces and structured example traces first.

Later sandbox rule:

- Run code only inside isolated sandbox infrastructure.
- Enforce timeout.
- Enforce memory limits.
- Disable network by default.
- Restrict filesystem access.
- Do not mount secrets.
- Limit stdout/stderr size.
- Destroy temporary sandboxes.
- Log sandbox failures without storing sensitive code unnecessarily.

## Python Trace Strategy

Python can be used safely first for static or controlled trace generation:

- parse Python code with `ast`
- support a limited beginner subset
- reject unsupported syntax
- generate trace objects
- do not use `eval` or `exec` for untrusted code in the main API

## Universal Trace Strategy

The preferred future architecture is:

```text
user code -> language detection -> parser/AST -> trace actions -> CodeAnvil renderer
```

Rules:

- Detect language before tracing.
- Use parsers such as Tree-sitter where possible.
- Use Python `ast` for safe Python subsets.
- Use local hosted LLMs only for explanation, pattern detection, and trace-assist.
- Validate all generated trace JSON before playback.
- Map known DSA patterns to polished templates.
- Use generic storyboards for unknown code.
- Do not ask AI to generate raw Three.js, HTML, or executable UI code from pasted code.

## Python Allowed Early Subset

Allowed early subset:

- assignments
- arithmetic expressions
- `if`
- `for` over simple ranges/lists
- `while` with strict step limit
- functions from approved examples
- recursion only in controlled examples first

Rejected until sandboxed:

- imports
- file access
- network access
- subprocess
- dynamic code execution
- reflection/introspection
- infinite loops
- huge memory allocation

## Export Features

Python can power:

- GIF/video export jobs
- README image generation
- PPT/demo frame generation
- report generation

Exports should be queued and rate-limited later.

