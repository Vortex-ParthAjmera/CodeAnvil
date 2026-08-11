# CodeAnvil Product Brief

Last updated: 2026-08-04

## Public Brand

Name: CodeAnvil

Tagline: Forge Your Logic.

Internal origin: CodeForge was the original family name during brainstorming, but CodeAnvil is the selected public project name.

Domain note: `codeanvil.app` was available when checked on 2026-08-04 through Vercel domain availability.

## One-Line Vision

CodeAnvil is a visual, playable coding and DSA platform where students can watch code execute, understand algorithms through animation, practice by predicting execution, and eventually challenge friends in skill-based duels.

## Product Thesis

Most beginner programmers do not struggle only because code is hard. They struggle because code execution is invisible.

Variables change invisibly. Loops repeat invisibly. The call stack grows invisibly. Recursion feels like magic. Algorithms are explained as dry text or static diagrams, but students need to see the program move.

CodeAnvil turns code into a visual experience.

The long-term engine should not ask AI to write new Three.js animation code for every pasted snippet. Instead, CodeAnvil should analyze user code, create structured trace actions, and let our own renderer visualize those actions consistently.

Instead of only reading output in a console, students can watch the program execute line by line, see values change, inspect memory, follow the call stack, and understand DSA as animated systems, battles, missions, and challenges.

## Target Users

- CSE students learning programming, DSA, and core CS subjects
- First and second year students who struggle with dry runs
- Students preparing for exams, coding rounds, and interviews
- Teachers or mentors who want better visual explanations
- Campus coding clubs that want challenge-based learning

## Core Problem

Students often know syntax but fail at mental execution.

Common pain points:

- They cannot dry-run code confidently.
- They lose track of variables inside loops.
- They struggle with recursion and stack frames.
- They memorize DSA instead of understanding behavior.
- They do not get enough interactive practice.
- Existing tools are either boring, too technical, or not built for college-style learning.

## Core Product Family

CodeAnvil is made of multiple mini-project modules inside one larger product.

### 1. Code Playback Lab

Purpose: paste code and watch it execute visually.

This is the first MVP module and the core identity of CodeAnvil.

Main features:

- Code editor
- Paste-code trace generation later through language detection and parsers
- Sample code templates
- Play, pause, next step, previous step
- Execution speed control
- Highlight currently executing line
- Variable visualizer
- Memory boxes
- Call stack panel
- Recursion tree view
- Output console
- Timeline of executed steps
- Error explanation mode
- Save playback session locally
- Export/share playback later

Jaw-drop moment:

Student pastes recursive code and watches the recursion tree grow live.

### 2. DSA Visual Battle Arena

Purpose: turn DSA algorithms into visual battles, races, maps, and simulations.

This becomes the second major module after Code Playback Lab.

Main features:

- Algorithm selection: BFS, DFS, sorting, binary search, Dijkstra
- Animated grid, graph, tree, or array canvas
- Algorithm vs algorithm comparison
- Speed slider
- Step-by-step mode
- Metrics panel: steps, comparisons, swaps, visited nodes, time estimate
- Custom input builder
- Replay animation
- Battle result screen

Jaw-drop moment:

BFS and DFS race through a maze or graph while the app shows the difference visually.

### 3. DSA Story Mode

Purpose: make DSA learning feel like a game world.

Students learn topics through missions instead of static lessons.

Main features:

- World or map screen
- Missions by topic
- Beginner to advanced levels
- XP and progress system
- Hints
- Unlockable challenges
- Animated story cards
- Mini boss problems
- Achievement badges
- Topic completion tracker

Possible worlds:

- Array Arena
- Graph City
- Recursion Realm
- Tree Kingdom
- DP Dungeon
- Stack Tower
- Queue Station

Jaw-drop moment:

Recursion Realm, where every function call opens a new branch or path.

### 4. Skill Duel

Purpose: make learning competitive and viral inside a university.

The first version can be solo/local. Later it can become multiplayer with Supabase.

MVP features:

- Solo timed challenge mode
- Local leaderboard
- Challenge categories: DSA, OS, DBMS, CN, aptitude
- Score screen
- Streaks
- Shareable challenge result

Later features with Supabase:

- Login
- Campus leaderboard
- 1v1 duels
- Friend challenge links
- Branch/year rankings
- Daily challenge
- Anti-cheat basics

