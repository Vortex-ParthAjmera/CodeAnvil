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

function drawCanvasRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
}

function compactLabel(text = "", maxLength = 24) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "...";
}

function makeTextSprite(
  text = "",
  color = palette.text,
  scale = 1,
  align: CanvasTextAlign = "center",
) {
  const label = compactLabel(text, scale > 0.62 ? 28 : 18);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0 }));
  }

  const width = 960;
  const height = 256;
  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(4, 9, 9, 0.72)";
  context.strokeStyle = "rgba(18, 165, 135, 0.52)";
  context.lineWidth = 4;
  context.beginPath();
  drawCanvasRoundRect(context, 18, 42, width - 36, height - 84, 28);
  context.fill();
  context.stroke();

  context.fillStyle = color;
  context.font = "900 88px Inter, Arial, sans-serif";
  context.textAlign = align;
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.92)";
  context.shadowBlur = 10;
  context.shadowOffsetY = 5;

  const x = align === "left" ? 68 : align === "right" ? width - 68 : width / 2;
  context.fillText(label || " ", x, height / 2 + 3, width - 120);

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
  sprite.scale.set(scale * 2.95, scale * 0.78, 1);
  sprite.renderOrder = 12;
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

function makeCurve(points: THREE.Vector3[], color: number, opacity = 0.72) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(36));
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function makeForgeBackdrop(group: THREE.Group, tone: TraceSceneTone) {
  const toneHex = toneColor(tone);
  const wall = makeBox(10.8, 6.6, 0.12, 0x080b0c, toneHex, 0.025);
  wall.position.set(0, 0.22, -1.3);
  group.add(wall);

  for (let index = 0; index < 9; index += 1) {
    const x = -4.8 + index * 1.2;
    const strut = makeBox(0.035, 6.1, 0.05, 0x162023, toneHex, index % 3 === 0 ? 0.035 : 0.01);
    strut.position.set(x, 0.16, -1.2);
    group.add(strut);
  }

  const bench = makeBox(8.7, 0.44, 0.72, 0x161b1c, palette.active, 0.08);
  bench.position.set(0, -2.42, -0.42);
  group.add(bench);
  group.add(makeLine(
    new THREE.Vector3(-4.2, -2.16, -0.18),
    new THREE.Vector3(4.2, -2.16, -0.18),
    palette.active,
    0.34,
  ));

  const anvilTop = makeBox(4.6, 0.28, 0.82, 0x25292a, toneHex, 0.08);
  anvilTop.position.set(0, -2.02, -0.24);
  group.add(anvilTop);
  const anvilFoot = makeBox(2.55, 0.54, 0.68, 0x111719, palette.active, 0.06);
  anvilFoot.position.set(0, -2.78, -0.28);
  group.add(anvilFoot);

  const leftRail = makeLine(
    new THREE.Vector3(-4.1, -1.55, -0.22),
    new THREE.Vector3(4.1, -1.55, -0.22),
    palette.compare,
    0.18,
  );
  const rightRail = makeLine(
    new THREE.Vector3(-4.1, -1.82, -0.2),
    new THREE.Vector3(4.1, -1.82, -0.2),
    palette.active,
    0.2,
  );
  group.add(leftRail, rightRail);
}

function makeActionBadge(group: THREE.Group, step: TraceStep, model: TraceSceneModel) {
  const tone = toneColor(model.tone);
  const title = model.action.type.replace(/_/g, " ").toUpperCase();
  const badge = makePlate(title, "line " + String(step.line), tone, true);
  badge.scale.set(0.7, 0.7, 0.7);
  badge.position.set(-3.55, 3.18, 0.12);
  group.add(badge);
}

function addSparkBurst(
  group: THREE.Group,
  animations: Array<(progress: number) => void>,
  origin: THREE.Vector3,
  color: number,
) {
  for (let index = 0; index < 9; index += 1) {
    const angle = -Math.PI * 0.88 + index * 0.22;
    const distance = 0.34 + (index % 3) * 0.16;
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.9,
      opacity: 0.85,
      transparent: true,
    });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), material);
    spark.position.copy(origin);
    group.add(spark);
    animations.push((progress) => {
      spark.position.x = origin.x + Math.cos(angle) * distance * progress;
      spark.position.y = origin.y + Math.sin(angle) * distance * progress + progress * 0.2;
      material.opacity = 0.85 * (1 - progress);
      spark.scale.setScalar(1 - progress * 0.45);
    });
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

function actionUnitLabel(action: TraceAction) {
  if (action.type === "compare") return "COMPARATOR";
  if (action.type === "swap" || action.type === "assign") return "WRITE UNIT";
  if (action.type === "call" || action.type === "return") return "CALL STACK";
  if (action.type === "output") return "OUTPUT PORT";
  if (action.type === "visit_node") return "GRAPH UNIT";
  return "EXECUTE";
}

