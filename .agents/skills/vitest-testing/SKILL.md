---
name: vitest-testing
description: Write effective Vitest tests for React components, hooks, and utilities. Use when writing unit tests, integration tests, mocking modules, snapshot testing, or setting up test infrastructure. Covers describe/it/expect patterns, vi.fn() mocking, beforeEach cleanup, and Vitest-specific features like inline snapshots and test sequences.
---

# Vitest Testing

A testing skill for Vitest — the fast, Vite-native test runner. Focuses on patterns that produce reliable, maintainable tests without over-mocking.

## Operating Posture

You are a test engineer who writes tests that catch real bugs, not tests that merely pass. Every test should verify behavior, not implementation details. If a test breaks when you refactor internal code but the behavior is unchanged, the test is wrong.

Two failure modes:
1. **Testing implementation** — asserting on internal state, call counts, or private methods. These tests are brittle and provide false confidence.
2. **Not testing enough** — happy-path-only tests that miss edge cases, error states, and boundary conditions.

## Hard Rules

1. **One assertion per concept.** A test can have multiple `expect` calls, but they should all verify one logical behavior.
2. **Arrange-Act-Assert.** Structure every test with clear setup, execution, and verification phases.
3. **No `test.skip` in committed code.** Either implement it or delete it. Skip only during active development.
4. **Clean up after yourself.** Use `beforeEach`/`afterEach` for shared setup/teardown. Never leave side effects between tests.
5. **Mock at the boundary.** Mock network requests and external services, not internal modules.

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('usePlayback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start playback from the beginning', () => {
    // Arrange
    const { result } = renderHook(() => usePlayback(mockTrace));

    // Act
    act(() => result.current.play());

    // Assert
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentIndex).toBe(0);
  });
});
```

## Mocking Patterns

### Functions
```typescript
const mockFn = vi.fn();
mockFn.mockReturnValue(42);
mockFn.mockResolvedValue(Promise.resolve('data'));
```

### Modules
```typescript
vi.mock('./module', () => ({
  exportedFunction: vi.fn(),
}));
```

### Timers
```typescript
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

### Modules with partial mocks
```typescript
vi.mock('./module', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    specificFunction: vi.fn(),
  };
});
```

## React Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  it('should highlight the current line', () => {
    render(<CodeEditor code="line 1\nline 2" currentLine={1} />);
    
    const line = screen.getByTestId('line-1');
    expect(line).toHaveClass('highlighted');
  });

  it('should call onLineChange when clicking a line', () => {
    const handleChange = vi.fn();
    render(<CodeEditor code="line 1" onLineChange={handleChange} />);
    
    fireEvent.click(screen.getByTestId('line-1'));
    expect(handleChange).toHaveBeenCalledWith(0);
  });
});
```

## Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useExecutionTimeline } from './useExecutionTimeline';

describe('useExecutionTimeline', () => {
  it('should advance to next step', () => {
    const { result } = renderHook(() => useExecutionTimeline(mockSteps));
    
    act(() => result.current.next());
    
    expect(result.current.currentStep).toBe(1);
  });

  it('should not advance past the end', () => {
    const { result } = renderHook(() => useExecutionTimeline([mockStep]));
    
    act(() => result.current.next());
    act(() => result.current.next()); // Should not throw
    
    expect(result.current.currentStep).toBe(0); // Wrapped around
  });
});
```

## Async Testing

```typescript
it('should load examples from the library', async () => {
  render(<ExampleLibrary />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Binary Search')).toBeInTheDocument();
  });
});
```

## Snapshot Testing

Use sparingly — only for stable UI that rarely changes:

```typescript
it('should render the playback controls', () => {
  const { container } = render(<PlaybackControls />);
  expect(container).toMatchSnapshot();
});

// Inline snapshots for small structures
it('should parse the trace format', () => {
  expect(parseTrace(input)).toMatchInlineSnapshot(`
    {
      "steps": [...],
      "variables": {...}
    }
  `);
});
```

## Vitest Config Tips

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

## Common Patterns for CodeAnvil

### Trace Step Testing
```typescript
it('should correctly step through binary search', () => {
  const trace = createBinarySearchTrace([1, 2, 3, 4, 5], 3);
  const engine = new ExecutionEngine(trace);
  
  expect(engine.currentStep().line).toBe(2);
  engine.step();
  expect(engine.currentStep().variables).toMatchObject({ low: 0, high: 4 });
});
```

### Variable Visualizer Testing
```typescript
it('should display changed variables in the current step', () => {
  render(<VariableVisualizer 
    variables={{ x: 5, y: 10 }} 
    changed={['x']} 
  />);
  
  expect(screen.getByText('x: 5')).toHaveClass('changed');
  expect(screen.getByText('y: 10')).not.toHaveClass('changed');
});
```

## Never Ship

| Never | Instead |
| --- | --- |
| `getByClassName` | `getByTestId` or `getByRole` |
| `waitFor` with timeout < default | Use default or increase for slow operations |
| Mocking everything | Mock only external boundaries |
| Testing snapshot of dynamic content | Test the content, not the snapshot |
| `it('works')` | Descriptive name like `it('should sort items in ascending order')` |

## Output

Write the test code. Then note:
- **Coverage target** — what percentage and what cases matter
- **Mock decisions** — what's mocked and why
- **Edge cases covered** — boundary conditions tested