Jaw-drop moment:

Challenge your friend in a BFS maze or dry-run race under 60 seconds.

### 5. AR Code Explainer

Purpose: point a phone camera or upload a code image and get a visual explanation.

This is a future upgrade, not the MVP.

Early version:

- Upload code image
- Extract code
- Explain line by line
- Show arrows and variable changes visually

Later version:

- Live camera mode
- Overlay variable values
- Loop arrows
- Stack-frame overlay
- Mobile PWA mode

Jaw-drop moment:

Phone camera sees code and CodeAnvil explains execution on top of it.

## MVP Direction

The first version should be a frontend-only web app/PWA so it can launch quickly and be hosted for free.

MVP name:

CodeAnvil: Code Playback Lab

MVP goal:

Make code execution visible, interactive, and beautiful.

MVP should include:

- App shell
- Code editor
- A few built-in sample programs
- Step-by-step execution timeline
- Variable visualizer
- Call stack panel
- Output console
- Recursion tree for selected examples
- Dry Run Practice Mode
- Small DSA Visual Arena preview
- Local storage for saved sessions

## Recommended First Demo Programs

The first version should not try to support every language and every syntax.

Start with controlled examples that show the magic clearly.

Recommended examples:

- Sum of array
- Find maximum in array
- Factorial loop
- Factorial recursion
- Fibonacci recursion
- Binary search
- Bubble sort
- BFS on grid
- DFS on grid

## Build Strategy

### Phase 1: Visual Prototype

Goal: make the first screen feel impressive.

Build:

- CodeAnvil app shell
- Editor plus visual panels
- Hardcoded execution traces for sample programs
- Playback controls
- Variable timeline
- Output panel
- Recursion tree for factorial/fibonacci

This gives a fast jaw-drop demo without needing a full interpreter immediately.

### Phase 2: Trace Engine

Goal: make the playback system more flexible.

Build:

- Internal trace format
- Step objects
- Variable snapshots
- Stack snapshots
- Output snapshots
- Line highlights
- Error state support

The trace engine becomes the foundation for all future modules.

### Phase 3: Algorithm Arena Preview

Goal: add the first DSA visual mode.

Build:

- Sorting visualization
- BFS/DFS grid visualization
- Speed control
- Metrics panel
- Replay controls

### Phase 4: Practice Mode

Goal: make it educational, not just visual.

Build:

- Predict next value
- Predict next output
- Guess next line
- Instant feedback
- Score and streak

### Phase 5: Universal Code Visualization Later

Goal: let users paste common beginner code in multiple languages and get a best-effort visualization.

Build later:

- Language detection
- Tree-sitter/parser experiments
- Pattern detection for known DSA algorithms
- Structured trace actions
- Generic storyboard fallback for unknown code
- Local LLM explanations from validated traces
- No raw AI-generated Three.js renderer code

### Phase 6: Social Layer Later

Goal: make it spread in campus.

Build later:

- Shareable results
- Leaderboards
- Duels
- Profiles
- Daily challenge

## Technical Direction

Initial stack:

- React + Vite
- TypeScript
- Tailwind CSS
- shadcn/ui where useful
- Lucide icons
- Browser storage first: `localStorage` or `IndexedDB`
- Three.js for smooth execution stages where useful
- Canvas/SVG/D3/DOM panels for precise visualizations
- Trace action schema as the bridge between code analysis and visuals
- PWA support later

Hosting:

- Free first through Vercel or Cloudflare Pages
- Custom domain later: `codeanvil.app`

Backend:

- No backend required for the first prototype
- Supabase can be added later for auth, leaderboards, profiles, saved sessions, and duels

## Design Direction

CodeAnvil should feel like a serious coding workshop, not a toy app.

Visual personality:

- dark productive interface
- crisp code editor
- glowing execution line
- clean panels for variables, stack, output, and timeline
- subtle forge/anvil-inspired brand details
- high contrast
- smooth motion
- premium dashboard feel

Avoid:

- generic student project look
- too many cards
- cluttered dashboard
- childish game visuals
- boring Bootstrap-style UI

## Main Product Screens

Recommended screens for the first version:

1. Dashboard
2. Code Playback Lab
3. Examples Library
4. DSA Arena Preview
5. Practice Mode
6. Saved Sessions
7. Result/Share Screen