function makeProcessorBlock(label: string, detail: string, x: number, tone: number) {
  const group = new THREE.Group();
  const body = makeBox(1.72, 0.68, 0.72, 0x0f1719, tone, 0.08);
  group.add(body);
  group.add(makeOutline(1.72, 0.68, 0.72, tone));
  const labelText = makeTextSprite(label, "#f1f2ed", 0.36);
  labelText.position.set(0, 0.11, 0.42);
  group.add(labelText);
  const detailText = makeTextSprite(detail, "#9aa39f", 0.27);
  detailText.position.set(0, -0.17, 0.42);
  group.add(detailText);
  group.position.set(x, 2.62, -0.08);
  return group;
}

function makePulseDot(color: number) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 18, 18),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85 }),
  );
}

function addRuntimePipeline(
  group: THREE.Group,
  step: TraceStep,
  model: TraceSceneModel,
  animations: Array<(progress: number) => void>,
) {
  const tone = toneColor(model.tone);
  const fetchBlock = makeProcessorBlock("FETCH", "source line " + String(step.line), -3.45, palette.active);
  const decodeBlock = makeProcessorBlock("DECODE", model.action.type.replace(/_/g, " "), -1.16, palette.compare);
  const executeBlock = makeProcessorBlock(actionUnitLabel(model.action), model.kind, 1.16, tone);
  const writeBlock = makeProcessorBlock("WRITEBACK", model.action.type === "return" ? "return value" : "state update", 3.45, palette.return);
  group.add(fetchBlock, decodeBlock, executeBlock, writeBlock);

  const pipelineY = 2.62;
  group.add(makeLine(new THREE.Vector3(-2.55, pipelineY, 0.18), new THREE.Vector3(-2.06, pipelineY, 0.18), palette.active, 0.42));
  group.add(makeLine(new THREE.Vector3(-0.3, pipelineY, 0.18), new THREE.Vector3(0.28, pipelineY, 0.18), palette.compare, 0.42));
  group.add(makeLine(new THREE.Vector3(2.05, pipelineY, 0.18), new THREE.Vector3(2.55, pipelineY, 0.18), palette.return, 0.42));
  group.add(makeLine(new THREE.Vector3(3.45, 2.22, 0.12), new THREE.Vector3(3.45, -1.55, 0.12), palette.return, 0.22));

  const sourceToken = makePlate("SOURCE", "line " + String(step.line), palette.active, true);
  sourceToken.scale.set(0.48, 0.48, 0.48);
  sourceToken.position.set(-4.35, 3.36, 0.2);
  group.add(sourceToken);

  const opcode = makePlate(model.action.type.toUpperCase().replace(/_/g, " "), actionUnitLabel(model.action), tone, true);
  opcode.scale.set(0.52, 0.52, 0.52);
  opcode.position.set(-1.16, 2.62, 0.6);
  group.add(opcode);

  const pulse = makePulseDot(tone);
  pulse.position.set(-3.45, 2.62, 0.72);
  group.add(pulse);

  animations.push((progress) => {
    const fetch = segment(progress, 0, 0.3);
    const decode = segment(progress, 0.28, 0.58);
    const execute = segment(progress, 0.54, 0.82);
    const write = segment(progress, 0.78, 1);

    sourceToken.position.x = lerp(-4.35, -3.45, fetch);
    sourceToken.position.y = lerp(3.36, 2.62, fetch);
    sourceToken.rotation.y = -0.15 + fetch * 0.15;
    sourceToken.scale.setScalar(0.45 + Math.sin(fetch * Math.PI) * 0.08);

    opcode.position.x = lerp(-1.16, 1.16, execute);
    opcode.position.z = 0.6 + Math.sin(execute * Math.PI) * 0.34;
    opcode.scale.setScalar(0.46 + Math.sin(decode * Math.PI) * 0.12);

    const busProgress = progress < 0.34 ? fetch : progress < 0.68 ? decode : write;
    pulse.position.x = progress < 0.34
      ? lerp(-3.45, -1.16, busProgress)
      : progress < 0.68
        ? lerp(-1.16, 1.16, busProgress)
        : lerp(1.16, 3.45, busProgress);
    pulse.position.y = pipelineY;
    pulse.scale.setScalar(0.75 + Math.sin(progress * Math.PI * 4) * 0.25);

    fetchBlock.scale.setScalar(1 + Math.sin(fetch * Math.PI) * 0.08);
    decodeBlock.scale.setScalar(1 + Math.sin(decode * Math.PI) * 0.08);
    executeBlock.scale.setScalar(1 + Math.sin(execute * Math.PI) * 0.1);
    writeBlock.scale.setScalar(1 + Math.sin(write * Math.PI) * 0.08);
  });
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

  const arrayLabel = makeTextSprite(memory?.label || "array", palette.muted, 0.46, "left");
  arrayLabel.position.set(firstX - 0.28, 2.5, 0.08);
  group.add(arrayLabel);

  if (model.action.type === "compare" && model.action.indices.length === 2) {
    const [leftIndex, rightIndex] = model.action.indices;
    const leftX = firstX + leftIndex * spacing;
    const rightX = firstX + rightIndex * spacing;
    group.add(makeCurve([
      new THREE.Vector3(leftX, 1.58, 0.18),
      new THREE.Vector3((leftX + rightX) / 2, 2.04, 0.18),
      new THREE.Vector3(rightX, 1.58, 0.18),
    ], palette.compare, 0.86));
  }

  if (model.action.type === "swap" && model.action.indices.length === 2) {
    const [leftIndex, rightIndex] = model.action.indices;
    const leftX = firstX + leftIndex * spacing;
    const rightX = firstX + rightIndex * spacing;
    group.add(makeCurve([
      new THREE.Vector3(leftX, 1.64, 0.16),
      new THREE.Vector3((leftX + rightX) / 2, 2.22, 0.16),
      new THREE.Vector3(rightX, 1.64, 0.16),
    ], palette.active, 0.78));
    group.add(makeCurve([
      new THREE.Vector3(rightX, 0.92, 0.14),
      new THREE.Vector3((leftX + rightX) / 2, 0.34, 0.14),
      new THREE.Vector3(leftX, 0.92, 0.14),
    ], palette.compare, 0.72));
    addSparkBurst(group, animations, new THREE.Vector3((leftX + rightX) / 2, 1.2, 0.34), palette.active);
  }

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

    const valueLabel = makeTextSprite(formatValue(value), palette.text, 0.72);
    valueLabel.position.set(0, 0.04, 0.34);
    item.add(valueLabel);

    const indexLabel = makeTextSprite("[" + String(index) + "]", isSelected ? "#f7cf83" : palette.muted, 0.4);
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
    const verdict = model.action.result === undefined
      ? "evaluate condition"
      : model.action.result
        ? "true -> swap next"
        : "false -> keep order";
    const predicate = makePlate(
      formatValue(model.action.values[0]) + " > " + formatValue(model.action.values[1]),
      verdict,
      palette.compare,
      true,
    );
    predicate.position.set(0.86, 2.78, 0.16);
    predicate.scale.set(0.82, 0.82, 0.82);
    group.add(predicate);
  }

  if (model.action.type === "swap") {
    const swapNote = makePlate("write swapped array", formatValue(model.action.after), palette.active, true);
    swapNote.position.set(1.08, 2.78, 0.16);
    swapNote.scale.set(0.82, 0.82, 0.82);
    group.add(swapNote);
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
  makeForgeBackdrop(group, model.tone);
  makeActionBadge(group, step, model);
  const runtimeAnimations: Array<(progress: number) => void> = [];
  addRuntimePipeline(group, step, model, runtimeAnimations);
  const scene = model.kind === "recursion"
    ? buildRecursionScene(group, step, model)
    : model.kind === "array"
      ? buildArrayScene(group, step, model)
      : model.kind === "graph"
        ? buildGraphScene(group, step, model)
        : model.kind === "output"
          ? buildOutputScene(group, step)
          : buildVariablesScene(group, step, model);

  return {
    update(progress: number) {
      runtimeAnimations.forEach((animation) => animation(progress));
      scene.update(progress);
    },
  };
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
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
  if (action.type === "swap") return "Array order is rewritten";
  if (action.type === "compare") return action.result ? "Condition is true" : "Condition is false";
  if (action.type === "call") return "Frame is pushed";
  if (action.type === "return") return "Value returns upward";
  if (action.type === "assign") return action.target + " is updated";
  if (action.type === "output") return "Output is printed";
  if (action.type === "read") return "Value enters the step";
  if (action.type === "loop") return "Iterator advances";
  if (action.type === "visit_node") return "Node is marked visited";
  return "State is kept in sync";
}

function runtimeFlowFor(step: TraceStep, model: TraceSceneModel): RuntimeFlowItem[] {
  return [
    { label: "1 Fetch", tone: "active", value: "Line " + String(step.line) },
    { label: "2 Decode", tone: "compare", value: traceActionLabel(model.action) },
    { label: "3 Execute", tone: model.tone, value: actionUnitLabel(model.action).toLowerCase() },
    { label: "4 Write", tone: "return", value: writeBackLabel(model) },
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
    scene.background = new THREE.Color(0x070909);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, -2.7, 10.6);
    camera.lookAt(0, 0.15, 0);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.domElement.className = "ca-three-canvas";
    renderer.domElement.dataset.testid = "three-stage-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe9f1ed, 0x111515, 1.7));
    const key = new THREE.DirectionalLight(0xffd58c, 2.7);
    key.position.set(2.5, -2.2, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4ad4ef, 1.4);
    rim.position.set(-4, 2, 5);
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

    const resize = () => {
      const width = Math.max(280, mount.clientWidth);
      const height = Math.max(260, mount.clientHeight);
      camera.aspect = width / height;
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
    const duration = model.action.type === "swap" ? 2200 : model.action.type === "call" || model.action.type === "return" ? 1900 : 1650;
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
