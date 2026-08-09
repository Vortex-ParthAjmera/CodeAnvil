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
  camera: THREE.PerspectiveCamera;
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
  amber: 0xf5b84b,
  blue: 0x3b82f6,
  deep: 0x020605,
  dim: 0x1b2a28,
  green: 0x78e2bf,
  panel: 0x0a1210,
  red: 0xef4444,
  teal: 0x12a587,
  text: "#f5faf8",
  muted: "#8b9c97",
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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function segment(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOut(value: number) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function toneColor(tone: TraceSceneTone) {
  if (tone === "compare") return palette.blue;
  if (tone === "return" || tone === "done") return palette.green;
  return palette.teal;
}

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function compactLabel(text = "", maxLength = 18) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "...";
}

function makeTextSprite(
  text = "",
  color = palette.text,
  scale = 1,
  options: { align?: CanvasTextAlign; background?: boolean; maxLength?: number } = {},
) {
  const label = compactLabel(text, options.maxLength ?? 18);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0, transparent: true }));

  const width = 720;
  const height = 220;
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);

  if (options.background !== false) {
    context.fillStyle = "rgba(2, 8, 7, 0.78)";
    context.strokeStyle = "rgba(18, 165, 135, 0.48)";
    context.lineWidth = 5;
    drawRoundRect(context, 22, 42, width - 44, height - 84, 34);
    context.fill();
    context.stroke();
  }

  context.fillStyle = color;
  context.font = "900 86px Inter, Arial, sans-serif";
  context.textAlign = options.align ?? "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.92)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  const x = options.align === "left" ? 70 : options.align === "right" ? width - 70 : width / 2;
  context.fillText(label || " ", x, height / 2 + 2, width - 110);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    depthTest: false,
    map: texture,
    transparent: true,
  }));
  sprite.scale.set(scale * 2.52, scale * 0.77, 1);
  sprite.renderOrder = 20;
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
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      metalness: 0.12,
      roughness: 0.64,
    }),
  );
}

function makeOutline(width: number, height: number, depth: number, color: number, opacity = 0.78) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    new THREE.LineBasicMaterial({ color, opacity, transparent: true }),
  );
}

function makeLine(from: THREE.Vector3, to: THREE.Vector3, color: number, opacity = 0.48) {
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([from, to]),
    new THREE.LineBasicMaterial({ color, opacity, transparent: true }),
  );
}

function makeCurve(points: THREE.Vector3[], color: number, opacity = 0.75) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(52)),
    new THREE.LineBasicMaterial({ color, opacity, transparent: true }),
  );
}

function makePulseDot(color: number, radius = 0.09) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 22, 22),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.95 }),
  );
}

function makeReelStage(group: THREE.Group, tone: TraceSceneTone) {
  const toneHex = toneColor(tone);
  const shell = makeBox(4.18, 6.72, 0.14, 0x050909, toneHex, 0.08);
  shell.position.set(0, 0.15, -1.12);
  group.add(shell);
  group.add(makeOutline(4.18, 6.72, 0.14, toneHex, 0.62));

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(1.62, 1.72, 96),
    new THREE.MeshBasicMaterial({ color: toneHex, opacity: 0.15, transparent: true }),
  );
  halo.position.set(0, 1.1, -0.98);
  group.add(halo);

  const floor = makeBox(4.5, 0.06, 3.5, 0x06100e, toneHex, 0.04);
  floor.position.set(0, -2.42, 0.28);
  floor.rotation.x = -0.1;
  group.add(floor);

  for (let index = 0; index < 8; index += 1) {
    const y = -2.08 + index * 0.34;
    const z = -0.95 + index * 0.35;
    group.add(makeLine(
      new THREE.Vector3(-1.9, y, z),
      new THREE.Vector3(1.9, y, z),
      index % 2 ? palette.blue : toneHex,
      0.16,
    ));
  }

  for (let index = 0; index < 5; index += 1) {
    const x = -1.75 + index * 0.875;
    group.add(makeLine(
      new THREE.Vector3(x, -2.46, -0.95),
      new THREE.Vector3(x * 0.32, -1.48, 1.65),
      palette.blue,
      0.11,
    ));
  }
}

