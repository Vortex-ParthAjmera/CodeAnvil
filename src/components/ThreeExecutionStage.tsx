import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PrimitiveValue, TraceAction, TraceStep, TraceValue, VisualNode } from "../types";
import { formatValue } from "../utils/formatValue";
import { dispatchTraceStep, type TraceSceneModel, type TraceSceneTone } from "../visualization/dispatchTraceAction";

interface ThreeExecutionStageProps {
  isStale: boolean;
  reduceMotion: boolean;
  step: TraceStep;
}

interface StageState {
  camera: THREE.OrthographicCamera;
  dynamic: THREE.Group;
  frameId: number;
  progress: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  update: (progress: number) => void;
}

interface SceneBuild {
  update: (progress: number) => void;
}

const palette = {
  active: 0xf2a633,
  compare: 0x48b9d2,
  return: 0x6dcc91,
  done: 0x6dcc91,
  dim: 0x273135,
  panel: 0x12191b,
  text: "#edf1ee",
  muted: "#8f9a98",
};

function disposeMaterial(material: THREE.Material) {
  const spriteMaterial = material as THREE.SpriteMaterial;
  if (spriteMaterial.map) spriteMaterial.map.dispose();
  material.dispose();
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const renderable = child as THREE.Mesh;
    if (renderable.geometry) renderable.geometry.dispose();
    const material = renderable.material;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
  });
}

function clearGroup(group: THREE.Group) {
  while (group.children.length) {
    const child = group.children.pop();
    if (child) disposeObject(child);
  }
}

function makeTextSprite(
  text: string,
  color = palette.text,
  scale = 1,
  align: CanvasTextAlign = "center",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 144;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = "600 64px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.textAlign = align;
  context.textBaseline = "middle";
  const x = align === "left" ? 22 : align === "right" ? canvas.width - 22 : canvas.width / 2;
  context.fillText(text.slice(0, 34), x, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.4 * scale, 1 * scale, 1);
  return sprite;
}

function makeBox(
  width: number,
  height: number,
  depth: number,
  color: number,
  emissive = 0x000000,
  emissiveIntensity = 0,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    metalness: 0.08,
    roughness: 0.72,
  });
  return new THREE.Mesh(geometry, material);
}

function makeOutline(width: number, height: number, depth: number, color: number) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.78 }),
  );
}

function makePlate(label: string, detail: string, tone: number, emphasized: boolean) {
  const group = new THREE.Group();
  const surface = emphasized
    ? tone === palette.return
      ? 0x173224
      : tone === palette.compare
        ? 0x12313a
        : 0x342611
    : palette.panel;
  const mesh = makeBox(3.2, 0.64, 0.34, surface, tone, emphasized ? 0.16 : 0.03);
  group.add(mesh);
  group.add(makeOutline(3.2, 0.64, 0.34, emphasized ? tone : palette.dim));

  const title = makeTextSprite(label, emphasized ? "#fff2d5" : palette.text, 0.58);
  title.position.set(0, 0.11, 0.2);
  group.add(title);

  const subtitle = makeTextSprite(detail, emphasized ? "#f2c878" : palette.muted, 0.4);
  subtitle.position.set(0, -0.17, 0.2);
  group.add(subtitle);
  return group;
}

function makeLine(from: THREE.Vector3, to: THREE.Vector3, color: number, opacity = 0.55) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function toneColor(tone: TraceSceneTone) {
  if (tone === "compare") return palette.compare;
  if (tone === "return" || tone === "done") return palette.return;
  return palette.active;
}

function recursionValue(node: VisualNode) {
  if (!node.value || node.value === "?") return "waiting";
  return "returns " + node.value;
}

