# Product Requirements Document

## Product

CodeAnvil

## Tagline

Forge Your Logic.

## Vision

Make code execution visible, interactive, and memorable for students.

## Problem

Students often understand syntax but cannot mentally execute code. They lose track of variables, loops, function calls, recursion, memory, and output. DSA is often taught through static diagrams or dry explanations, so students memorize instead of understanding behavior.

## Target Users

- CSE students learning programming and DSA
- First and second year students struggling with dry runs
- Students preparing for university exams, coding rounds, and interviews
- Teachers, mentors, and coding clubs
- Later: campus admins or club coordinators managing challenges

## Core Value

CodeAnvil lets students paste or choose code and watch it execute as a visual timeline:

- current line highlight
- variable changes
- memory boxes
- call stack
- recursion tree
- output timeline
- DSA animation
- practice prompts

Long-term, pasted code should flow through a language-aware analysis pipeline that creates structured trace actions. CodeAnvil then visualizes those actions with its own renderer instead of asking AI to generate raw Three.js code.

## Product Family

CodeAnvil contains these mini-products/modules:

- Code Playback Lab
- DSA Visual Battle Arena
- DSA Story Mode
- Skill Duel
- AR Code Explainer later

## MVP

The first MVP is Code Playback Lab with a small DSA Arena preview.

MVP must support:

- app shell
- code editor
- sample program library
- playback controls
- execution timeline
- variable visualizer
- call stack panel
- output console
- recursion tree for selected examples
- dry-run practice prompts
- local saved sessions

## Non-Goals For MVP

- full arbitrary-code execution on the server
- real-time multiplayer
- full AR camera overlay
- full AI tutor
- complete support for every programming language
- perfect visualization for arbitrary pasted code
- paid cloud/GPU infrastructure

## Success Criteria

The MVP succeeds if:

- a beginner can understand loops better after using it
- recursion becomes visually understandable
- the app feels impressive in a classroom demo
- a demo can be completed in under one minute
- users naturally want to try another example

## Product Principles

- Build the real usable tool first, not a landing page.
- Make invisible execution visible.
- Prefer interactive learning over passive reading.
- Make correctness and clarity more important than flashy noise.
- Use Python mainly where backend, parsing, tracing, AI, automation, or exports benefit from it.
- Do not run untrusted user code without a proper sandbox.
- Treat AI as an explanation and trace-assist layer, not as the owner of rendering code.

