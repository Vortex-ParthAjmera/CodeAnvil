---
name: react-performance
description: Optimize React applications for 60fps rendering and minimal re-renders. Use when building performance-critical UIs, data visualizations, animations, or large lists. Covers memoization, virtualization, lazy loading, concurrent features, and profiling. Essential for real-time visualizations like DSA animators.
---

# React Performance

A performance skill for React applications that need smooth, responsive UI — especially data visualizations, code editors, and real-time animations.

## Operating Posture

You are a performance engineer who measures before optimizing. Premature optimization adds complexity without measurable benefit. Profile first, identify the bottleneck, then apply the targeted fix.

Two failure modes:
1. **Optimizing everything** — wrapping every component in `memo`, `useMemo`, `useCallback` without measurement. This adds complexity and can hurt performance.
2. **Ignoring obvious wins** — not virtualizing a 1000-item list, not lazy-loading routes, not debouncing expensive computations.

## The Performance Checklist

Before claiming something is "optimized," verify:

- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Lists over 100 items use virtualization
- [ ] Expensive computations are memoized
- [ ] Large components are code-split
- [ ] Images are optimized (lazy, WebP, proper sizing)
- [ ] No layout thrashing (batched state updates)

## Memoization Patterns

### When to Use `React.memo`

```typescript
// ✅ Good: Component receives simple props and renders frequently
const VariableRow = React.memo(({ name, value, changed }) => (
  <div className={changed ? 'changed' : ''}>
    <span>{name}:</span> <span>{value}</span>
  </div>
));

// ❌ Bad: Component receives objects/functions that change every render
const BadComponent = React.memo(({ data, onClick }) => (
  // data and onClick are new references each render
  // memo is useless here
));
```

### When to Use `useMemo`

```typescript
// ✅ Good: Expensive computation with stable dependencies
const sortedSteps = useMemo(() => {
  return trace.steps.sort((a, b) => a.line - b.line);
}, [trace.steps]); // Only recompute when steps change

// ❌ Bad: Simple computation
const doubled = useMemo(() => x * 2, [x]); // Just write x * 2
```

### When to Use `useCallback`

```typescript
// ✅ Good: Callback passed to memoized child
const handleStepChange = useCallback((step: number) => {
  setCurrentStep(step);
  updateUrlParam('step', step);
}, []); // Stable reference

const MemoizedTimeline = React.memo(ExecutionTimeline);
return <MemoizedTimeline onStepChange={handleStepChange} />;

// ❌ Bad: Callback not passed to memoized children
const handleClick = useCallback(() => {
  setState(!state);
}, [state]); // Just use inline function
```

## Virtualization for Large Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VariableList({ variables }: { variables: Variable[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: variables.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: virtualRow.start,
              height: virtualRow.size,
            }}
          >
            {variables[virtualRow.index].name}: {variables[virtualRow.index].value}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Lazy Loading & Code Splitting

```typescript
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const SortingVisualizer = lazy(() => import('./SortingVisualizer'));
const GridVisualizer = lazy(() => import('./GridVisualizer'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/sorting" element={<SortingVisualizer />} />
        <Route path="/grid" element={<GridVisualizer />} />
      </Routes>
    </Suspense>
  );
}
```

## Batched State Updates

```typescript
// ❌ Bad: Multiple re-renders
function handleStepComplete() {
  setStep(step + 1);
  setVariable('x', newValue);
  setChangedVars([...changedVars, 'x']);
}

// ✅ Good: Single re-render with flushSync or automatic batching
function handleStepComplete() {
  flushSync(() => {
    setStep(step + 1);
    setVariable('x', newValue);
    setChangedVars([...changedVars, 'x']);
  });
}
```

## Animation Performance

```typescript
// Use CSS transforms and opacity — they don't trigger layout
function AnimatedLine({ highlighted }: { highlighted: boolean }) {
  return (
    <div
      style={{
        transform: highlighted ? 'scale(1.05)' : 'scale(1)',
        opacity: highlighted ? 1 : 0.7,
        transition: 'transform 150ms ease-out, opacity 150ms ease-out',
      }}
    />
  );
}

// Use requestAnimationFrame for JS animations
function animateValue(start: number, end: number, duration: number) {
  const startTime = performance.now();
  
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = start + (end - start) * easeOutCubic(progress);
    
    setValue(value);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}
```

## Web Workers for Heavy Computation

```typescript
// worker.ts
self.onmessage = (e) => {
  const { trace, algorithm } = e.data;
  const result = executeAlgorithm(trace, algorithm);
  self.postMessage(result);
};

// component.tsx
const workerRef = useRef<Worker>();

useEffect(() => {
  workerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
  workerRef.current.onmessage = (e) => {
    setTraceResult(e.data);
  };
  
  return () => workerRef.current?.terminate();
}, []);

const runAlgorithm = useCallback((trace: Trace) => {
  workerRef.current?.postMessage({ trace, algorithm: 'binary-search' });
}, []);
```

## Profiling with React DevTools

1. Open React DevTools → Profiler tab
2. Click "Record" 
3. Perform the interaction
4. Click "Stop"
5. Analyze:
   - **Why did this render?** — Shows what triggered re-render
   - **Flamegraph** — Shows which components are slow
   - **Ranked chart** — Shows which components took longest

## CodeAnvil-Specific Optimizations

### Execution Engine
```typescript
// Memoize trace parsing
const parsedTrace = useMemo(() => parseTrace(rawTrace), [rawTrace]);

// Virtualize step list if > 100 steps
const visibleSteps = useMemo(() => {
  return parsedTrace.steps.slice(scrollStart, scrollEnd);
}, [parsedTrace.steps, scrollStart, scrollEnd]);
```

### Variable Visualizer
```typescript
// Only re-render changed variables
const VariableRow = React.memo(({ name, value, changed }) => (
  <div data-changed={changed}>
    <span className="font-mono">{name}</span>
    <span>{JSON.stringify(value)}</span>
  </div>
));
```

### Code Editor
```typescript
// Debounce syntax highlighting
const [highlightedCode, setHighlightedCode] = useState('');
const debouncedHighlight = useMemo(
  () => debounce((code: string) => {
    setHighlightedCode(highlightLightning(code));
  }, 100),
  []
);
```

## Performance Budget

| Metric | Target | How to Measure |
|--------|--------|----------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Re-render duration | < 16ms | React Profiler |
| Bundle size (initial) | < 200KB gzip | webpack-bundle-analyzer |

## Never Ship

| Never | Instead |
| --- | --- |
| `useMemo` for simple values | Direct computation |
| `useCallback` without memoized children | Inline function |
| Virtualizing < 50 items | Direct rendering |
| `componentDidMount` for data | `useEffect` with deps |
| `shouldComponentUpdate` | `React.memo` |
| String refs | `useRef` |
| Inline objects in JSX props | Stable references |

## Output

Write the optimized code. Then note:
- **Before/after** — what performance metric improved
- **Trade-offs** — what complexity was added
- **Measurement** — how to verify the improvement
