import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useTheme3D } from "../../lib/theme3d";

/**
 * CodeGalaxy3D — a universal 3D renderer for ANY pasted code, no pattern
 * matching required. Every line becomes a glowing arc of token-blocks laid
 * out on a spiral; the executing line brightens with a pulsing ring.
 *
 * Tokens are drawn with one InstancedMesh per token class (keyword, string,
 * number, comment, plain), so even a few thousand tokens are only ~5 draw
 * calls. Click any arc to jump to that line.
 */

type TokenClass = "keyword" | "string" | "number" | "comment" | "plain";

interface Token {
  text: string;
  cls: TokenClass;
}

const KEYWORDS = new Set(
  "def class if elif else for while return import from function const let var new this switch case break continue public private static void int float double char bool string true false null None True False and or not in is lambda try except finally with async await struct enum interface package namespace using include printf print typeof instanceof extends super yield global nonlocal assert raise del pass continue".split(
    " ",
  ),
);

const MAX_LINES = 140;
const MAX_TOKENS_PER_LINE = 24;

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  const re =
    /(\/\/.*$)|(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b|(\S)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const [full, comment, hashComment, str, num, word] = m;
    let cls: TokenClass;
    if (comment || hashComment) cls = "comment";
    else if (str) cls = "string";
    else if (num) cls = "number";
    else if (word) cls = KEYWORDS.has(word) ? "keyword" : "plain";
    else cls = "plain";
    tokens.push({ text: full, cls });
    if (tokens.length >= MAX_TOKENS_PER_LINE) break;
  }
  return tokens;
}

interface LineLayout {
  line: number;
  angle: number;
  baseR: number;
  tokens: { text: string; cls: TokenClass; r: number; w: number }[];
}

function buildLayout(code: string): LineLayout[] {
  const lines = code.split("\n").slice(0, MAX_LINES);
  return lines.map((raw, i) => {
    const line = raw.replace(/\t/g, "    ");
    const tokens = tokenizeLine(line);
    const angle = i * 0.5;
    const baseR = 4.4 + i * 0.16;
    let r = baseR;
    const laid = tokens.map((t) => {
      const w = 0.26 + t.text.length * 0.11;
      const item = { ...t, r, w };
      r += w + 0.1;
      return item;
    });
    return { line: i + 1, angle, baseR, tokens: laid };
  });
}

/** One InstancedMesh per token class — single draw call per class. */
function TokenInstances({
  cls,
  instances,
  activeLine,
  colors,
}: {
  cls: TokenClass;
  instances: { r: number; angle: number; w: number; line: number }[];
  activeLine: number;
  colors: Record<TokenClass, string>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    instances.forEach((inst, i) => {
      dummy.position.set(
        Math.cos(inst.angle) * inst.r,
        0,
        Math.sin(inst.angle) * inst.r,
      );
      dummy.rotation.set(0, -inst.angle, 0);
      dummy.scale.set(inst.w, 0.16, 0.16);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [instances, dummy]);

  // Brighten tokens on the executing line (and dim the rest of its class).
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const color = new THREE.Color(colors[cls]);
    const bright = color.clone().lerp(new THREE.Color("#ffffff"), 0.55);
    instances.forEach((inst, i) => {
      const on = inst.line === activeLine;
      m.setColorAt(i, on ? bright : color);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [instances, activeLine, cls, colors]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, Math.max(instances.length, 1)]}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.35}
        metalness={0.35}
        emissive="#000000"
      />
    </instancedMesh>
  );
}

function Galaxy({ children }: { children: React.ReactNode }) {
  const rot = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (rot.current) rot.current.rotation.y = clock.getElapsedTime() * 0.05;
  });
  return <group ref={rot}>{children}</group>;
}

export function CodeGalaxy3D({
  code,
  activeLine,
  onPick,
}: {
  code: string;
  activeLine: number;
  onPick?: (line: number) => void;
}) {
  const p = useTheme3D();
  const colors: Record<TokenClass, string> = useMemo(
    () => ({
      keyword: p.ember,
      string: p.verdant,
      number: p.arc,
      comment: p.textDim,
      plain: p.textStrong,
    }),
    [p],
  );
  const layout = useMemo(() => buildLayout(code), [code]);

  const perClass = useMemo(() => {
    const map = new Map<TokenClass, { r: number; angle: number; w: number; line: number }[]>();
    for (const line of layout) {
      for (const t of line.tokens) {
        if (!map.has(t.cls)) map.set(t.cls, []);
        map.get(t.cls)!.push({
          r: t.r,
          angle: line.angle,
          w: t.w,
          line: line.line,
        });
      }
    }
    return map;
  }, [layout]);

  const activeLayout =
    layout.find((l) => l.line === activeLine) ?? layout[0];

  const ringAngle = activeLayout?.angle ?? 0;
  const ringR = activeLayout?.baseR ?? 0;

  return (
    <Canvas
      dpr={[1, 1.75]}
      performance={{ min: 0.4 }}
      camera={{ position: [0, 10, 11], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.9 * p.lighting.ambient} />
      <pointLight position={[0, 10, 0]} intensity={40 * p.lighting.accent} distance={30} color={p.ember} />
      <directionalLight position={[5, 12, 6]} intensity={1.4 * p.lighting.directional} />

      <Galaxy>
        {(["keyword", "string", "number", "comment", "plain"] as TokenClass[]).map(
          (cls) => (
            <TokenInstances
              key={cls}
              cls={cls}
              instances={perClass.get(cls) ?? []}
              activeLine={activeLine}
              colors={colors}
            />
          ),
        )}
      </Galaxy>

      {/* Executing-line ring + beam */}
      {activeLayout && (
        <ActiveLineMarker angle={ringAngle} r={ringR} line={activeLayout.line} onPick={onPick} accent={p.ember} />
      )}

      <PointerParallax />
    </Canvas>
  );
}

function ActiveLineMarker({
  angle,
  r,
  line,
  onPick,
  accent,
}: {
  angle: number;
  r: number;
  line: number;
  onPick?: (line: number) => void;
  accent: string;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const beam = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring.current) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      ring.current.scale.set(s, 1, s);
    }
    if (beam.current) {
      const m = beam.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + (Math.sin(t * 2.2) + 1) * 0.05;
    }
  });
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  return (
    <group position={[x, 0, z]} rotation={[0, -angle, 0]}>
      <mesh
        ref={ring}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.22, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(line);
        }}
      >
        <torusGeometry args={[0.4, 0.02, 8, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.85} />
      </mesh>
      <mesh ref={beam} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} />
      </mesh>
      <Html position={[0, 0.5, 0]} center distanceFactor={12} pointerEvents="none" zIndexRange={[10, 0]}>
        <span className="rounded bg-ink-900/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ember-300 ring-1 ring-ember-500/40">
          L{line}
        </span>
      </Html>
    </group>
  );
}

function PointerParallax() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      state.pointer.x * 1.6 + Math.sin(t * 0.08) * 0.4,
      0.03,
    );
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      11 + Math.abs(state.pointer.x) * 0.8,
      0.03,
    );
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}
