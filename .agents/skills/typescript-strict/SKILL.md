---
name: typescript-strict
description: Write type-safe TypeScript with strict mode. Use when defining interfaces, handling API responses, working with generics, or refactoring untyped code. Covers type guards, discriminated unions, utility types, const assertions, and patterns that eliminate runtime errors. Essential for complex data structures like DSA traces and execution states.
---

# TypeScript Strict Mode

A skill for writing TypeScript that catches errors at compile time, not runtime. Focuses on patterns that make illegal states unrepresentable and invalid data impossible.

## Operating Posture

You are a type architect who designs types that prevent bugs. Every `any` is a potential runtime error. Every `as` type assertion is a lie the compiler believes.

Two failure modes:
1. **Over-typing** — Creating complex types for simple values. Types should clarify, not obscure.
2. **Under-typing** — Using `any` or `as` to silence the compiler. This hides bugs.

## Hard Rules

1. **No `any` in production code.** Use `unknown` and narrow with type guards.
2. **No `as` assertions without justification.** If you need `as`, your types are wrong.
3. **Prefer `interface` for public APIs, `type` for internal shapes.**
4. **Use `const` assertions** for literal types: `as const`.
5. **Make illegal states unrepresentable** with discriminated unions.

## Type Guard Patterns

### Narrowing with `in`
```typescript
function processStep(step: Step) {
  if ('variable' in step) {
    // step is VariableChange
    console.log(step.variable, step.newValue);
  } else if ('call' in step) {
    // step is FunctionCall
    console.log(step.call, step.args);
  }
}
```

### Discriminated Unions
```typescript
// ✅ Good: Impossible states are unrepresentable
type Step = 
  | { type: 'variable-change'; variable: string; newValue: unknown }
  | { type: 'function-call'; functionName: string; args: unknown[] }
  | { type: 'function-return'; value: unknown }
  | { type: 'line-highlight'; line: number };

function processStep(step: Step) {
  switch (step.type) {
    case 'variable-change':
      // step is narrowed to { type: 'variable-change'; variable: string; newValue: unknown }
      updateVariable(step.variable, step.newValue);
      break;
    case 'function-call':
      // step is narrowed to { type: 'function-call'; functionName: string; args: unknown[] }
      pushToCallStack(step.functionName, step.args);
      break;
    // Exhaustiveness check
    default:
      const _exhaustive: never = step;
      return _exhaustive;
  }
}
```

### Custom Type Guards
```typescript
function isVariableChange(step: Step): step is VariableChange {
  return step.type === 'variable-change';
}

// Usage
if (isVariableChange(step)) {
  // TypeScript knows this is a VariableChange
  console.log(step.variable);
}
```

### Assertion Functions
```typescript
function assertDefined<T>(value: T | null | undefined, name: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${name} is required`);
  }
}

// Usage
function getStep(steps: Step[], index: number) {
  const step = steps[index];
  assertDefined(step, 'step');
  // TypeScript knows step is not null/undefined
  return step;
}
```

## Utility Types

### `Pick` and `Omit`
```typescript
interface Trace {
  id: string;
  name: string;
  steps: Step[];
  metadata: Metadata;
}

// Only need these for the list view
type TraceSummary = Pick<Trace, 'id' | 'name'>;

// Create without id (server generates it)
type CreateTrace = Omit<Trace, 'id'>;
```

### `Record` for Maps
```typescript
// ✅ Good: Explicit keys
type VariableMap = Record<string, number>;

// ❌ Bad: Index signature allows any key
interface BadVariableMap {
  [key: string]: number;
}
```

### `Extract` and `Exclude`
```typescript
type PlaybackAction = 'play' | 'pause' | 'step-forward' | 'step-back' | 'reset';

// Only navigation actions
type NavigationAction = Extract<PlaybackAction, 'step-forward' | 'step-back'>;

// All except reset
type NonResetAction = Exclude<PlaybackAction, 'reset'>;
```

### `NonNullable` and `Required`
```typescript
type OptionalConfig = {
  speed?: number;
  loop?: boolean;
  autoPlay?: boolean;
};

