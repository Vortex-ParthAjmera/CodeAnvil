# Trace Format

## Purpose

The trace format is the core data contract of CodeAnvil.

It describes code execution as a sequence of visual steps that the frontend can replay without executing unsafe user code.

## Design Goals

- deterministic playback
- language-neutral structure
- easy for React visualizers to consume
- easy for Python tools to generate later
- safe to store as JSON
- versioned for future migration

## Trace Document Shape

```json
{
  "schemaVersion": "1.0.0",
  "language": "python",
  "title": "Factorial Recursion",
  "source": {
    "code": "def fact(n):\n    if n == 0:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(4))",
    "entrypoint": "main"
  },
  "metadata": {
    "topic": "recursion",
    "difficulty": "beginner",
    "estimatedDurationSeconds": 90
  },
  "steps": [],
  "practice": []
}
```

## Step Shape

Each step represents one meaningful execution moment.

```json
{
  "id": "step-001",
  "index": 0,
  "line": 1,
  "event": "function_call",
  "description": "Call fact with n = 4",
  "variables": {
    "n": 4
  },
  "stack": [
    {
      "id": "frame-1",
      "name": "fact",
      "line": 1,
      "locals": {
        "n": 4
      }
    }
  ],
  "memory": [],
  "output": "",
  "visual": {
    "type": "recursion_tree",
    "activeNodeId": "call-1",
    "nodes": [],
    "edges": []
  },
  "changed": {
    "variables": ["n"],
    "stack": ["frame-1"],
    "output": false
  },
  "actions": [
    {
      "type": "function_call",
      "target": "fact",
      "args": { "n": 4 }
    }
  ]
}
```

## Required Step Fields

- `id`: stable unique step ID
- `index`: zero-based step number
- `line`: source line number, one-based
- `event`: event type
- `description`: short explanation
- `variables`: visible global/current variables
- `stack`: current call stack
- `output`: visible console output so far

## Trace Action Layer

Trace steps may include language-neutral visual actions. These actions are the bridge between parsed code and the renderer.

Example actions:

```json
{ "type": "compare", "items": ["i", "j"] }
{ "type": "swap", "items": ["i", "j"] }
{ "type": "visit_node", "node": "A" }
{ "type": "push", "target": "stack", "value": 7 }
{ "type": "pointer_move", "pointer": "left", "to": 3 }
{ "type": "pointer_move", "pointer": "L", "from": 0, "to": 1, "indices": [1, 3] }
```

Action rules:

- Actions describe what happened, not how to render it.
- Three.js, Canvas, SVG, and DOM renderers consume actions through CodeAnvil-owned components.
- AI or parsers may generate action candidates, but they must pass schema validation.
- Unknown actions should degrade to safe line/variable/output playback.

## Event Types

Recommended event names:

- `program_start`
- `line_enter`
- `assignment`
- `condition_check`
- `loop_start`
- `loop_iteration`
- `function_call`
- `function_return`
- `recursion_call`
- `array_read`
- `array_write`
- `comparison`
- `swap`
- `output_write`
- `error`
- `program_end`

## Stack Frame Shape

```json
{
  "id": "frame-2",
  "name": "fact",
  "line": 3,
  "locals": {
    "n": 3
  },
  "returnTo": 4
}
```

## Memory Item Shape

```json
{
  "id": "arr-1",
  "label": "arr",
  "type": "array",
  "value": [3, 1, 4, 2],
  "highlights": [
    {
      "index": 1,
      "role": "comparing"
    }
  ]
}
```

## Visual Payload Types

The `visual.type` field tells the UI which visualizer should render the step.

Supported MVP types:

- `none`
- `variables`
- `array`
- `recursion_tree`
- `grid`
- `graph`
- `call_stack`

Current renderer dispatchers:

- array stages render basic scans, comparisons, swaps, and pointer movement
- binary search uses range, low, high, and mid state
- sorting stages use algorithm-specific sort actions and memory highlights
- recursion stages use `recursion_tree` payloads and call-stack state
- grid stages use `grid` memory and visited/frontier/path roles
- palindrome stages use an array memory item named `s` with `l` and `r` variables
- sorted two-sum stages use an array memory item named `arr` with `l`, `r`, `sum`, and `target`

Future types:

- `tree`
- `dp_table`
- `linked_list`
- `memory_map`
- `complexity_curve`
- `battle_arena`

## Practice Prompt Shape

```json
{
  "id": "practice-001",
  "stepId": "step-004",
  "type": "predict_variable",
  "question": "What will n be in the next recursive call?",
  "target": {
    "variable": "n"
  },
  "answer": "3",
  "explanation": "The function calls fact(n - 1), so 4 becomes 3."
}
```

Prompt types:

- `predict_variable`
- `predict_output`
- `predict_next_line`
- `predict_condition`
- `choose_explanation`

## Trace Validation Rules

- `schemaVersion` is required.
- `steps` must not be empty.
- Step indexes must be sequential.
- Step IDs must be unique.
- Line numbers must point to existing source lines when possible.
- Output should be cumulative unless a visualizer explicitly requests delta output.
- Trace JSON should be size-limited before saving.
- Unknown visual types should render a safe fallback panel.

## Universal Generation Strategy Later

Multi-language tracing should use this pipeline:

- detect language
- parse code with a language parser such as Tree-sitter where possible
- extract control flow, data changes, and DSA operations
- classify known algorithm patterns
- generate trace steps and trace actions
- validate the trace before playback

Known DSA code should map to polished visual templates. Unknown code should receive a generic execution storyboard.

AI can help classify and explain the trace, but it should not generate raw Three.js renderer code.

## Python Generation Strategy Later

Python trace generation should start with a restricted AST-based subset:

- assignments
- arithmetic
- lists
- `if`
- `for`
- bounded `while`
- simple functions
- controlled recursion

Rejected before sandboxing:

- imports
- file access
- network access
- subprocess
- dynamic execution
- reflection
- unbounded loops

## MVP Shortcut

For the first version, create hand-authored traces for the best demo examples.

This avoids unsafe execution and lets us polish the UI first.

