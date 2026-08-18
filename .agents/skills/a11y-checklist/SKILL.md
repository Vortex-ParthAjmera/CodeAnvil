---
name: a11y-checklist
description: Build accessible web applications that work for everyone. Use when implementing UI components, forms, navigation, or interactive elements. Covers WCAG 2.1 AA compliance, keyboard navigation, screen reader support, color contrast, ARIA patterns, and focus management. Essential for educational apps that must be usable by all students.
---

# Accessibility Checklist

A skill for building accessible web applications — not as an afterthought, but as a core requirement. Educational apps like CodeAnvil must work for all students, including those using screen readers, keyboard navigation, or assistive technologies.

## Operating Posture

You are an accessibility engineer who tests with real assistive technology. Automated tools catch ~30% of issues; the rest require manual testing with screen readers and keyboard-only navigation.

Two failure modes:
1. **Adding ARIA without understanding** — `aria-label` on every element, `role` attributes everywhere. This often makes things worse.
2. **Ignoring accessibility** — assuming "it works for me" means it works for everyone.

## The A11y Checklist

### 1. Keyboard Navigation

Every interactive element must be:
- [ ] Focusable with `Tab` / `Shift+Tab`
- [ ] Activatable with `Enter` / `Space`
- [ ] Escapable with `Escape` (for modals, dropdowns)
- [ ] Visually focused (focus ring visible)

```typescript
// ✅ Good: Focus management in modal
function Modal({ isOpen, onClose, children }) {
  const closeButtonRef = useRef(null);
  
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title">Settings</h2>
      {children}
      <button ref={closeButtonRef} onClick={onClose}>Close</button>
    </div>
  );
}
```

### 2. Semantic HTML

Use the right element for the job:

```typescript
// ❌ Bad: Div soup
<div class="button" onClick={handleClick}>Play</div>

// ✅ Good: Semantic element
<button onClick={handleClick}>Play</button>

// ❌ Bad: Non-semantic list
<div>
  <span>Binary Search</span>
  <span>Bubble Sort</span>
</div>

// ✅ Good: Semantic list
<ul>
  <li>Binary Search</li>
  <li>Bubble Sort</li>
</ul>
```

### 3. Color and Contrast

- [ ] Text contrast ratio ≥ 4.5:1 (normal text)
- [ ] Text contrast ratio ≥ 3:1 (large text, 18px+)
- [ ] UI components contrast ratio ≥ 3:1
- [ ] Don't rely on color alone to convey information

```typescript
// ❌ Bad: Color-only indicator
<div className={isError ? 'text-red-500' : 'text-gray-500'}>
  {message}
</div>

// ✅ Good: Color + icon + text
<div className={isError ? 'text-red-500' : 'text-gray-500'}>
  {isError && <AlertIcon aria-hidden="true" />}
  <span className="sr-only">{isError ? 'Error: ' : ''}</span>
  {message}
</div>
```

### 4. Images and Icons

```typescript
// Decorative icon — hide from screen readers
<SearchIcon aria-hidden="true" />

// Meaningful icon — provide alternative text
<Icon name="error" aria-label="Error" />

// Image with description
<img 
  src="recursion-tree.png" 
  alt="Binary tree showing recursive calls: root calls left and right children" 
/>

// Complex image — use figure + figcaption
<figure>
  <img src="algorithm-flowchart.png" alt="Flowchart of binary search algorithm" />
  <figcaption>
    Binary search compares target with middle element, 
    then searches left or right half.
  </figcaption>
</figure>
```

### 5. Forms and Inputs

```typescript
// ❌ Bad: No label association
<input type="text" placeholder="Enter code" />

// ✅ Good: Associated label
<label htmlFor="code-input">Enter code</label>
<input id="code-input" type="text" />

// ✅ Good: Accessible name for icon-only button
<button aria-label="Play animation">
  <PlayIcon />
</button>

// ✅ Good: Error messages linked to input
<div>
  <label htmlFor="speed">Playback speed</label>
  <input 
    id="speed" 
    type="number" 
    aria-invalid={hasError}
    aria-describedby={hasError ? 'speed-error' : undefined}
  />
  {hasError && (
    <p id="speed-error" role="alert">
      Speed must be between 0.5x and 2x
    </p>
  )}
</div>
```

### 6. Dynamic Content (Live Regions)

