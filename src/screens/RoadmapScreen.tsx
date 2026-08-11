import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { ArrowRight, CheckCircle2, ChevronRight, Compass, Map as MapIcon, Sparkles } from "lucide-react";
import type { Route } from "../router";
import {
  CORE_50,
  dependentsOf,
  problemId,
  ROADMAP_TOPICS,
  type RoadmapTopic,
} from "../data/roadmap";
import { DSA_PROBLEMS } from "../data/dsaCatalog";
import { getSnapshot, getStatus, setStatus, subscribe, type ProblemStatus } from "../lib/progress";
import { hue } from "../components/three/palette";
import { Badge, Button, Card } from "../components/ui";
import { AnimatedHeading, HudFrame } from "../components/motionfx";

/** Position topics on a tilted ring so the dependency web reads in 3D. */
function layout(topic: RoadmapTopic, count: number): [number, number, number] {
  const t = (topic.order / Math.max(1, count - 1)) * Math.PI * 2;
  return [
    Math.cos(t) * 7.6,
    Math.sin(t * 3) * 0.9 + (topic.order % 2 === 0 ? 0.5 : -0.4),
    Math.sin(t) * 7.6,
  ];
}

const STATUS_COLORS: Record<ProblemStatus, string> = {
  none: "#262833",
  attempted: "#38bdf8",
  solved: "#34d399",
  mastered: "#a78bfa",
};

const STATUS_LABEL: Record<ProblemStatus, string> = {
  none: "not started",
  attempted: "attempted",
  solved: "solved",
  mastered: "mastered",
};

const NEXT_STATUS: Record<ProblemStatus, ProblemStatus> = {
  none: "attempted",
  attempted: "solved",
  solved: "mastered",
  mastered: "none",
};

