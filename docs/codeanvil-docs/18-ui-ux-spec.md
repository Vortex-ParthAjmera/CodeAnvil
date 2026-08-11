# UI/UX Spec

## Product Feeling

CodeAnvil should feel like a serious coding workshop where logic is forged visually.

It should not feel like a generic college assignment page.

## Reference-Led Product Direction

Reference sites clarify the bar:

- AlgoMaster: broad, searchable topic coverage and code-linked step animation.
- VisuAlgo: custom input, training mode, dense algorithm catalog, and serious classroom utility.
- DSA visualizer pages: simple user inputs, clear legends, code tabs, step controls, and beginner-friendly explanation.

CodeAnvil should learn from those strengths without copying their surface. Our differentiator is the forge pipeline:

```text
source code -> validated trace actions -> CodeAnvil renderer -> explanation, practice, and replay
```

The UI must make that pipeline visible. A student should see which source line caused the current action, what semantic action was emitted, and how the renderer turns that action into motion.

## Visual Direction

- dark productive interface
- crisp editor area
- high-contrast execution highlights
- focused panels
- strong motion but not distracting
- subtle forge/anvil-inspired brand detail
- professional dashboard density
- no childish game styling in the core app

## Main Navigation

Primary nav:

- Dashboard
- Playback Lab
- DSA Arena
- Practice
- Saved
- Profile

Admin users also see:

- Admin

## App Shell

Layout:

- left sidebar or top nav depending on viewport
- central work area
- right inspector panel where useful
- persistent brand mark
- command buttons with icons

Required states:

- desktop
- tablet
- mobile
- empty state
- loading state
- error state

## Forge Workbench Screen

The first screen should be the real tool, not a landing page.

Desktop workbench zones:

- left catalog rail with validated traces, DSA lab shortcuts, and current trace actions
- editable source editor with line numbers and active line state
- central Three.js forge stage that makes compare, swap, call, return, output, and visit actions visible
- right inspector for variables, stack, output, sessions, and diagnostics
- bottom playback rail with practical controls only
- practice dock when dry-run mode is enabled

Rules:

- every button shown must perform a real local action
- no fake metrics, fake navigation destinations, or decorative controls
- animation must explain the algorithm decision, not just move objects
- selected values, predicates, stack frames, and return values must remain readable while moving
- catalog rail should show only available MVP capabilities until more modules exist

## Playback Lab Screen

Core layout:

- code editor on left
- visual canvas center/right
- timeline at bottom
- variables/stack/output panels on right or lower panel

Controls:

- play
- pause
- step forward
- step backward
- reset
- speed control
- practice mode toggle

Important UX rules:

- current executing line must be obvious
- changed variables must animate or highlight
- output must be cumulative and easy to scan
- stack frames must not jump layout
- timeline must support quick scrubbing later

## Paste Any Code UX Later

The paste-code flow should feel honest and useful:

- show detected language
- show whether a known DSA pattern was matched
- label low-confidence results as best-effort
- map recognized algorithms to polished animations
- use a generic storyboard for unknown code
- keep all normal playback controls working
- explain unsupported syntax clearly without blame
- never expose raw generated Three.js or renderer code to users

## DSA Arena Screen

Core layout:

- algorithm selector
- data input builder
- visual canvas
- metrics panel
- replay controls

MVP arena:

- BFS/DFS grid
- sorting array

## User Dashboard Screen

Must show:

- greeting
- current streak
- last saved session
- progress by topic
- recommended next practice
- recent activity
- badges

Avoid:

- fake metrics that do not come from real data
- too many cards
- unreadable tiny text

## Admin Dashboard Screen

Must show:

- overview metrics
- report queue
- content management
- user moderation
- audit logs

Admin UI should feel utilitarian and dense, not like a marketing page.

## Mobile Rules

- Playback controls remain reachable.
- Code editor can become full-width.
- Visual panels stack below editor.
- Avoid horizontal overflow.
- Keep buttons large enough to tap.
- Do not cram all desktop panels into one viewport.

## Motion Rules

Use motion for:

- line execution
- variable change
- stack push/pop
- recursion branch creation
- algorithm step transitions
- semantic trace actions becoming visible in the renderer
- compare and swap paths that show why data moves

Avoid motion for:

- constant decorative movement
- distracting backgrounds
- slow transitions during step-by-step learning
- visual effects that hide values, indices, stack frames, or current source lines

Respect reduced motion preferences.

## Empty States

Examples:

- No saved sessions yet: show starter examples.
- No practice attempts yet: suggest first dry-run challenge.
- No admin reports: show calm clean state.

## Copy Style

Tone:

- clear
- confident
- student-friendly
- not childish

Examples:

- "Run playback"
- "Predict next value"
- "Step into call"
- "Resume session"
- "Forge your logic"