function addAmbientBeat(group: THREE.Group, animations: Array<(progress: number) => void>, tone: number) {
  const curve = makeCurve([
    new THREE.Vector3(-1.62, 2.16, 0.2),
    new THREE.Vector3(-0.6, 2.55, 0.46),
    new THREE.Vector3(0.62, 2.08, 0.54),
    new THREE.Vector3(1.62, 2.36, 0.22),
  ], tone, 0.58);
  const dot = makePulseDot(tone, 0.075);
  group.add(curve, dot);
  animations.push((progress) => {
    const travel = easeInOut(progress);
    dot.position.x = lerp(-1.62, 1.62, travel);
    dot.position.y = 2.2 + Math.sin(progress * Math.PI * 2) * 0.18;
    dot.position.z = 0.6;
    dot.scale.setScalar(0.88 + Math.sin(progress * Math.PI * 2) * 0.2);
    curve.rotation.z = Math.sin(progress * Math.PI * 2) * 0.012;
  });
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
  if (typeof value !== "number") return 0.95;
  return Math.max(0.72, Math.min(2.0, 0.68 + Math.abs(value) * 0.11));
}

function blockBaseColor(isSettled: boolean, isSelected: boolean, tone: TraceSceneTone) {
  if (isSettled) return 0x173224;
  if (!isSelected) return 0x112522;
  if (tone === "compare") return 0x12313a;
  if (tone === "return" || tone === "done") return 0x173224;
  return 0x263112;
}