function RoadmapGraph3D({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const nodes = ROADMAP_TOPICS;
  const positions = useMemo(
    () => new Map(nodes.map((n) => [n.id, layout(n, nodes.length)])),
    [nodes],
  );
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={group}>
      {/* Dependency edges (prereq → dependent) */}
      {nodes.flatMap((n) =>
        n.prerequisites.map((p) => {
          const a = positions.get(p);
          const b = positions.get(n.id);
          if (!a || !b) return null;
          return (
            <Line
              key={`${p}-${n.id}`}
              points={[a, b]}
              color={selectedId === n.id ? "#a78bfa" : "#3a3d4d"}
              lineWidth={selectedId === n.id ? 1.8 : 1}
              transparent
              opacity={0.55}
            />
          );
        }),
      )}
      {nodes.map((n) => {
        const [x, y, z] = positions.get(n.id)!;
        const selected = selectedId === n.id;
        const color = hue(n.order);
        return (
          <group key={n.id} position={[x, y, z]}>
            <mesh onClick={(e) => { e.stopPropagation(); onSelect(n.id); }} scale={selected ? 1.25 : 1}>
              <sphereGeometry args={[0.55, 24, 24]} />
              <meshStandardMaterial
                color={selected ? "#e9e2ff" : color}
                emissive={selected ? "#a78bfa" : color}
                emissiveIntensity={selected ? 1.1 : 0.5}
                metalness={0.4}
                roughness={0.3}
              />
            </mesh>
            <Text
              position={[0, 0.95, 0]}
              fontSize={0.42}
              color={selected ? "#ffffff" : "#c9cdd8"}
              anchorX="center"
              anchorY="middle"
            >
              {String(n.order + 1)}
            </Text>
            <Text
              position={[0, 1.5, 0]}
              fontSize={0.3}
              color={selected ? "#d6b6ff" : "#7a7f92"}
              anchorX="center"
              anchorY="middle"
            >
              {n.name}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

function Core50Grid({ onOpen }: { onOpen: (topic: string, title: string) => void }) {
  const progress = useSyncExternalStore(subscribe, getSnapshot);
  const tackled = CORE_50.filter(([t, title]) => getStatus(problemId([t, title])) !== "none").length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Sparkles size={14} className="text-ember-300" /> The Core 50
        </h3>
        <Badge tone={tackled === 0 ? "neutral" : tackled >= 25 ? "green" : "amber"}>
          {tackled} / {CORE_50.length} tackled
        </Badge>
        <p className="text-[11px] text-ink-500">
          The starter tier — one curated problem per pattern, in roadmap order. Click a chip to
          cycle its status.
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {CORE_50.map(([topic, title], i) => {
          const id = problemId([topic, title]);
          const status = progress.statuses[id] ?? "none";
          return (
            <button
              key={id}
              type="button"
              title={`${i + 1}. ${title} — ${STATUS_LABEL[status]} (click to cycle)`}
              onClick={() => {
                setStatus(id, NEXT_STATUS[status]);
                onOpen(topic, title);
              }}
              className="group flex h-9 flex-col items-center justify-center rounded-md border transition-all"
              style={{
                borderColor: status === "none" ? "#262833" : STATUS_COLORS[status],
                background:
                  status === "none"
                    ? "rgba(18,19,24,0.6)"
                    : `${STATUS_COLORS[status]}1a`,
              }}
            >
              <span className="font-mono text-[9px] leading-none" style={{ color: status === "none" ? "#4a4e5e" : STATUS_COLORS[status] }}>
                {i + 1}
              </span>
              <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: status === "none" ? "#363947" : STATUS_COLORS[status] }} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function RoadmapScreen({ onNavigate }: { onNavigate: (route: Route) => void }) {
  const [selectedId, setSelectedId] = useState<string>(ROADMAP_TOPICS[0].id);
  const progress = useSyncExternalStore(subscribe, getSnapshot);

  const selected = ROADMAP_TOPICS.find((t) => t.id === selectedId) ?? ROADMAP_TOPICS[0];

  const topicProblems = useMemo(
    () => DSA_PROBLEMS.filter((p) => p.topic === selected.catalogTopic),
    [selected],
  );
  const coreInTopic = useMemo(
    () =>
      CORE_50.filter(([t]) => t === selected.catalogTopic).map(([t, title]) =>
        problemId([t, title]),
      ),
    [selected],
  );

  const nextTopics = dependentsOf(selected.id);
  const nextUntouched = CORE_50.find(([t, title]) => {
    const id = problemId([t, title]);
    return (progress.statuses[id] ?? "none") === "none";
  });
  const tackled = CORE_50.filter(([t, title]) => getStatus(problemId([t, title])) !== "none").length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 px-5 py-6 sm:px-7">
          <div className="atlas-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="amber"><Compass size={11} /> Roadmap</Badge>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500">
                  {ROADMAP_TOPICS.length} topics · {CORE_50.length}-problem starter tier
                </span>
              </div>
              <AnimatedHeading
                text="Every pattern needs a path."
                gradientLast
                className="max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-ink-100 sm:text-4xl"
              />
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
                A dependency-ordered journey: each topic unlocks the next. Drag the 3D graph to
                explore, click a node to see its problems, and work the Core 50 in order.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700 xl:w-[390px]">
              {[[ROADMAP_TOPICS.length, "topics"], [CORE_50.length, "core problems"], [`${tackled}/${CORE_50.length}`, "tackled"]].map(([value, label]) => (
                <div key={label as string} className="bg-ink-950/80 px-4 py-3">
                  <p className="font-mono text-xl font-semibold text-ink-100">{value}</p>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-ink-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="my-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.7fr)]">
          {/* 3D dependency graph */}
          <HudFrame label="topic map" right="drag to orbit · click a node" className="min-h-[420px]">
            <Canvas
              dpr={[1, 1.75]}
              camera={{ position: [0, 7, 16], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
              style={{ background: "transparent" }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[6, 9, 5]} intensity={1.4} />
              <pointLight position={[0, 6, 4]} intensity={55} distance={20} color="#a78bfa" />
              <RoadmapGraph3D selectedId={selectedId} onSelect={setSelectedId} />
              <OrbitControls
                enablePan={false}
                minDistance={7}
                maxDistance={26}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
          </HudFrame>

          {/* Selected topic panel */}
          <Card className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ember-400">
                  Step {selected.order + 1} of {ROADMAP_TOPICS.length}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-ink-100">
                  {selected.name}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">{selected.tagline}</p>
              </div>
              <span
                className="mt-1 h-10 w-10 shrink-0 rounded-xl"
                style={{ background: `${hue(selected.order)}26`, boxShadow: `0 0 24px ${hue(selected.order)}55` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
                <p className="text-[9px] uppercase tracking-widest text-ink-500">Builds on</p>
                <p className="mt-1 font-medium text-ink-200">
                  {selected.prerequisites.length === 0
                    ? "— nothing, this is the foundation"
                    : selected.prerequisites.map((p) => ROADMAP_TOPICS.find((t) => t.id === p)?.name).join(" · ")}
                </p>
              </div>
              <div className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
                <p className="text-[9px] uppercase tracking-widest text-ink-500">Unlocks</p>
                <p className="mt-1 font-medium text-ink-200">
                  {nextTopics.length === 0
                    ? "— the frontier"
                    : nextTopics.map((t) => t.name).join(" · ")}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                Problems in this topic · {topicProblems.length} ({coreInTopic.length} in Core 50)
              </p>
              <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                {topicProblems.map((p) => {
                  const isCore = coreInTopic.includes(p.id);
                  const status = progress.statuses[p.id] ?? "none";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onNavigate({ name: "atlas" })}
                      className="flex w-full items-center gap-2 rounded-md border border-ink-800 bg-ink-900/70 px-2.5 py-1.5 text-left transition-colors hover:border-ink-600"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm"
                        style={{ background: STATUS_COLORS[status] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-ink-200">{p.title}</span>
                      {isCore && <Badge tone="amber">core</Badge>}
                      <Badge tone={p.difficulty === "beginner" ? "green" : p.difficulty === "intermediate" ? "blue" : "red"}>
                        {p.difficulty}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => onNavigate({ name: "atlas" })}
              >
                Open this topic in the Atlas <ArrowRight size={14} />
              </Button>
            </div>
          </Card>
        </div>

        <Core50Grid onOpen={() => undefined} />

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/70 px-5 py-4">
          <MapIcon size={16} className="text-ember-300" />
          <p className="text-sm text-ink-200">
            {nextUntouched ? (
              <>
                <span className="font-semibold text-ink-100">Next up:</span>{" "}
                {nextUntouched[1]} ({nextUntouched[0]}) — the first Core-50 problem you
                haven't started.
              </>
            ) : (
              <span className="text-verdant-300">
                <CheckCircle2 size={14} className="mr-1 inline" /> All 50 Core problems touched —
                on to the long tail.
              </span>
            )}
          </p>
          {nextUntouched && (
            <button
              type="button"
              onClick={() => onNavigate({ name: "atlas" })}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-semibold text-ember-300 transition-colors hover:bg-ember-500/20"
            >
              Start it <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
