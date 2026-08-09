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
  currentGroup: THREE.Group | null;
  dynamic: THREE.Group;
  frameId: number;
  progress: number;
  renderer: THREE.WebGLRenderer;
  retiringGroups: THREE.Group[];
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

function disposeGroup(parent: THREE.Group, group: THREE.Group) {
  parent.remove(group);
  disposeObject(group);
}

function setMaterialSceneOpacity(material: THREE.Material, sceneOpacity: number) {
  if (typeof material.userData.caBaseOpacity !== "number") {
    material.userData.caBaseOpacity = material.opacity;
    material.userData.caBaseTransparent = material.transparent;
  }
  const baseOpacity = material.userData.caBaseOpacity as number;
  const baseTransparent = Boolean(material.userData.caBaseTransparent);
  material.opacity = baseOpacity * sceneOpacity;
  material.transparent = baseTransparent || sceneOpacity < 0.999 || baseOpacity < 0.999;
  material.needsUpdate = true;
}

function setGroupTransition(
  group: THREE.Group,
  opacity: number,
  x = 0,
  y = 0,
  z = 0,
  scaleX = 1,
  scaleY = scaleX,
  scaleZ = scaleX,
  rotationX = 0,
  rotationY = 0,
) {
  const sceneOpacity = clamp01(opacity);
  group.userData.transitionOpacity = sceneOpacity;
  group.position.set(x, y, z);
  group.rotation.set(rotationX, rotationY, 0);
  group.scale.set(scaleX, scaleY, scaleZ);
  group.traverse((child) => {
    const renderable = child as THREE.Mesh;
    const material = renderable.material;
    if (Array.isArray(material)) material.forEach((item) => setMaterialSceneOpacity(item, sceneOpacity));
    else if (material) setMaterialSceneOpacity(material, sceneOpacity);
  });
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

function easeOutBack(value: number) {
  const c1 = 1.18;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

function phase(progress: number, start: number, end: number, easing: (value: number) => number = easeInOut) {
  return easing(segment(progress, start, end));
}

function pulseBetween(progress: number, start: number, end: number) {
  return Math.sin(phase(progress, start, end) * Math.PI);
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
  options: {
    align?: CanvasTextAlign;
    background?: boolean;
    maxLength?: number;
    widthMultiplier?: number;
    fontSize?: number;
    heightMultiplier?: number;
  } = {},
) {
  const label = compactLabel(text, options.maxLength ?? 18);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 0, transparent: true }));

  const fontSize = options.fontSize ?? 80;
  const pixelRatio = Math.min(4, Math.max(3, window.devicePixelRatio * 2));
  const fontWeight = 800;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.font = String(fontWeight) + " " + fontSize + "px Inter, Arial, sans-serif";
  const measuredWidth = Math.ceil(context.measureText(label || " ").width);
  const padX = options.background === false ? 34 : 64;
  const padY = options.background === false ? 24 : 42;
  const cssWidth = Math.max(128, Math.min(920, measuredWidth + padX * 2));
  const cssHeight = Math.max(98, fontSize + padY * 2);

  canvas.width = cssWidth * pixelRatio;
  canvas.height = cssHeight * pixelRatio;
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, cssWidth, cssHeight);

  if (options.background !== false) {
    context.fillStyle = "rgba(2, 8, 7, 0.78)";
    context.strokeStyle = "rgba(18, 165, 135, 0.48)";
    context.lineWidth = 5;
    drawRoundRect(context, 18, 18, cssWidth - 36, cssHeight - 36, 26);
    context.fill();
    context.stroke();
  }

  context.fillStyle = color;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.font = String(fontWeight) + " " + fontSize + "px Inter, Arial, sans-serif";
  context.textAlign = options.align ?? "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.64)";
  context.shadowBlur = 4;
  context.shadowOffsetY = 2;
  context.strokeStyle = "rgba(0, 0, 0, 0.78)";
  context.lineJoin = "round";
  context.lineWidth = Math.max(2.5, fontSize * 0.045);
  const x = options.align === "left" ? padX : options.align === "right" ? cssWidth - padX : cssWidth / 2;
  const y = cssHeight / 2 + 2;
  context.strokeText(label || " ", x, y);
  context.fillText(label || " ", x, y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    depthTest: false,
    map: texture,
    transparent: true,
  }));
  const worldHeight = scale * (options.heightMultiplier ?? 0.72);
  const naturalWidth = worldHeight * (cssWidth / cssHeight);
  const maxWidth = options.widthMultiplier ? scale * options.widthMultiplier : naturalWidth;
  sprite.scale.set(Math.min(naturalWidth, maxWidth), worldHeight, 1);
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
    const travel = phase(progress, 0.04, 0.92);
    dot.position.x = lerp(-1.62, 1.62, travel);
    dot.position.y = 2.2 + Math.sin(travel * Math.PI * 2) * 0.18;
    dot.position.z = 0.6;
    dot.scale.setScalar(0.82 + pulseBetween(progress, 0.04, 0.92) * 0.28);
    curve.rotation.z = Math.sin(travel * Math.PI * 2) * 0.012;
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
    const arcMaterial = arc.material as THREE.LineBasicMaterial;
    const dot = makePulseDot(palette.blue, 0.07);
    group.add(dot);
    animations.push((progress) => {
      const scan = phase(progress, 0.18, 0.68);
      const resolve = phase(progress, 0.68, 0.92, easeOutCubic);
      dot.position.set(lerp(leftX, rightX, scan), 1.04 + Math.sin(scan * Math.PI) * 0.52, 0.74 + resolve * 0.1);
      dot.scale.setScalar(0.62 + pulseBetween(progress, 0.1, 0.28) * 0.35 + pulseBetween(progress, 0.68, 0.94) * 0.55);
      arcMaterial.opacity = 0.28 + phase(progress, 0.06, 0.2, easeOutCubic) * 0.5 + resolve * 0.18;
    });
  }

  if (model.action.type === "swap" && model.action.indices.length === 2) {
    const [leftIndex, rightIndex] = model.action.indices;
    const leftX = firstX + leftIndex * spacing;
    const rightX = firstX + rightIndex * spacing;
    const topArc = makeCurve([
      new THREE.Vector3(leftX, 0.86, 0.36),
      new THREE.Vector3((leftX + rightX) / 2, 1.82, 0.78),
      new THREE.Vector3(rightX, 0.86, 0.36),
    ], palette.teal, 0.82);
    const lowArc = makeCurve([
      new THREE.Vector3(rightX, 0.2, 0.32),
      new THREE.Vector3((leftX + rightX) / 2, -0.48, 0.68),
      new THREE.Vector3(leftX, 0.2, 0.32),
    ], palette.blue, 0.72);
    group.add(topArc, lowArc);
    const topArcMaterial = topArc.material as THREE.LineBasicMaterial;
    const lowArcMaterial = lowArc.material as THREE.LineBasicMaterial;
    const spark = makePulseDot(palette.teal, 0.11);
    spark.position.set((leftX + rightX) / 2, 0.8, 0.86);
    group.add(spark);
    animations.push((progress) => {
      const prepare = phase(progress, 0.08, 0.22, easeOutCubic);
      const impact = pulseBetween(progress, 0.56, 0.86);
      topArcMaterial.opacity = 0.22 + prepare * 0.34 + impact * 0.28;
      lowArcMaterial.opacity = 0.18 + prepare * 0.26 + impact * 0.24;
      spark.visible = progress > 0.48;
      spark.scale.setScalar(0.42 + impact * 1.45);
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
        const lift = phase(progress, 0.08, 0.24, easeOutCubic);
        const travel = phase(progress, 0.24, 0.76);
        const settle = phase(progress, 0.76, 1, easeOutBack);
        const arc = Math.sin(travel * Math.PI);
        item.position.x = lerp(startX, targetX, travel);
        item.position.y = targetY + lift * 0.22 + arc * (direction > 0 ? 0.72 : -0.46) - settle * 0.04;
        item.position.z = 0.04 + lift * 0.16 + arc * 0.5;
        item.rotation.z = direction * arc * 0.18 * (1 - settle * 0.55);
        item.scale.setScalar(1 + lift * 0.04 + pulseBetween(progress, 0.74, 1) * 0.05);
      });
    } else if (isSelected) {
      animations.push((progress) => {
        const focus = phase(progress, 0.08, 0.34, easeOutCubic) * (1 - phase(progress, 0.72, 1, easeOutCubic));
        const resolve = pulseBetween(progress, 0.68, 0.98);
        item.position.y = targetY + focus * 0.24 + resolve * 0.05;
        item.position.z = 0.04 + focus * 0.18;
        item.scale.setScalar(1 + focus * 0.08 + resolve * 0.025);
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

function numberFromCallLabel(label: string) {
  const match = label.match(/\((-?\d+)\)/);
  return match ? Number(match[1]) : undefined;
}

function frameForNode(step: TraceStep, node: VisualNode) {
  const n = numberFromCallLabel(node.label);
  return step.stack.find((frame) => frame.name === node.label)
    ?? step.stack.find((frame) => typeof n === "number" && frame.locals.n === n);
}

function nTextForNode(step: TraceStep, node: VisualNode) {
  const frame = frameForNode(step, node);
  const n = frame?.locals.n ?? numberFromCallLabel(node.label);
  return typeof n === "number" ? "n = " + String(n) : "n = ?";
}

function shortCallName(label: string) {
  return label.replace(/^factorial\((-?\d+)\)$/, "f($1)");
}

function recursionStatusForNode(step: TraceStep, node: VisualNode, model: TraceSceneModel) {
  const frame = frameForNode(step, node);
  const n = frame?.locals.n ?? numberFromCallLabel(node.label);
  const isActive = node.id === step.visual.activeNodeId;

  if (node.value && node.value !== "?") return "return " + node.value;
  if (isActive && step.event === "condition_check" && typeof n === "number") {
    return n <= 1 ? "base case" : "needs n - 1";
  }
  if (isActive && model.action.type === "call") return "push frame";
  if (isActive && model.action.type === "return") return "returning";
  if (isActive) return "active";
  return "waiting";
}

function recursionFormulaFor(step: TraceStep, model: TraceSceneModel) {
  const n = step.variables.n;
  const returned = step.variables.__return__;

  if (step.event === "condition_check" && typeof n === "number") {
    return n <= 1 ? "n <= 1 -> return 1" : String(n) + " > 1 -> f(" + String(n - 1) + ")";
  }

  if (step.event === "recursion_call" && typeof n === "number") {
    return "f(" + String(n + 1) + ") waits for f(" + String(n) + ")";
  }

  if (model.action.type === "call") {
    return shortCallName(model.action.name) + " enters stack";
  }

  if (model.action.type === "return") {
    if (typeof n === "number" && n <= 1) return "base returns 1";
    if (typeof n === "number" && typeof returned === "number") {
      const childValue = returned / n;
      return String(n) + " x " + String(childValue) + " = " + String(returned);
    }
    return shortCallName(model.action.name) + " returns " + formatValue(model.action.value);
  }

  if (model.action.type === "output") return step.output || "final output";
  return step.description;
}

function makeFormulaCard(text: string, color: number) {
  const group = new THREE.Group();
  const body = makeBox(3.05, 0.46, 0.18, 0x06100e, color, 0.1);
  group.add(body, makeOutline(3.05, 0.46, 0.18, color, 0.78));
  const label = makeTextSprite(text, "#f5faf8", 0.32, { background: false, maxLength: 22, widthMultiplier: 7.2, fontSize: 72 });
  label.position.set(0, 0.02, 0.2);
  group.add(label);
  return group;
}

function makeFrameCard(
  callLabel: string,
  nLabel: string,
  status: string,
  color: number,
  active: boolean,
  done: boolean,
) {
  const group = new THREE.Group();
  const surface = done ? 0x10351f : active ? 0x103532 : 0x071715;
  const body = makeBox(2.9, 0.68, 0.26, surface, color, active ? 0.22 : done ? 0.14 : 0.035);
  group.add(body, makeOutline(2.9, 0.68, 0.26, color, active || done ? 0.9 : 0.42));

  const title = makeTextSprite(callLabel, palette.text, 0.34, { background: false, maxLength: 18, widthMultiplier: 4.2, fontSize: 72 });
  title.position.set(-0.58, 0.15, 0.23);
  group.add(title);

  const nValue = makeTextSprite(nLabel, active ? "#78e2bf" : palette.muted, 0.28, { background: false, maxLength: 8, widthMultiplier: 3.0, fontSize: 66 });
  nValue.position.set(0.93, 0.15, 0.23);
  group.add(nValue);

  const statusLabel = makeTextSprite(status, done ? "#78e2bf" : active ? "#ffffff" : palette.muted, 0.33, { background: false, maxLength: 16, widthMultiplier: 4.6, fontSize: 70 });
  statusLabel.position.set(0, -0.18, 0.23);
  group.add(statusLabel);
  return group;
}

function makeReturnBadge(text: string) {
  const group = new THREE.Group();
  const body = makeBox(0.92, 0.32, 0.14, 0x06100e, palette.green, 0.14);
  group.add(body, makeOutline(0.92, 0.32, 0.14, palette.green, 0.86));
  const label = makeTextSprite(text, "#78e2bf", 0.28, { background: false, maxLength: 10, widthMultiplier: 3.0, fontSize: 68 });
  label.position.set(0, 0.01, 0.14);
  group.add(label);
  return group;
}

function buildRecursionReel(group: THREE.Group, step: TraceStep, model: TraceSceneModel): SceneBuild {
  const nodes = (step.visual.nodes || []).slice(0, 7);
  const animations: Array<(progress: number) => void> = [];
  const tone = toneColor(model.tone);

  const formula = makeFormulaCard(recursionFormulaFor(step, model), tone);
  formula.position.set(0, 2.12, 0.12);
  group.add(formula);
  animations.push((progress) => {
    const enter = phase(progress, 0.04, 0.28, easeOutBack);
    const settle = pulseBetween(progress, 0.7, 1);
    formula.position.z = 0.12 + enter * 0.12;
    formula.scale.setScalar(0.96 + enter * 0.04 + settle * 0.015);
  });

  const spine = makeLine(new THREE.Vector3(-1.82, 1.5, -0.1), new THREE.Vector3(-1.82, -1.62, -0.1), palette.teal, 0.28);
  const returnRail = makeLine(new THREE.Vector3(1.86, -1.62, -0.1), new THREE.Vector3(1.86, 1.5, -0.1), palette.green, 0.36);
  group.add(spine, returnRail);

  const callTag = makeTextSprite("calls go down", palette.muted, 0.26, { background: false, maxLength: 14 });
  callTag.position.set(-1.78, 1.82, 0.18);
  group.add(callTag);
  const returnTag = makeTextSprite("returns go up", "#78e2bf", 0.26, { background: false, maxLength: 14 });
  returnTag.position.set(1.78, 1.82, 0.18);
  group.add(returnTag);

  nodes.forEach((node, index) => {
    const y = 1.16 - index * 0.7;
    const isActive = node.id === step.visual.activeNodeId;
    const isReturning = node.status === "returning" || (model.action.type === "return" && isActive);
    const done = node.status === "done" || isReturning || Boolean(node.value && node.value !== "?");
    const card = makeFrameCard(
      node.label,
      nTextForNode(step, node),
      recursionStatusForNode(step, node, model),
      done ? palette.green : isActive ? tone : palette.dim,
      isActive || isReturning,
      done,
    );
    card.position.set(0, y, 0.06 + index * 0.035);
    group.add(card);

    if (index > 0) {
      group.add(makeLine(
        new THREE.Vector3(-1.82, y + 0.43, -0.06),
        new THREE.Vector3(-1.82, y + 0.64, -0.06),
        isActive ? palette.teal : palette.dim,
        0.38,
      ));
    }

    if (model.action.type === "call" && isActive) {
      animations.push((progress) => {
        const prepare = phase(progress, 0.08, 0.2, easeOutCubic);
        const travel = phase(progress, 0.2, 0.72, easeOutCubic);
        const settle = pulseBetween(progress, 0.72, 1);
        card.position.y = y + (1 - travel) * 0.58 + settle * 0.035;
        card.position.z = 0.06 + index * 0.035 + prepare * 0.12 + Math.sin(travel * Math.PI) * 0.3;
        card.scale.setScalar(0.94 + travel * 0.06 + settle * 0.025);
      });
    }

    if (isReturning && node.value && node.value !== "?") {
      const token = makeReturnBadge("return " + node.value);
      token.position.set(2.08, y, 0.56);
      group.add(token);
      animations.push((progress) => {
        const launch = phase(progress, 0.1, 0.26, easeOutCubic);
        const travel = phase(progress, 0.26, 0.82);
        const land = pulseBetween(progress, 0.82, 1);
        token.position.x = lerp(2.08, 2.22, travel);
        token.position.y = lerp(y, 1.22 - Math.max(0, index - 1) * 0.66, travel) + Math.sin(travel * Math.PI) * 0.28 + launch * 0.06;
        token.position.z = 0.58 + launch * 0.18 + Math.sin(travel * Math.PI) * 0.18;
        token.scale.setScalar(0.94 + launch * 0.04 + Math.sin(travel * Math.PI) * 0.06 + land * 0.025);
      });
    }
  });

  if (!nodes.length) {
    const empty = makeTextSprite("No call stack", palette.muted, 0.74, { maxLength: 18 });
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
        const write = phase(progress, 0.16, 0.62, easeOutBack);
        const settle = pulseBetween(progress, 0.62, 1);
        chip.position.z = 0.08 + write * 0.28 + settle * 0.08;
        chip.position.y = 1.3 - row * 1.02 + settle * 0.035;
        chip.scale.setScalar(1 + write * 0.075 + settle * 0.025);
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
        const visit = phase(progress, 0.12, 0.6, easeOutBack);
        const settle = pulseBetween(progress, 0.6, 1);
        sphere.scale.setScalar(1 + visit * 0.18 + settle * 0.08);
        sphere.position.z = position.z + visit * 0.2 + settle * 0.08;
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
      const open = phase(progress, 0.08, 0.46, easeOutBack);
      const settle = pulseBetween(progress, 0.5, 1);
      terminal.position.z = 0.12 + open * 0.08;
      terminal.scale.set(0.96 + open * 0.04 + settle * 0.02, 0.96 + open * 0.04 + settle * 0.02, 1);
      output.position.z = 0.34 + open * 0.1;
      output.scale.setScalar(0.96 + open * 0.04);
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
      currentGroup: null,
      dynamic,
      frameId: 0,
      progress: 1,
      renderer,
      retiringGroups: [],
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
      state.currentGroup = null;
      state.retiringGroups = [];
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
    state.retiringGroups.forEach((group) => disposeGroup(state.dynamic, group));
    state.retiringGroups = [];

    const outgoing = state.currentGroup;
    const incoming = new THREE.Group();
    incoming.name = "trace-step-" + step.id;
    state.dynamic.add(incoming);
    state.currentGroup = incoming;

    const built = buildScene(incoming, step, model);
    state.update = built.update;
    state.progress = reduceMotion ? 1 : 0;
    if (outgoing) state.retiringGroups = [outgoing];

    const renderFrame = (now = performance.now()) => {
      if (!reduceMotion) {
        const clock = now * 0.001;
        state.camera.position.x = Math.sin(clock * 0.58) * 0.08;
        state.camera.position.y = -1.72 + Math.sin(clock * 0.43) * 0.045;
      }
      state.camera.lookAt(0, 0.08, 0);
      state.renderer.render(state.scene, state.camera);
    };

    if (reduceMotion) {
      if (outgoing) disposeGroup(state.dynamic, outgoing);
      state.retiringGroups = [];
      state.renderer.domElement.dataset.sceneHandoff = "idle";
      setGroupTransition(incoming, 1);
      state.update(1);
      renderFrame();
      return;
    }

    if (outgoing) disposeGroup(state.dynamic, outgoing);
    state.retiringGroups = [];
    state.renderer.domElement.dataset.sceneHandoff = outgoing ? "settling" : "entering";
    setGroupTransition(incoming, 1, 0.04, -0.06, 0.14, 0.985);
    state.update(0);
    renderFrame();

    const startedAt = performance.now();
    const duration = model.action.type === "swap"
      ? 2850
      : model.action.type === "call" || model.action.type === "return"
        ? 2500
        : 2200;
    const tick = (now: number) => {
      const linear = Math.min(1, (now - startedAt) / duration);
      const settleIn = easeOutCubic(segment(linear, 0, 0.22));
      const settlePulse = pulseBetween(linear, 0.22, 0.52);
      state.progress = easeOutCubic(linear);
      state.update(state.progress);
      state.renderer.domElement.dataset.sceneHandoff = settleIn < 1 ? "settling" : "idle";

      setGroupTransition(
        incoming,
        1,
        lerp(0.04, 0, settleIn),
        lerp(-0.06, 0, settleIn) + settlePulse * 0.006,
        lerp(0.14, 0, settleIn),
        lerp(0.985, 1, settleIn) + settlePulse * 0.003,
      );

      renderFrame(now);
      if (linear < 1) {
        state.frameId = requestAnimationFrame(tick);
        return;
      }
      state.retiringGroups = [];
      state.renderer.domElement.dataset.sceneHandoff = "idle";
      setGroupTransition(incoming, 1);
      state.update(1);
      renderFrame(now);
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

      <div className={"ca-stage__explanation ca-tone-" + model.tone} key={"stage-explanation-" + step.id} aria-live="polite">
        <span>Line {step.line}</span>
        <strong>{model.headline}</strong>
        <p>{model.detail}</p>
      </div>

      <div className="ca-stage__action-row" aria-label="Trace action sequence">
        {step.actions.slice(0, 5).map((action, index) => (
          <span className={"ca-stage-action ca-stage-action--" + action.type} key={step.id + String(index) + action.type}>
            {traceActionLabel(action)}
          </span>
        ))}
      </div>

      <div className={"ca-three-mount ca-three-mount--" + model.kind} ref={mountRef}>
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
            <div className={"ca-animation-label ca-tone-" + item.tone} key={step.id + item.label}>
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
