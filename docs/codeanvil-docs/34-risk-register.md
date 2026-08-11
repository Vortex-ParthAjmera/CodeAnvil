# Risk Register

## Purpose

Track product, technical, security, and execution risks before they surprise us.

## Risk 1: Scope Creep

Description:

CodeAnvil has many exciting modules. Building all at once can kill momentum.

Mitigation:

- MVP starts with Code Playback Lab only
- DSA Arena preview is limited
- AR and multiplayer wait

## Risk 2: Unsafe Code Execution

Description:

Running pasted code without isolation can compromise systems.

Mitigation:

- no arbitrary code execution in MVP
- use hand-authored traces
- sandbox only later

## Risk 3: Weak Visual Polish

Description:

The idea depends on visual clarity. A generic UI will weaken the product.

Mitigation:

- design first
- browser screenshot QA
- motion rules
- polished README/demo assets

## Risk 4: Trace Engine Complexity

Description:

Supporting all Python or JS syntax is hard.

Mitigation:

- define restricted trace format
- start with curated examples
- expand language support slowly
- separate code analysis from rendering
- use trace actions instead of generated Three.js code

## Risk 4A: AI Hallucinated Visualizations

Description:

If AI generates renderer code directly, it can create broken visuals, unsafe code paths, or inconsistent UX.

Mitigation:

- AI only produces explanations, classifications, or trace hints
- validate all trace JSON
- CodeAnvil-owned renderers consume structured actions
- label uncertain analysis as best-effort

## Risk 5: Cheating In Leaderboards

Description:

Client-only scores can be manipulated.

Mitigation:

- mark MVP scores as local/motivational
- server-side scoring for official leaderboards
- anti-cheat flags later

## Risk 6: Data Privacy

Description:

Users may paste private code or secrets.

Mitigation:

- local-first MVP
- warnings before cloud/AI features
- private sessions by default
- avoid logging pasted code

## Risk 7: Backend Cost

Description:

AI, sandboxing, and exports can cost money.

Mitigation:

- frontend-first MVP
- rate limits
- quotas
- add expensive features only after core product works

## Risk 8: University Adoption

Description:

Students may try it once but not return.

Mitigation:

- practice mode
- saved progress
- duels later
- exam/interview examples