## Demo Story

Ideal first demo flow:

1. User opens CodeAnvil.
2. They choose "Factorial Recursion" from examples.
3. The code appears in the editor.
4. They press Play.
5. The current line glows.
6. Variables update live.
7. Stack frames appear one by one.
8. A recursion tree grows on the canvas.
9. Output appears step by step.
10. The user switches to Dry Run Practice Mode and predicts the next value.
11. The app gives instant feedback.

This demo is simple, but powerful.

## Success Criteria

CodeAnvil MVP succeeds if:

- A student can understand a loop better after using it.
- A student can understand recursion visually.
- The app looks good enough to show in a classroom or hackathon.
- The demo can be explained in under one minute.
- Users naturally say, "Wait, show me another example."

## Future Feature Vault

This section stores all future ideas that can be added after the MVP.

### Code Playback Features

1. Time Travel Debugger
   - Move forward and backward through code execution like a video timeline.

2. Variable History Graph
   - Show how variable values changed over time.

3. Memory Map View
   - Show arrays, objects, stack frames, references, and pointers visually.

4. Line Heatmap
   - Highlight which lines ran most often, useful for loops and recursion.

5. Execution Movie Export
   - Export a code playback as a GIF or video for README, PPT, or sharing.

6. Explain This Step
   - At any step, explain why this line ran, what changed, and what happens next.

7. Mistake Predictor
   - Detect likely beginner bugs such as infinite loops, off-by-one errors, wrong conditions, and missing base cases.

8. Code Compare Mode
   - Compare two solutions visually, such as brute force vs optimized.

9. Complexity Visualizer
   - Show time and space complexity through animated growth patterns.

10. Dry Run Practice Mode
    - Student predicts the next variable value, output, or line before revealing it.

### DSA Arena Features

11. Algorithm Race Mode
    - BFS vs DFS, Bubble Sort vs Merge Sort, Linear Search vs Binary Search.

12. Custom Data Builder
    - User creates custom arrays, graphs, trees, grids, and linked lists.

13. Maze Solver Arena
    - Visualize BFS, DFS, Dijkstra, and A* on a maze.

14. Sorting Battle Stage
    - Elements animate as blocks or fighters during comparisons and swaps.

15. Tree Explorer
    - Traversal animations for inorder, preorder, postorder, and BFS.

16. Graph City Mode
    - Nodes become cities, edges become roads, and algorithms become missions.

17. Recursion Tree Theater
    - Every recursive call becomes a branch with stack frame cards.

18. DP Table Builder
    - Show dynamic programming tables filling step by step.

### Story And Game Features

19. DSA Worlds
    - Array Arena, Graph City, Recursion Realm, Tree Kingdom, DP Dungeon, Stack Tower, and Queue Station.

20. XP And Badges
    - Earn badges like Loop Breaker, Stack Master, and Graph Runner.

21. Boss Problems
    - Final challenge after each topic.

22. Hint Ladder
    - Hint 1: concept. Hint 2: approach. Hint 3: pseudocode. Hint 4: solution.

23. Unlockable Visual Themes
    - Students unlock different animation skins or interface themes.

### Skill Duel Features

24. Daily Duel
    - One daily challenge for everyone.

25. Campus Leaderboard
    - Rank by class, branch, semester, or university.

26. Friend Challenge Link
    - Send a link so another student can try to beat your score.

27. Speedrun Mode
    - Solve, debug, or explain as fast as possible.

28. Accuracy vs Speed Score
    - Score based on both correctness and speed.

### AI Tutor Features

29. AI Code Tutor
    - Ask questions about the current code playback.

30. Generate Similar Problems
    - Generate practice variants after solving one question.

31. Explain In My Level
    - Beginner, intermediate, interview, or teacher mode explanations.

32. Convert Code To Visual Story
    - Explain recursion, loops, or algorithms as a story.

33. Auto Quiz From Code
    - Generate MCQs and dry-run questions from pasted code.

### Social And Showcase Features

34. Shareable Playback Link
    - Share a visual execution session.

35. Profile Showcase
    - Students show solved topics, badges, best duels, and progress.

36. README Embed Assets
    - Generate GIFs, diagrams, screenshots, or badges for GitHub README files.

37. PPT Demo Mode
    - One-click presentation-friendly animation screen for project demos.
