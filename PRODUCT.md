# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CodeAnvil is for programming students, self-taught developers, and interview-prep learners who need to see how code executes instead of only reading static explanations.

## Product Purpose

CodeAnvil turns source code, trace actions, and DSA examples into clear visual execution. Success means a learner can paste or choose code, understand every step, replay it, hear optional cues, and resume later without losing context.

## Positioning

The product is not "AI writes Three.js." Its stronger mechanism is: code analysis creates a validated action trace, and CodeAnvil's renderer turns that trace into polished visual explanations.

## Operating Context

Learners use the app while studying recursion, arrays, sorting, graph traversal, and language variants. The current app runs as a React/Vite web project with Three.js animation, editable Python tracing, curated examples, DSA lab views, sound cues, narration, practice prompts, and saved sessions.

## Capabilities and Constraints

Current custom tracing accepts editable Python. Other top language views are reference variants for validated traces. The DSA lab currently covers sorting and graph traversal. Future expansion should add Tree-sitter parsing, local LLM explanations, broader DSA templates, and best-effort custom code storyboards without bypassing trace validation.

## Brand Commitments

The confirmed name is CodeAnvil. The interface should feel like a practical execution forge: technical, readable, alive, and serious about teaching. Avoid generic AI-looking SaaS filler, inert buttons, fake metrics, unreadable animation text, and decorative clutter.

## Evidence on Hand

The repository contains the working app in `src/`, trace validation tests, generated trace tests, DSA algorithm tests, Three.js execution stage code, language variants, saved-session support, and installed design skills under `.agents/skills/`.

## Product Principles

Explain before decorating.
Every visible control should do real work or clearly disclose that it is planned.
Use validated action schemas as the renderer contract.
Keep common DSA animations hand-polished.
Make advanced custom-code visualization best-effort, not fake certainty.

## Accessibility & Inclusion

Respect reduced-motion preferences, keep animation text readable as HTML where needed, preserve keyboard focus states, and keep sound or narration optional.
