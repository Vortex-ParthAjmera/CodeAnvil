---
name: canvas-performance
description: Build smooth 60fps canvas and WebGL visualizations. Use when implementing sorting visualizers, grid animations, data structure diagrams, or any canvas-based rendering. Covers requestAnimationFrame loops, offscreen canvas, WebGL basics, double buffering, and performance profiling. Essential for DSA visualizations that must animate smoothly.
---

# Canvas Performance

A skill for building smooth, performant canvas and WebGL visualizations — the kind that maintain 60fps even with hundreds of animated elements. Critical for CodeAnvil's DSA visualizers.

## Operating Posture

You are a graphics engineer who thinks in frames. Every millisecond of your render loop is budgeted. If you miss 16ms, the user sees a stutter.

Two failure modes:
1. **Rendering too much** — Redrawing everything every frame when only 5% changed.
2. **Not batching** — Making individual draw calls for each element instead of batching.

## The Performance Budget

At 60fps, you have **16.67ms per frame**:

| Phase | Budget |
|-------|--------|
| JavaScript execution | ~8ms |
| Rendering/Paint | ~4ms |
| Compositing | ~4ms |
| Buffer | ~0.67ms |

If your JS takes >8ms, you drop frames.

## Core Patterns

### The Render Loop

```typescript
// ✅ Good: Clean render loop
class Visualizer {
  private animationId: number | null = null;
  private lastTime = 0;
  
  start() {
    this.lastTime = performance.now();
    this.tick();
  }
  
  private tick = (currentTime: number) => {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update state
    this.update(deltaTime);
    
    // Render
    this.render();
    
    // Schedule next frame
    this.animationId = requestAnimationFrame(this.tick);
  };
  
  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// ❌ Bad: setTimeout-based loop
function animate() {
  render();
  setTimeout(animate, 16); // Not synced to display refresh
}
```

### Dirty Rectangle Rendering

```typescript
// Only redraw what changed
class OptimizedCanvas {
  private dirtyRegions: DOMRect[] = [];
  
  markDirty(x: number, y: number, width: number, height: number) {
    this.dirtyRegions.push(new DOMRect(x, y, width, height));
  }
  
  render() {
    if (this.dirtyRegions.length === 0) return;
    
    // Merge overlapping regions
    const regions = this.mergeRegions(this.dirtyRegions);
    
    // Only clear and redraw dirty areas
    for (const region of regions) {
      this.ctx.clearRect(region.x, region.y, region.width, region.height);
      this.drawRegion(region);
    }
    
    this.dirtyRegions = [];
  }
}
```

### Double Buffering

```typescript
// Prevent flickering by drawing to offscreen canvas first
class DoubleBufferedCanvas {
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  
  constructor(private canvas: HTMLCanvasElement) {
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = canvas.width;
    this.offscreen.height = canvas.height;
    this.offCtx = this.offscreen.getContext('2d')!;
  }
  
  render() {
    // Draw everything to offscreen
    this.offCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
    this.drawAllElements(this.offCtx);
    
    // Copy to visible canvas in one operation
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.offscreen, 0, 0);
  }
}
```

### Object Pooling

```typescript
// Reuse objects instead of creating/destroying
class ObjectPool<T> {
  private pool: T[] = [];
  
  constructor(private factory: () => T, private reset: (obj: T) => void) {}
  
  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }
  
  release(obj: T) {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// Usage for particles
const particlePool = new ObjectPool(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 1 }),
  (p) => { p.life = 1; }
);

// In animation loop
const particle = particlePool.acquire();
// ... use particle
particlePool.release(particle);
```

## Sorting Visualizer Patterns

### Bar Chart Rendering

```typescript
class BarChartVisualizer {
  private bars: Bar[] = [];
  
  render(ctx: CanvasRenderingContext2D, state: SortState) {
    const { width, height } = ctx.canvas;
    const barWidth = width / state.array.length;
    
    for (let i = 0; i < state.array.length; i++) {
      const barHeight = (state.array[i] / maxValue) * height;
      const x = i * barWidth;
      const y = height - barHeight;
      
      // Color based on state
      if (state.comparing.includes(i)) {
        ctx.fillStyle = '#ff6b6b'; // Comparing
      } else if (state.swapping.includes(i)) {
        ctx.fillStyle = '#4ecdc4'; // Swapping
      } else if (state.sorted.includes(i)) {
        ctx.fillStyle = '#95e1d3'; // Sorted
      } else {
        ctx.fillStyle = '#4a4a4a'; // Default
      }
      
      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    }
  }
}
```

### Animated Transitions

```typescript
class AnimatedArray {
  private positions: Map<number, { x: number; y: number }> = new Map();
  private targets: Map<number, { x: number; y: number }> = new Map();
  
  // Set target positions for animation
  setPositions(array: number[]) {
    for (let i = 0; i < array.length; i++) {
      this.targets.set(array[i], {
        x: i * this.barWidth,
        y: this.canvas.height - array[i] * this.scale,
      });
    }
  }
  
  // Interpolate towards targets
  update(deltaTime: number) {
    const lerp = 0.1; // Adjust for speed
    
    for (const [id, target] of this.targets) {
      const current = this.positions.get(id) ?? target;
      
      current.x += (target.x - current.x) * lerp;
      current.y += (target.y - current.y) * lerp;
      
      this.positions.set(id, current);
    }
  }
}
```

## Grid Visualizer Patterns

### BFS/DFS Grid