function buildArrayReel(group: THREE.Group, step: TraceStep, model: TraceSceneModel): SceneBuild {
  const values = arrayValues(step, model.action).slice(0, 12);
  const count = Math.max(values.length, 1);
  const spacing = Math.min(0.72, 3.55 / count);
  const firstX = -((count - 1) * spacing) / 2;
  const selected = new Set(model.indices);
  const animations: Array<(progress: number) => void> = [];
  const memory = step.memory.find((item) => item.type === "array");
  const settled = new Set(
    (memory?.highlights || [])
      .filter((highlight) => highlight.role === "target" || highlight.role === "visited")
      .map((highlight) => highlight.index),
  );
  const tone = toneColor(model.tone);

  const rail = makeBox(3.95, 0.08, 0.2, 0x07100e, tone, 0.05);
  rail.position.set(0, -1.25, 0.08);
  group.add(rail);

  if (model.action.type === "compare" && model.action.indices.length === 2) {
    const [leftIndex, rightIndex] = model.action.indices;
    const leftX = firstX + leftIndex * spacing;
    const rightX = firstX + rightIndex * spacing;
    const arc = makeCurve([
      new THREE.Vector3(leftX, 0.92, 0.34),
      new THREE.Vector3((leftX + rightX) / 2, 1.52, 0.7),
      new THREE.Vector3(rightX, 0.92, 0.34),
    ], palette.blue, 0.9);
    group.add(arc);
    const dot = makePulseDot(palette.blue, 0.07);
    group.add(dot);
    animations.push((progress) => {
      const travel = easeInOut(progress);
      dot.position.set(lerp(leftX, rightX, travel), 1.04 + Math.sin(travel * Math.PI) * 0.52, 0.74);
      dot.scale.setScalar(0.9 + Math.sin(progress * Math.PI * 2) * 0.2);
    });
  }

  if (model.action.type === "swap" && model.action.indices.length === 2) {
    const [leftIndex, rightIndex] = model.action.indices;
    const leftX = firstX + leftIndex * spacing;
    const rightX = firstX + rightIndex * spacing;
    group.add(makeCurve([
      new THREE.Vector3(leftX, 0.86, 0.36),
      new THREE.Vector3((leftX + rightX) / 2, 1.82, 0.78),
      new THREE.Vector3(rightX, 0.86, 0.36),
    ], palette.teal, 0.82));
    group.add(makeCurve([
      new THREE.Vector3(rightX, 0.2, 0.32),
      new THREE.Vector3((leftX + rightX) / 2, -0.48, 0.68),
      new THREE.Vector3(leftX, 0.2, 0.32),
    ], palette.blue, 0.72));
    const spark = makePulseDot(palette.teal, 0.11);
    spark.position.set((leftX + rightX) / 2, 0.8, 0.86);
    group.add(spark);
    animations.push((progress) => {
      spark.scale.setScalar(0.7 + Math.sin(progress * Math.PI) * 1.25);
    });
  }

  values.forEach((value, index) => {
    const height = numericHeight(value);
    const targetX = firstX + index * spacing;
    const isSelected = selected.has(index);
    const isSettled = settled.has(index);
    const color = blockBaseColor(isSettled, isSelected, model.tone);
    const outline = isSettled ? palette.green : isSelected ? tone : 0x355e59;
    const item = new THREE.Group();
    const body = makeBox(0.5, height, 0.52, color, outline, isSelected ? 0.2 : 0.04);
    const edge = makeOutline(0.5, height, 0.52, outline, isSelected ? 0.98 : 0.55);
    item.add(body, edge);

    const label = makeTextSprite(formatValue(value), palette.text, 0.5, { background: false, maxLength: 5 });
    label.position.set(0, 0.06, 0.36);
    item.add(label);

    const targetY = -1.22 + height / 2 + (isSelected ? 0.16 : 0);
    item.position.set(targetX, targetY, 0.04);
    group.add(item);

    if (model.action.type === "swap" && selected.has(index)) {
      const otherIndex = model.action.indices[0] === index ? model.action.indices[1] : model.action.indices[0];
      const direction = index === model.action.indices[0] ? 1 : -1;
      const startX = firstX + otherIndex * spacing;
      animations.push((progress) => {
        const travel = easeInOut(progress);
        item.position.x = lerp(startX, targetX, travel);
        item.position.y = targetY + Math.sin(travel * Math.PI) * (direction > 0 ? 0.72 : -0.46);
        item.position.z = 0.04 + Math.sin(travel * Math.PI) * 0.5;
        item.rotation.z = direction * Math.sin(travel * Math.PI) * 0.18;
      });
    } else if (isSelected) {
      animations.push((progress) => {
        const pulse = Math.sin(progress * Math.PI);
        item.position.y = targetY + pulse * 0.22;
        item.position.z = 0.04 + pulse * 0.18;
        item.scale.setScalar(1 + pulse * 0.08);
      });
    }
  });

  if (!values.length) {
    const empty = makeTextSprite("No array", palette.muted, 0.72);
    empty.position.set(0, 0, 0.2);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function recursionValue(node: VisualNode) {
  if (!node.value || node.value === "?") return "...";
  return node.value;
}

function makeFrameCard(label: string, value: string, color: number, active: boolean) {
  const group = new THREE.Group();
  const body = makeBox(2.02, 0.56, 0.24, active ? 0x12313a : 0x0a1715, color, active ? 0.2 : 0.04);
  group.add(body, makeOutline(2.02, 0.56, 0.24, color, active ? 0.95 : 0.5));
  const title = makeTextSprite(label, palette.text, 0.36, { background: false, maxLength: 10 });
  title.position.set(-0.38, 0.08, 0.18);
  group.add(title);
  const result = makeTextSprite(value, active ? "#78e2bf" : palette.muted, 0.32, { background: false, maxLength: 8 });
  result.position.set(0.56, -0.12, 0.18);
  group.add(result);
  return group;
}

function buildRecursionReel(group: THREE.Group, step: TraceStep, model: TraceSceneModel): SceneBuild {
  const nodes = (step.visual.nodes || []).slice(0, 7);
  const animations: Array<(progress: number) => void> = [];
  const tone = toneColor(model.tone);

  const spine = makeLine(new THREE.Vector3(-0.95, 2.05, -0.1), new THREE.Vector3(-0.95, -2.1, -0.1), palette.teal, 0.28);
  const returnRail = makeLine(new THREE.Vector3(1.35, -2.08, -0.1), new THREE.Vector3(1.35, 2.1, -0.1), palette.green, 0.36);
  group.add(spine, returnRail);

  nodes.forEach((node, index) => {
    const y = 1.74 - index * 0.68;
    const isActive = node.id === step.visual.activeNodeId;
    const isReturning = node.status === "returning" || (model.action.type === "return" && isActive);
    const done = node.status === "done" || isReturning;
    const card = makeFrameCard(node.label, recursionValue(node), done ? palette.green : isActive ? tone : palette.dim, isActive || isReturning);
    card.position.set(-0.65 + index * 0.12, y, 0.06 + index * 0.035);
    group.add(card);

    if (index > 0) {
      group.add(makeLine(
        new THREE.Vector3(-0.95 + (index - 1) * 0.12, y + 0.34, -0.06),
        new THREE.Vector3(-0.95 + index * 0.12, y + 0.51, -0.06),
        isActive ? palette.teal : palette.dim,
        0.38,
      ));
    }

    if (model.action.type === "call" && isActive) {
      animations.push((progress) => {
        const travel = easeOutCubic(progress);
        card.position.y = y + (1 - travel) * 0.58;
        card.position.z = 0.06 + index * 0.035 + Math.sin(travel * Math.PI) * 0.3;
        card.scale.setScalar(0.94 + travel * 0.06);
      });
    }

    if (isReturning && node.value && node.value !== "?") {
      const token = makeTextSprite(node.value, "#78e2bf", 0.54, { maxLength: 8 });
      token.position.set(-0.25 + index * 0.1, y, 0.58);
      group.add(token);
      animations.push((progress) => {
        const travel = easeInOut(progress);
        token.position.x = lerp(-0.25 + index * 0.1, 1.35, travel);
        token.position.y = lerp(y, 1.76 - Math.max(0, index - 1) * 0.58, travel) + Math.sin(travel * Math.PI) * 0.34;
        token.scale.setScalar(0.86 + Math.sin(travel * Math.PI) * 0.12);
      });
    }
  });

  if (!nodes.length) {
    const empty = makeTextSprite("No frames", palette.muted, 0.74);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildVariablesReel(group: THREE.Group, step: TraceStep, model: TraceSceneModel): SceneBuild {
  const changed = new Set(step.changed.variables || []);
  const entries = Object.entries(step.variables)
    .filter(([name]) => !name.startsWith("__"))
    .slice(0, 6);
  const animations: Array<(progress: number) => void> = [];
  const columns = entries.length > 3 ? 2 : 1;
  const tone = toneColor(model.tone);

  entries.forEach(([name, value], index) => {
    const column = columns === 1 ? 0 : index % 2;
    const row = columns === 1 ? index : Math.floor(index / 2);
    const active = changed.has(name) || (model.action.type === "assign" && model.action.target === name);
    const chip = new THREE.Group();
    const body = makeBox(1.58, 0.76, 0.32, active ? 0x12313a : 0x0a1715, active ? tone : palette.dim, active ? 0.22 : 0.04);
    chip.add(body, makeOutline(1.58, 0.76, 0.32, active ? tone : palette.dim, active ? 0.95 : 0.46));
    const nameLabel = makeTextSprite(name, active ? "#78e2bf" : palette.muted, 0.34, { background: false, maxLength: 9 });
    nameLabel.position.set(0, 0.18, 0.24);
    chip.add(nameLabel);
    const valueLabel = makeTextSprite(formatValue(value), palette.text, 0.42, { background: false, maxLength: 10 });
    valueLabel.position.set(0, -0.14, 0.24);
    chip.add(valueLabel);

    chip.position.set(columns === 1 ? 0 : column === 0 ? -0.95 : 0.95, 1.3 - row * 1.02, 0.08);
    group.add(chip);

    if (active) {
      animations.push((progress) => {
        const pulse = Math.sin(progress * Math.PI);
        chip.position.z = 0.08 + pulse * 0.36;
        chip.scale.setScalar(1 + pulse * 0.09);
      });
    }
  });

  if (!entries.length) {
    const empty = makeTextSprite("No values", palette.muted, 0.74);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildGraphReel(group: THREE.Group, step: TraceStep, model: TraceSceneModel): SceneBuild {
  const nodes = (step.visual.nodes || []).slice(0, 10);
  const positions = new Map<string, THREE.Vector3>();
  const animations: Array<(progress: number) => void> = [];

  nodes.forEach((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    positions.set(node.id, new THREE.Vector3(Math.cos(angle) * 1.45, Math.sin(angle) * 1.52 + 0.05, 0.08));
  });

  (step.visual.edges || []).forEach((edge) => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (from && to) group.add(makeLine(from, to, edge.status === "done" ? palette.green : palette.dim, 0.44));
  });

  nodes.forEach((node) => {
    const position = positions.get(node.id);
    if (!position) return;
    const active = model.action.type === "visit_node" && model.action.node === node.id;
    const done = node.status === "done";
    const color = active ? palette.teal : done ? palette.green : 0x0c1b19;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(active ? 0.28 : 0.24, 32, 32),
      new THREE.MeshStandardMaterial({ color, emissive: active ? palette.teal : 0x000000, emissiveIntensity: active ? 0.35 : 0 }),
    );
    sphere.position.copy(position);
    group.add(sphere);
    const label = makeTextSprite(node.label, palette.text, 0.32, { background: false, maxLength: 4 });
    label.position.copy(position).add(new THREE.Vector3(0, 0, 0.32));
    group.add(label);
    if (active) {
      animations.push((progress) => {
        const pulse = Math.sin(progress * Math.PI);
        sphere.scale.setScalar(1 + pulse * 0.24);
        sphere.position.z = position.z + pulse * 0.24;
      });
    }
  });

  if (!nodes.length) {
    const empty = makeTextSprite("No graph", palette.muted, 0.74);
    group.add(empty);
  }

  return {
    update(progress) {
      animations.forEach((animation) => animation(progress));
    },
  };
}

function buildOutputReel(group: THREE.Group, step: TraceStep): SceneBuild {
  const terminal = makeBox(3.36, 1.42, 0.28, 0x07100e, palette.green, 0.1);
  terminal.position.set(0, 0.2, 0.12);
  group.add(terminal, makeOutline(3.36, 1.42, 0.28, palette.green, 0.88));

  const output = makeTextSprite("> " + (step.output || "empty"), "#a9efbd", 0.58, { align: "left", maxLength: 16 });
  output.position.set(0, 0.22, 0.38);
  group.add(output);

  return {
    update(progress) {
      const pulse = Math.sin(progress * Math.PI);
      terminal.scale.set(1 + pulse * 0.04, 1 + pulse * 0.04, 1);
    },
  };
}

function buildScene(group: THREE.Group, step: TraceStep, model: TraceSceneModel) {
  clearGroup(group);
  makeReelStage(group, model.tone);
  const ambientAnimations: Array<(progress: number) => void> = [];
  addAmbientBeat(group, ambientAnimations, toneColor(model.tone));

  const scene = model.kind === "recursion"
    ? buildRecursionReel(group, step, model)
    : model.kind === "array"
      ? buildArrayReel(group, step, model)
      : model.kind === "graph"
        ? buildGraphReel(group, step, model)
        : model.kind === "output"
          ? buildOutputReel(group, step)
          : buildVariablesReel(group, step, model);

  return {
    update(progress: number) {
      ambientAnimations.forEach((animation) => animation(progress));
      scene.update(progress);
    },
  };
}

function traceActionLabel(action: TraceAction) {
  return action.type.replace(/_/g, " ");
}

type RuntimeFlowTone = "active" | "compare" | "return" | "done";

interface RuntimeFlowItem {
  label: string;
  tone: RuntimeFlowTone;
  value: string;
}

function writeBackLabel(model: TraceSceneModel) {
  const { action } = model;
  if (action.type === "swap") return "Array order updates";
  if (action.type === "compare") return action.result ? "Condition true" : "Condition false";
  if (action.type === "call") return "Frame pushed";
  if (action.type === "return") return "Value rises";
  if (action.type === "assign") return action.target + " updated";
  if (action.type === "output") return "Output printed";
  if (action.type === "read") return "Value read";
  if (action.type === "loop") return "Iterator moves";
  if (action.type === "visit_node") return "Node visited";
  return "State synced";
}

function runtimeFlowFor(step: TraceStep, model: TraceSceneModel): RuntimeFlowItem[] {
  return [
    { label: "1 Source", tone: "active", value: "Line " + String(step.line) },
    { label: "2 Meaning", tone: "compare", value: traceActionLabel(model.action) },
    { label: "3 Motion", tone: model.tone, value: model.kind },
    { label: "4 Result", tone: "return", value: writeBackLabel(model) },
  ];
}

function stateSummaryFor(step: TraceStep, model: TraceSceneModel) {
  const { action } = model;
  if (action.type === "swap") return action.target + " = " + formatValue(action.after);
  if (action.type === "compare") {
    return formatValue(action.values[0]) + " > " + formatValue(action.values[1])
      + (action.result === undefined ? "" : " is " + String(action.result));
  }
  if (action.type === "assign") return action.target + " = " + formatValue(action.value);
  if (action.type === "call") return action.name + "(" + Object.values(action.args).map(formatValue).join(", ") + ")";
  if (action.type === "return") return action.name + " returns " + formatValue(action.value);
  if (action.type === "output") return action.value || step.output || "empty output";
  if (action.type === "read") return action.target + "[" + String(action.index) + "] = " + formatValue(action.value);
  if (action.type === "loop") return action.iterator + " uses " + formatValue(action.value);
  if (action.type === "visit_node") return "visited " + action.node;

  const changedNames = step.changed.variables || [];
  const changed = changedNames
    .filter((name) => !name.startsWith("__") && Object.prototype.hasOwnProperty.call(step.variables, name))
    .slice(0, 3)
    .map((name) => name + " = " + formatValue(step.variables[name]));
  return changed.length ? changed.join(", ") : model.detail;
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
        preserveDrawingBuffer: true,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.deep);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, -1.72, 10.4);
    camera.lookAt(0, 0.12, 0);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.className = "ca-three-canvas";
    renderer.domElement.dataset.testid = "three-stage-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xf2fff9, 0x101716, 1.7));
    const key = new THREE.DirectionalLight(0x78e2bf, 2.45);
    key.position.set(2.4, -2.4, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fb2ff, 1.8);
    rim.position.set(-4.2, 2.4, 5.2);
    scene.add(rim);

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

    const render = () => {
      camera.lookAt(0, 0.08, 0);
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = Math.max(280, mount.clientWidth);
      const height = Math.max(300, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      state.update(state.progress);
      render();
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

    const renderFrame = () => {
      if (!reduceMotion) {
        state.camera.position.x = Math.sin(state.progress * Math.PI * 2) * 0.1;
        state.camera.position.y = -1.72 + Math.sin(state.progress * Math.PI) * 0.06;
      }
      state.camera.lookAt(0, 0.08, 0);
      state.renderer.render(state.scene, state.camera);
    };

    if (reduceMotion) {
      state.update(1);
      renderFrame();
      return;
    }

    const startedAt = performance.now();
    const duration = model.action.type === "swap" ? 2600 : model.action.type === "call" || model.action.type === "return" ? 2300 : 1900;
    const tick = (now: number) => {
      const linear = Math.min(1, (now - startedAt) / duration);
      state.progress = easeOutCubic(linear);
      state.update(state.progress);
      renderFrame();
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
  const runtimeFlow = runtimeFlowFor(step, model);
  const stateSummary = stateSummaryFor(step, model);

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

      <div className="ca-stage__action-row" aria-label="Trace action sequence">
        {step.actions.slice(0, 5).map((action, index) => (
          <span className={"ca-stage-action ca-stage-action--" + action.type} key={String(index) + action.type}>
            {traceActionLabel(action)}
          </span>
        ))}
      </div>

      <div className="ca-three-mount" ref={mountRef}>
        <div className={"ca-animation-banner ca-tone-" + model.tone} data-testid="animation-main-label">
          <span>{traceActionLabel(model.action)}</span>
          <strong>{model.headline}</strong>
          <p>{model.detail}</p>
        </div>
        <div className={"ca-canvas-readout ca-tone-" + model.tone} data-testid="canvas-readable-overlay" aria-label="Readable animation labels">
          <div className="ca-canvas-readout__card ca-canvas-readout__card--main">
            <span>Now animating</span>
            <strong>{model.headline}</strong>
            <p>{model.detail}</p>
          </div>
          <div className="ca-canvas-readout__card ca-canvas-readout__card--state">
            <span>State change</span>
            <strong>{stateSummary}</strong>
          </div>
        </div>
        <div className="ca-animation-labels" data-testid="animation-visible-labels" aria-label="Visible runtime labels">
          {runtimeFlow.map((item) => (
            <div className={"ca-animation-label ca-tone-" + item.tone} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
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