function buildRecursionScene(
  group: THREE.Group,
  step: TraceStep,
  model: TraceSceneModel,
): SceneBuild {
  const nodes = (step.visual.nodes || []).slice(0, 7);
  const animations: Array<(progress: number) => void> = [];
  const color = toneColor(model.tone);

  const callsLabel = makeTextSprite("CALLS DOWN", "#73807e", 0.43, "left");
  callsLabel.position.set(-2.58, 3.15, 0);
  group.add(callsLabel);

  const returnsLabel = makeTextSprite("RETURNS UP", "#6dcc91", 0.43, "right");
  returnsLabel.position.set(2.55, 3.15, 0);
  group.add(returnsLabel);

  const rail = makeLine(
    new THREE.Vector3(2.65, -2.55, -0.2),
    new THREE.Vector3(2.65, 2.62, -0.2),
    palette.return,
    0.3,
  );
  group.add(rail);

  nodes.forEach((node, index) => {
    const targetY = 2.35 - index * 1.05;
    const isActive = node.id === step.visual.activeNodeId;
    const isReturning = node.status === "returning"
      || (model.action.type === "return" && isActive);
    const nodeTone = node.status === "done" || isReturning ? palette.return : isActive ? color : palette.dim;
    const plate = makePlate(node.label, recursionValue(node), nodeTone, isActive || isReturning);
    plate.position.set(-1.15, targetY, 0);
    group.add(plate);

    if (index > 0) {
      group.add(makeLine(
        new THREE.Vector3(-1.15, targetY + 0.52, -0.18),
        new THREE.Vector3(-1.15, targetY + 0.86, -0.18),
        isActive ? palette.active : palette.dim,
      ));
    }

    if (model.action.type === "call" && isActive) {
      animations.push((progress) => {
        plate.position.y = targetY + (1 - progress) * 0.72;
        plate.scale.setScalar(0.92 + progress * 0.08);
      });
    }

    if ((node.status === "done" || node.status === "returning" || isReturning) && node.value && node.value !== "?") {
      const finalY = 1.7 - index * 1.0;
      const result = makePlate(node.value, node.label, palette.return, isReturning);
      result.scale.set(0.58, 0.58, 0.58);
      result.position.set(2.65, finalY, 0);
      group.add(result);

      if (isReturning) {
        animations.push((progress) => {
          const size = 0.35 + progress * 0.23;
          result.position.x = -1.15 + progress * 3.8;
          result.position.y = targetY + (finalY - targetY) * progress
            + Math.sin(progress * Math.PI) * 0.42;
          result.scale.set(size, size, size);
        });
      }
    }
  });

  if (!nodes.length) {
    const empty = makeTextSprite("No active call frames", palette.muted, 0.7);
    empty.position.set(0, 0, 0);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function primitiveArray(value: TraceValue | undefined): PrimitiveValue[] {
  return Array.isArray(value) ? value : [];
}

function arrayValues(step: TraceStep, action: TraceAction) {
  if (action.type === "swap") return action.after;
  const memory = step.memory.find((item) => item.type === "array");
  return primitiveArray(memory?.value);
}

function numericHeight(value: PrimitiveValue) {
  if (typeof value !== "number") return 0.9;
  return Math.max(0.72, Math.min(1.72, 0.62 + Math.abs(value) * 0.1));
}

function buildArrayScene(
  group: THREE.Group,
  step: TraceStep,
  model: TraceSceneModel,
): SceneBuild {
  const values = arrayValues(step, model.action).slice(0, 12);
  const count = Math.max(values.length, 1);
  const spacing = Math.min(1.24, 7.6 / count);
  const firstX = -((count - 1) * spacing) / 2;
  const selected = new Set(model.indices);
  const animations: Array<(progress: number) => void> = [];
  const memory = step.memory.find((item) => item.type === "array");
  const settled = new Set(
    (memory?.highlights || [])
      .filter((highlight) => highlight.role === "target" || highlight.role === "visited")
      .map((highlight) => highlight.index),
  );

  const arrayLabel = makeTextSprite(memory?.label || "array", palette.muted, 0.5, "left");
  arrayLabel.position.set(firstX - 0.25, 2.65, 0);
  group.add(arrayLabel);

  values.forEach((value, index) => {
    const height = numericHeight(value);
    const isSelected = selected.has(index);
    const isSettled = settled.has(index);
    const boxColor = isSettled
      ? 0x244f38
      : isSelected
        ? model.tone === "compare"
          ? 0x174451
          : model.tone === "return" || model.tone === "done"
            ? 0x173224
            : 0x342611
        : 0x183139;
    const outlineColor = isSettled
      ? palette.return
      : isSelected
        ? toneColor(model.tone)
        : palette.compare;
    const item = new THREE.Group();
    item.add(makeBox(0.82, height, 0.58, boxColor, outlineColor, isSelected ? 0.16 : 0.04));
    item.add(makeOutline(0.82, height, 0.58, outlineColor));

    const valueLabel = makeTextSprite(formatValue(value), palette.text, 0.56);
    valueLabel.position.set(0, height / 2 + 0.28, 0.34);
    item.add(valueLabel);

    const indexLabel = makeTextSprite(String(index), palette.muted, 0.4);
    indexLabel.position.set(0, -height / 2 - 0.35, 0.2);
    item.add(indexLabel);

    const targetX = firstX + index * spacing;
    const targetY = -0.45 + height / 2 + (isSelected ? 0.25 : 0);
    item.position.set(targetX, targetY, 0);
    group.add(item);

    if (model.action.type === "swap" && selected.has(index)) {
      const otherIndex = model.action.indices[0] === index
        ? model.action.indices[1]
        : model.action.indices[0];
      const direction = index === model.action.indices[0] ? -1 : 1;
      const startX = firstX + otherIndex * spacing;
      animations.push((progress) => {
        item.position.x = startX + (targetX - startX) * progress;
        item.position.y = targetY + direction * Math.sin(progress * Math.PI) * 0.58;
        item.rotation.z = direction * Math.sin(progress * Math.PI) * 0.12;
      });
    } else if (isSelected) {
      animations.push((progress) => {
        item.position.y = -0.45 + height / 2 + progress * 0.25;
      });
    }
  });

  if (model.action.type === "compare") {
    const predicate = makeTextSprite(
      formatValue(model.action.values[0]) + "  ?  " + formatValue(model.action.values[1]),
      "#d8f6fb",
      0.9,
    );
    predicate.position.set(0, 2.3, 0);
    group.add(predicate);
  }

  if (!values.length) {
    const empty = makeTextSprite("No array in this step", palette.muted, 0.7);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildVariablesScene(
  group: THREE.Group,
  step: TraceStep,
  model: TraceSceneModel,
): SceneBuild {
  const changed = new Set(step.changed.variables || []);
  const entries = Object.entries(step.variables)
    .filter(([name]) => !name.startsWith("__"))
    .slice(0, 8);
  const animations: Array<(progress: number) => void> = [];

  entries.forEach(([name, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const active = changed.has(name);
    const item = makePlate(
      name + " = " + formatValue(value),
      active ? "changed" : "current",
      active ? toneColor(model.tone) : palette.dim,
      active,
    );
    const x = column === 0 ? -1.8 : 1.8;
    const y = 2.25 - row * 1.38;
    item.position.set(x, y, 0);
    group.add(item);

    if (active) {
      animations.push((progress) => {
        item.position.y = y + (1 - progress) * 0.32;
        item.scale.setScalar(0.94 + progress * 0.06);
      });
    }
  });

  if (!entries.length) {
    const empty = makeTextSprite("No values exist yet", palette.muted, 0.72);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildGraphScene(
  group: THREE.Group,
  step: TraceStep,
  model: TraceSceneModel,
): SceneBuild {
  const nodes = (step.visual.nodes || []).slice(0, 10);
  const positions = new Map<string, THREE.Vector3>();
  const animations: Array<(progress: number) => void> = [];

  nodes.forEach((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, new THREE.Vector3(Math.cos(angle) * 2.7, Math.sin(angle) * 2.2, 0));
  });

  (step.visual.edges || []).forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from && to) group.add(makeLine(from, to, edge.status === "done" ? palette.return : palette.dim));
  });

  nodes.forEach((node) => {
    const position = positions.get(node.id);
    if (!position) return;
    const active = model.action.type === "visit_node" && model.action.node === node.id;
    const circle = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 40),
      new THREE.MeshStandardMaterial({
        color: active ? palette.active : node.status === "done" ? palette.return : palette.panel,
        emissive: active ? palette.active : 0x000000,
        emissiveIntensity: active ? 0.2 : 0,
      }),
    );
    circle.position.copy(position);
    group.add(circle);
    const label = makeTextSprite(node.label, active ? "#17130c" : palette.text, 0.46);
    label.position.copy(position).add(new THREE.Vector3(0, 0, 0.08));
    group.add(label);
    if (active) {
      animations.push((progress) => {
        const size = 0.86 + progress * 0.14;
        circle.scale.setScalar(size);
      });
    }
  });

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildOutputScene(group: THREE.Group, step: TraceStep): SceneBuild {
  const terminal = makeBox(6.2, 2.8, 0.28, 0x111719, palette.return, 0.05);
  terminal.position.set(0, 0, 0);
  group.add(terminal);
  group.add(makeOutline(6.2, 2.8, 0.28, palette.return));

  const prompt = makeTextSprite("> " + (step.output || "empty output"), "#a9efbd", 0.76, "left");
  prompt.position.set(-1.15, 0.2, 0.2);
  group.add(prompt);

  return {
    update(progress) {
      terminal.scale.set(0.98 + progress * 0.02, 0.98 + progress * 0.02, 1);
    },
  };
}

function buildScene(group: THREE.Group, step: TraceStep, model: TraceSceneModel) {
  clearGroup(group);
  if (model.kind === "recursion") return buildRecursionScene(group, step, model);
  if (model.kind === "array") return buildArrayScene(group, step, model);
  if (model.kind === "graph") return buildGraphScene(group, step, model);
  if (model.kind === "output") return buildOutputScene(group, step);
  return buildVariablesScene(group, step, model);
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

export function ThreeExecutionStage({
  isStale,
  reduceMotion,
  step,
}: ThreeExecutionStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<StageState | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const model = useMemo(() => dispatchTraceStep(step), [step]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d0e);
    const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 40);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.className = "ca-three-canvas";
    renderer.domElement.dataset.testid = "three-stage-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe9f1ed, 0x101515, 2.1));
    const key = new THREE.DirectionalLight(0xffd58c, 2.5);
    key.position.set(2, 5, 8);
    scene.add(key);

    const dynamic = new THREE.Group();
    scene.add(dynamic);

    const state: StageState = {
      camera,
      dynamic,
      frameId: 0,
      progress: 1,
      renderer,
      scene,
      update: () => undefined,
    };
    stateRef.current = state;

    const resize = () => {
      const width = Math.max(280, mount.clientWidth);
      const height = Math.max(260, mount.clientHeight);
      const aspect = width / height;
      const viewHeight = 7.6;
      camera.left = -(viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      state.update(state.progress);
      renderer.render(scene, camera);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    return () => {
      cancelAnimationFrame(state.frameId);
      observer.disconnect();
      clearGroup(dynamic);
      renderer.dispose();
      renderer.domElement.remove();
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    if (!state || isStale) return;

    cancelAnimationFrame(state.frameId);
    const built = buildScene(state.dynamic, step, model);
    state.update = built.update;
    state.progress = reduceMotion ? 1 : 0;

    if (reduceMotion) {
      state.update(1);
      state.renderer.render(state.scene, state.camera);
      return;
    }

    const startedAt = performance.now();
    const duration = model.action.type === "swap" ? 720 : 560;
    const tick = (now: number) => {
      const linear = Math.min(1, (now - startedAt) / duration);
      state.progress = easeOutCubic(linear);
      state.update(state.progress);
      state.renderer.render(state.scene, state.camera);
      if (linear < 1) state.frameId = requestAnimationFrame(tick);
    };
    state.frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(state.frameId);
  }, [isStale, model, reduceMotion, step]);

  const legend = model.kind === "recursion"
    ? ["call descends", "return rises", "completed"]
    : model.kind === "array"
      ? ["current values", "compared", "settled"]
      : ["current state", "changed", "completed"];

  return (
    <section className="ca-stage" aria-label="Execution stage">
      <header className="ca-stage__header">
        <div>
          <span>Execution stage</span>
          <strong>{model.kind}</strong>
        </div>
        <div className="ca-stage__step">
          <span>Step {step.index + 1}</span>
          <strong>{step.event.replace(/_/g, " ")}</strong>
        </div>
      </header>

      <div className={"ca-stage__explanation ca-tone-" + model.tone} aria-live="polite">
        <span>Line {step.line}</span>
        <strong>{model.headline}</strong>
        <p>{model.detail}</p>
      </div>

      <div className="ca-three-mount" ref={mountRef}>
        {webglFailed ? (
          <div className="ca-stage-fallback">
            <strong>{model.headline}</strong>
            <span>{model.detail}</span>
          </div>
        ) : null}
        {isStale ? (
          <div className="ca-stage-stale">
            <strong>Trace out of sync</strong>
            <span>Trace the edited source to update this execution.</span>
          </div>
        ) : null}
      </div>

      <footer className="ca-stage__legend" aria-label="Stage legend">
        {legend.map((item, index) => (
          <span key={item}>
            <i className={"legend-" + String(index)} />
            {item}
          </span>
        ))}
      </footer>
    </section>
  );
}