// Make everything required
type RequiredConfig = Required<OptionalConfig>;

// Remove null/undefined from union
type SafeValue = NonNullable<string | null | undefined>; // string
```

## Generic Patterns

### Constrained Generics
```typescript
// ✅ Good: Constraint ensures T has what we need
function getProperty<T extends Record<string, unknown>, K extends keyof T>(
  obj: T, 
  key: K
): T[K] {
  return obj[key];
}

// Usage
const trace = { name: 'Binary Search', steps: [] };
const name = getProperty(trace, 'name'); // TypeScript knows this is string
```

### Generic Interfaces
```typescript
interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

function parseTrace(input: string): Result<Trace, ParseError> {
  try {
    const trace = JSON.parse(input);
    return { success: true, data: trace };
  } catch (e) {
    return { success: false, error: { message: e.message } };
  }
}

// Usage
const result = parseTrace(rawInput);
if (result.success) {
  // TypeScript knows result.data is Trace
  console.log(result.data.steps);
} else {
  // TypeScript knows result.error is ParseError
  console.error(result.error.message);
}
```

### Mapped Types
```typescript
type EventHandlers<T extends string> = {
  [K in T]: (payload: never) => void;
};

type PlaybackEvents = EventHandlers<
  'play' | 'pause' | 'step' | 'reset'
>;

// Results in:
// {
//   play: (payload: never) => void;
//   pause: (payload: never) => void;
//   step: (payload: never) => void;
//   reset: (payload: never) => void;
// }
```

## Const Assertions

```typescript
// ✅ Good: Literal types preserved
const STEPS = ['init', 'compare', 'swap', 'done'] as const;
type Step = typeof STEPS[number]; // 'init' | 'compare' | 'swap' | 'done'

// ❌ Bad: Widened to string[]
const steps = ['init', 'compare', 'swap', 'done'];

// ✅ Good: Object as const
const DEFAULTS = {
  speed: 1,
  loop: false,
  autoPlay: false,
} as const;
type Defaults = typeof DEFAULTS;
```

## Never and Exhaustiveness

```typescript
// Use never for exhaustiveness checks
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      return assertNever(shape); // Compile error if case missing
  }
}
```

## CodeAnvil-Specific Types

### Trace Format
```typescript
// Make illegal traces impossible
type TraceStep = 
  | { type: 'line'; line: number }
  | { type: 'variable'; name: string; value: unknown }
  | { type: 'call'; function: string; args: unknown[] }
  | { type: 'return'; value: unknown };

interface Trace {
  id: string;
  algorithm: string;
  language: 'python' | 'javascript' | 'typescript';
  input: unknown;
  steps: TraceStep[];
  output: unknown;
}
```

### Execution State
```typescript
// Discriminated union for execution state
type ExecutionState =
  | { status: 'idle' }
  | { status: 'running'; currentStep: number }
  | { status: 'paused'; currentStep: number }
  | { status: 'completed'; result: unknown }
  | { status: 'error'; error: ExecutionError };

function getStatusMessage(state: ExecutionState): string {
  switch (state.status) {
    case 'idle':
      return 'Ready to start';
    case 'running':
      return `Running step ${state.currentStep}`;
    case 'paused':
      return `Paused at step ${state.currentStep}`;
    case 'completed':
      return 'Execution complete';
    case 'error':
      return `Error: ${state.error.message}`;
  }
}
```

## TypeScript Config

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true
  }
}
```

## Never Ship

| Never | Instead |
| --- | --- |
| `any` | `unknown` + type guard |
| `as Type` | Type guard or proper typing |
| `!` (non-null assertion) | Null check or `assertDefined` |
| `enum` | Union of string literals |
| `interface Foo {}` | Add properties or delete the file |
| Index signature `[key: string]` | `Record<string, T>` with known keys |

## Output

Write type-safe code. Then note:
- **Type coverage** — what's typed vs what needs work
- **Runtime safety** — what errors are now caught at compile time
- **Trade-offs** — what complexity was added for type safety
