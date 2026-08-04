import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { TraceStep } from "../types";
import { formatValue } from "../utils/formatValue";

interface ThreeExecutionStageProps {
  reduceMotion: boolean;
  step: TraceStep;
}

interface StageState {
  camera: THREE.PerspectiveCamera;
  dynamic: THREE.Group;
  frameId: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else if (material) material.dispose();
  });
}

function makeTextSprite(text: string, color = "#edf3f0", scale = 1) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = 512;
  canvas.height = 128;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "600 34px ui-monospace, SFMono-Regular, Consolas, monospace";
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text.slice(0, 28), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6 * scale, 0.65 * scale, 1);
  return sprite;
}

function makePlate(label: string, detail: string, color: string, active: boolean) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(3.2, 0.26, 1.52);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: active ? color : "#000000",
    emissiveIntensity: active ? 0.42 : 0.08,
    metalness: 0.22,
    opacity: 0.82,
    roughness: 0.38,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: active ? "#f3a51d" : "#2fd6b5", transparent: true, opacity: 0.78 }),
  );
  group.add(edge);

  const labelSprite = makeTextSprite(label, active ? "#ffe0a3" : "#d7f7ee", 0.72);
  labelSprite.position.set(0, 0.23, 0.16);
  group.add(labelSprite);

  const detailSprite = makeTextSprite(detail, "#9aa6a7", 0.55);
  detailSprite.position.set(0, 0.2, -0.36);
  group.add(detailSprite);

  return group;
}

function makeVariableBlock(name: string, value: string, index: number, changed: boolean) {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1.45, 0.5, 0.9);
  const material = new THREE.MeshStandardMaterial({
    color: changed ? "#f3a51d" : "#172328",
    emissive: changed ? "#f3a51d" : "#2fd6b5",
    emissiveIntensity: changed ? 0.24 : 0.08,
    metalness: 0.18,
    roughness: 0.48,
  });
  group.add(new THREE.Mesh(geometry, material));
  const text = makeTextSprite(`${name} = ${value}`, changed ? "#211400" : "#edf3f0", 0.55);
  text.position.y = 0.34;
  group.add(text);
  group.position.set(3.7, 1.1 - index * 0.78, 0);
  return group;
}

function buildStage(dynamic: THREE.Group, step: TraceStep) {
  while (dynamic.children.length) {
    const child = dynamic.children.pop()!;
    disposeObject(child);
  }

  const changed = new Set(step.changed.variables ?? []);
  const stack = step.stack.length ? step.stack : [{ id: "global", name: "global", line: step.line, locals: step.variables }];
  const frames = stack.slice(-6);

  frames.forEach((frame, index) => {
    const topFirst = frames.length - 1 - index;
    const localPreview = Object.entries(frame.locals)
      .slice(0, 2)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join("  ");
    const plate = makePlate(
      frame.name,
      localPreview || `line ${frame.line}`,
      index === frames.length - 1 ? "#704713" : "#11302e",
      index === frames.length - 1,
    );
    plate.position.set(-0.7, -1.2 + topFirst * 0.62, 0);
    plate.rotation.x = -0.12;
    plate.userData.targetY = plate.position.y;
    plate.position.y += 0.42;
    dynamic.add(plate);
  });

  Object.entries(step.variables)
    .slice(0, 5)
    .forEach(([name, value], index) => {
      dynamic.add(makeVariableBlock(name, formatValue(value), index, changed.has(name)));
    });

  const memory = step.memory[0];
  if (memory && Array.isArray(memory.value)) {
    memory.value.slice(0, 10).forEach((value, index) => {
      const highlight = memory.highlights?.find((item) => item.index === index);
      const block = makeVariableBlock(String(index), String(value), index, Boolean(highlight));
      block.scale.set(0.58, 0.58, 0.58);
      block.position.set(-3.5 + index * 0.62, -2.15, 0.16);
      dynamic.add(block);
    });
  }

  const activeLine = makeTextSprite(`line : `, "#f3a51d", 0.72);
  activeLine.position.set(0.2, 2.35, 0);
  dynamic.add(activeLine);

  const cursor = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.035, 12, 42),
    new THREE.MeshStandardMaterial({ color: "#f3a51d", emissive: "#f3a51d", emissiveIntensity: 0.78 }),
  );
  cursor.position.set(-3.9 + (step.index % 7) * 1.12, 1.86, 0.24);
  cursor.rotation.x = 0.9;
  cursor.userData.pulse = true;
  dynamic.add(cursor);
}