```typescript
class GridVisualizer {
  private cellSize: number;
  private grid: Cell[][];
  
  render(ctx: CanvasRenderingContext2D, state: GridState) {
    const { width, height } = ctx.canvas;
    
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const cell = this.grid[row][col];
        
        // Color based on state
        if (cell.state === 'visited') {
          ctx.fillStyle = '#74b9ff';
        } else if (cell.state === 'current') {
          ctx.fillStyle = '#fdcb6e';
        } else if (cell.state === 'path') {
          ctx.fillStyle = '#00b894';
        } else if (cell.state === 'wall') {
          ctx.fillStyle = '#2d3436';
        } else {
          ctx.fillStyle = '#dfe6e9';
        }
        
        ctx.fillRect(x, y, this.cellSize - 1, this.cellSize - 1);
      }
    }
  }
}
```

### Path Animation

```typescript
class PathAnimator {
  private path: Point[] = [];
  private progress = 0;
  
  render(ctx: CanvasRenderingContext2D) {
    if (this.path.length < 2) return;
    
    const totalLength = this.calculateTotalLength();
    const targetLength = totalLength * this.progress;
    
    ctx.beginPath();
    ctx.strokeStyle = '#00b894';
    ctx.lineWidth = 3;
    
    let currentLength = 0;
    ctx.moveTo(this.path[0].x, this.path[0].y);
    
    for (let i = 1; i < this.path.length; i++) {
      const prev = this.path[i - 1];
      const curr = this.path[i];
      const segmentLength = this.distance(prev, curr);
      
      if (currentLength + segmentLength > targetLength) {
        // Interpolate to exact position
        const t = (targetLength - currentLength) / segmentLength;
        const x = prev.x + (curr.x - prev.x) * t;
        const y = prev.y + (curr.y - prev.y) * t;
        ctx.lineTo(x, y);
        break;
      }
      
      currentLength += segmentLength;
      ctx.lineTo(curr.x, curr.y);
    }
    
    ctx.stroke();
  }
}
```

## Performance Profiling

### Frame Rate Monitor

```typescript
class FrameRateMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  
  update() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.frames.push(delta);
    if (this.frames.length > 60) {
      this.frames.shift();
    }
  }
  
  getFPS(): number {
    if (this.frames.length === 0) return 0;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return 1000 / avg;
  }
  
  isDropping(): boolean {
    return this.getFPS() < 55; // Below 55fps threshold
  }
}
```

### Offscreen Canvas for Web Workers

```typescript
// Main thread
const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker(new URL('./renderer.worker.ts', import.meta.url));
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker (renderer.worker.ts)
self.onmessage = (e) => {
  const { canvas } = e.data;
  const ctx = canvas.getContext('2d')!;
  
  function render() {
    // Heavy rendering in worker thread
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ... draw everything
    requestAnimationFrame(render);
  }
  
  render();
};
```

## WebGL Basics for Complex Visualizations

```typescript
// Simple WebGL setup for particle systems
class WebGLVisualizer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffers: Map<string, WebGLBuffer> = new Map();
  
  constructor(canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext('webgl')!;
    this.program = this.createProgram();
  }
  
  render(particles: Particle[]) {
    const { gl } = this;
    
    // Update buffer data
    const positions = new Float32Array(particles.length * 2);
    for (let i = 0; i < particles.length; i++) {
      positions[i * 2] = particles[i].x;
      positions[i * 2 + 1] = particles[i].y;
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    
    // Draw
    gl.drawArrays(gl.POINTS, 0, particles.length);
  }
}
```

## CodeAnvil-Specific Optimizations

### Trace Playback Rendering

```typescript
class TraceRenderer {
  private stepCache: Map<number, RenderState> = new Map();
  
  // Pre-compute render states for smooth playback
  preload(trace: Trace) {
    for (let i = 0; i < trace.steps.length; i++) {
      this.stepCache.set(i, this.computeRenderState(trace, i));
    }
  }
  
  // Render current step from cache
  renderStep(ctx: CanvasRenderingContext2D, stepIndex: number) {
    const state = this.stepCache.get(stepIndex);
    if (!state) return;
    
    // Fast path: render from cached state
    this.renderState(ctx, state);
  }
}
```

### Variable Changes Animation

```typescript
class VariableAnimator {
  private changes: Array<{ name: string; from: unknown; to: unknown; time: number }> = [];
  
  addChange(name: string, from: unknown, to: unknown) {
    this.changes.push({
      name,
      from,
      to,
      time: performance.now(),
    });
  }
  
  render(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    
    for (const change of this.changes) {
      const elapsed = now - change.time;
      const progress = Math.min(elapsed / 200, 1); // 200ms animation
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate value
      const current = this.interpolate(change.from, change.to, eased);
      
      // Render with visual feedback
      this.renderVariable(ctx, change.name, current, progress);
    }
    
    // Remove completed animations
    this.changes = this.changes.filter(c => now - c.time < 200);
  }
}
```

## Performance Checklist

- [ ] Using `requestAnimationFrame` (not `setTimeout`)
- [ ] Not creating objects in render loop
- [ ] Batching draw calls where possible
- [ ] Using dirty rectangle rendering for partial updates
- [ ] Profiling shows <16ms per frame
- [ ] Offscreen canvas for complex rendering
- [ ] Object pooling for frequently created/destroyed objects
- [ ] WebGL for >1000 animated elements

## Never Ship

| Never | Instead |
| --- | --- |
| `setTimeout` for animation | `requestAnimationFrame` |
| Creating objects in render loop | Object pooling |
| Redrawing everything every frame | Dirty rectangle rendering |
| `canvas.toDataURL()` in loop | Keep pixels in memory |
| Synchronous pixel manipulation | `ImageData` + `putImageData` |
| No frame rate monitoring | Always measure |

## Output

Write performant canvas code. Then note:
- **Frame rate** — measured FPS during animation
- **Bottlenecks** — what's slow and how to fix
- **Trade-offs** — what's sacrificed for performance