```typescript
// Announce step changes to screen readers
<div 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  Step {currentStep} of {totalSteps}: 
  Variable x changed to {value}
</div>

// Announce errors immediately
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

### 7. Complex Widgets

#### Tabs
```typescript
<div role="tablist" aria-label="Algorithm visualization">
  <button 
    role="tab" 
    aria-selected={activeTab === 'code'}
    aria-controls="code-panel"
    id="code-tab"
  >
    Code
  </button>
  <button 
    role="tab" 
    aria-selected={activeTab === 'variables'}
    aria-controls="variables-panel"
    id="variables-tab"
  >
    Variables
  </button>
</div>

<div 
  role="tabpanel" 
  id="code-panel" 
  aria-labelledby="code-tab"
  hidden={activeTab !== 'code'}
>
  {/* Code content */}
</div>
```

#### Tree View (Recursion Tree)
```typescript
<ul role="tree" aria-label="Recursion call stack">
  <li role="treeitem" aria-expanded="true">
    <span>factorial(5)</span>
    <ul role="group">
      <li role="treeitem" aria-expanded="false">
        <span>factorial(4)</span>
      </li>
    </ul>
  </li>
</ul>
```

#### Timeline/Slider
```typescript
<input 
  type="range" 
  min={0} 
  max={totalSteps}
  value={currentStep}
  onChange={handleStepChange}
  aria-label={`Step ${currentStep} of ${totalSteps}`}
  aria-valuemin={0}
  aria-valuemax={totalSteps}
  aria-valuenow={currentStep}
  aria-valuetext={`Step ${currentStep}: ${stepDescription}`}
/>
```

### 8. Reduced Motion

```typescript
// Respect user preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// In animation
<div
  style={{
    transform: prefersReducedMotion ? 'none' : `translateX(${offset}px)`,
    transition: prefersReducedMotion ? 'none' : 'transform 150ms ease-out',
  }}
/>
```

### 9. Focus Management

```typescript
// Move focus when content changes
function StepNavigator({ steps, currentStep }) {
  const stepRef = useRef(null);
  
  useEffect(() => {
    // Announce step change and move focus
    stepRef.current?.focus();
  }, [currentStep]);
  
  return (
    <div 
      ref={stepRef}
      tabIndex={-1}
      aria-live="polite"
    >
      Step {currentStep}: {steps[currentStep].description}
    </div>
  );
}

// Roving tabindex for toolbars
function Toolbar() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div role="toolbar" aria-label="Playback controls">
      {buttons.map((button, index) => (
        <button
          key={button.id}
          tabIndex={index === activeIndex ? 0 : -1}
          aria-label={button.label}
          onClick={button.action}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              setActiveIndex((i) => (i + 1) % buttons.length);
            }
          }}
        />
      ))}
    </div>
  );
}
```

## Testing Accessibility

### Automated Testing
```bash
# Install axe-core
npm install -D @axe-core/react

# Add to dev mode
if (process.env.NODE_ENV === 'development') {
  import axe from '@axe-core/react';
  axe(React, ReactDOM, 1000);
}
```

### Manual Testing Checklist
1. [ ] Unplug mouse — can you do everything with keyboard?
2. [ ] Use VoiceOver (Mac) or NVDA (Windows) — do elements make sense?
3. [ ] Zoom to 200% — does layout break?
4. [ ] Check color contrast with WebAIM tool
5. [ ] Test with `prefers-reduced-motion: reduce`

## CodeAnvil-Specific Patterns

### Code Editor Accessibility
```typescript
// Announce current line to screen readers
<div 
  aria-live="polite" 
  className="sr-only"
>
  Line {currentLine}: {codeLines[currentLine]}
</div>

// Make line numbers keyboard accessible
<button
  className="line-number"
  onClick={() => goToLine(lineNumber)}
  aria-label={`Go to line ${lineNumber}`}
>
  {lineNumber}
</button>
```

### Variable Visualizer Accessibility
```typescript
// Announce variable changes
<div aria-live="polite">
  {changedVars.map(v => (
    <span key={v} className="sr-only">
      Variable {v} changed to {variables[v]}
    </span>
  ))}
</div>
```

## Screen Reader Text Utility

```typescript
// components/SrOnly.tsx
export function SrOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

// In CSS:
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Never Ship

| Never | Instead |
| --- | --- |
| `tabindex > 0` | Use `tabindex="0"` or native elements |
| `<div onClick>` | `<button onClick>` |
| `aria-label` without visible text | Visible label or `aria-labelledby` |
| Auto-playing animations | User-controlled playback |
| `outline: none` | Custom focus styles |
| Placeholder as label | Associated `<label>` element |

## Output

Write accessible code. Then note:
- **Keyboard tested** — confirm Tab/Enter/Escape work
- **Screen reader tested** — confirm announcements make sense
- **Color contrast** — verify ratios meet WCAG AA
- **Reduced motion** — confirm animations respect preference