export function ThreeExecutionStage({ reduceMotion, step }: ThreeExecutionStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<StageState | null>(null);
  const stepKey = useMemo(() => `${step.id}-${step.index}`, [step.id, step.index]);
  const changedVariables = Object.entries(step.variables)
    .filter(([name]) => step.changed.variables?.includes(name))
    .slice(0, 3);
  const visibleVariables = changedVariables.length ? changedVariables : Object.entries(step.variables).slice(0, 3);
  const activeFrame = step.stack.length ? step.stack[step.stack.length - 1].name : "global";
  const memoryFocus = step.memory[0]?.highlights
    ?.map((item) => `${step.memory[0].label}[${item.index}]`)
    .join(", ");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#070b0d");
    scene.fog = new THREE.Fog("#070b0d", 5, 14);

    const camera = new THREE.PerspectiveCamera(44, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 1.15, 7.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.domElement.className = "ca-three-canvas";
    renderer.domElement.dataset.testid = "three-stage-canvas";
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#ffffff", 0.45);
    scene.add(ambient);
    const key = new THREE.PointLight("#f3a51d", 5.5, 16);
    key.position.set(0.5, 3.2, 3.5);
    scene.add(key);
    const teal = new THREE.PointLight("#2fd6b5", 2.4, 12);
    teal.position.set(-4, 0.5, 2.3);
    scene.add(teal);

    const grid = new THREE.GridHelper(12, 24, "#253238", "#11191d");
    grid.position.y = -2.55;
    scene.add(grid);

    const dynamic = new THREE.Group();
    scene.add(dynamic);

    const state: StageState = { camera, dynamic, frameId: 0, renderer, scene };
    stateRef.current = state;

    let resizeFrame = 0;
    let lastWidth = 0;
    let lastHeight = 0;
    const resize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const width = Math.max(320, Math.floor(mount.clientWidth));
        const height = Math.max(260, Math.floor(mount.clientHeight));
        if (width === lastWidth && height === lastHeight) return;
        lastWidth = width;
        lastHeight = height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    window.addEventListener("resize", resize);

    const animate = () => {
      const elapsed = performance.now() / 1000;
      if (!reduceMotion) {
        dynamic.rotation.y = Math.sin(elapsed * 0.34) * 0.07;
        dynamic.rotation.x = Math.sin(elapsed * 0.22) * 0.025;
      }
      dynamic.children.forEach((child) => {
        if (typeof child.userData.targetY === "number") {
          child.position.y += (child.userData.targetY - child.position.y) * (reduceMotion ? 1 : 0.08);
        }
        if (child.userData.pulse && !reduceMotion) {
          const pulse = 1 + Math.sin(elapsed * 4.2) * 0.12;
          child.scale.set(pulse, pulse, pulse);
          child.rotation.z += 0.035;
        }
      });
      renderer.render(scene, camera);
      state.frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(state.frameId);
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      disposeObject(dynamic);
      renderer.dispose();
      renderer.domElement.remove();
      stateRef.current = null;
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (stateRef.current) {
      buildStage(stateRef.current.dynamic, step);
    }
  }, [step, stepKey]);

  return (
    <section className="ca-stage" aria-label="Three.js execution stage">
      <div className="ca-stage__topline">
        <span>
          Step {step.index + 1} | Executing line {step.line}
        </span>
        <strong>{step.event.replace("_", " ")}</strong>
      </div>
      <div className="ca-stage__readout" aria-live="polite" key={step.id}>
        <div>
          <span>Instruction</span>
          <strong>{step.description}</strong>
        </div>
        <div>
          <span>Active frame</span>
          <strong>{activeFrame}</strong>
        </div>
        <div>
          <span>{changedVariables.length ? "Changed" : "Variables"}</span>
          <strong>{visibleVariables.length ? visibleVariables.map(([name, value]) => `${name}=${formatValue(value)}`).join("  ") : "none"}</strong>
        </div>
        <div>
          <span>Memory focus</span>
          <strong>{memoryFocus || "none"}</strong>
        </div>
      </div>
      <div className="ca-three-mount" ref={mountRef} />
    </section>
  );
}
