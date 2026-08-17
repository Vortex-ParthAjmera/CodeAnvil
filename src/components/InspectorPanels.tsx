import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "../lib/cn";
import type { MemoryItem, TraceStep } from "../types/trace";

type Tab = "vars" | "stack" | "memory" | "output";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  if (value === null) return "null";
  return String(value);
}

/** Variable row: re-mounts when its value changes so the change pops in and
 * the forge value-flash re-triggers — the eye lands on exactly what moved. */
function VarRow({
  name,
  value,
  changed,
  reduce,
}: {
  name: string;
  value: unknown;
  changed: boolean;
  reduce: boolean | null;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
      className={cn(
        "flex items-baseline justify-between gap-2 rounded px-2 py-1 font-mono text-xs",
        changed ? "value-flash text-ember-300" : "text-ink-200",
      )}
    >
      <span className="truncate text-ink-400">{name}</span>
      <span className="truncate text-right">{formatValue(value)}</span>
    </motion.div>
  );
}

function MemoryArray({
  item,
  reduce,
}: {
  item: MemoryItem;
  reduce: boolean | null;
}) {
  return (
    <div className="px-2 py-2">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-xs text-ink-400">{item.label}</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500">
          {item.type}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {item.value.map((cell, i) => {
          const hl = item.highlights.find((h) => "index" in h && h.index === i);
          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded border font-mono text-xs",
                  hl?.role === "mid"
                    ? "border-ember-400 bg-ember-500/20 text-ember-300 shadow-[0_0_10px_rgba(167,139,250,0.35)]"
                    : hl?.role === "reading"
                      ? "border-arc-500 bg-arc-500/15 text-arc-300"
                      : "border-ink-600 bg-ink-800 text-ink-200",
                )}
              >
                <motion.span
                  key={String(cell)}
                  initial={reduce ? false : { scale: 0.5, opacity: 0.35 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 620, damping: 26 }}
                >
                  {String(cell)}
                </motion.span>
              </div>
              <span className="mt-0.5 font-mono text-[9px] text-ink-500">{i}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InspectorPanels({ step }: { step: TraceStep }) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("vars");
  const changedVars = new Set(step.changed?.variables ?? []);
  const changedFrames = new Set(step.changed?.stack ?? []);
  const varEntries = Object.entries(step.variables ?? {});
  const topFrame = step.stack[0];
  const localEntries = topFrame ? Object.entries(topFrame.locals) : [];

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "vars", label: "Variables", count: varEntries.length },
    { id: "stack", label: "Stack", count: step.stack.length },
    { id: "memory", label: "Memory", count: step.memory?.length ?? 0 },
    { id: "output", label: "Output", count: step.output ? 1 : 0 },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 border-b border-ink-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 px-2 py-2 text-[11px] font-medium uppercase tracking-wider transition-colors",
              tab === t.id
                ? "border-b-2 border-ember-400 text-ember-300"
                : "text-ink-400 hover:text-ink-200",
            )}
          >
            {t.label}
            <span className="ml-1 font-mono text-[10px] text-ink-500">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {tab === "vars" && (
          <div>
            {varEntries.length === 0 && localEntries.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-500">
                No variables in scope yet.
              </p>
            )}
            {localEntries.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-arc-400">
                  Current frame · {topFrame.name}
                </p>
                {localEntries.map(([name, value]) => (
                  <VarRow
                    key={`${name}-${formatValue(value)}`}
                    name={name}
                    value={value}
                    changed={changedVars.has(name)}
                    reduce={reduce}
                  />
                ))}
              </>
            )}
            {varEntries.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-ink-500">
                  Module scope
                </p>
                {varEntries.map(([name, value]) => (
                  <VarRow
                    key={`${name}-${formatValue(value)}`}
                    name={name}
                    value={value}
                    changed={changedVars.has(name)}
                    reduce={reduce}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {tab === "stack" && (
          <div className="space-y-1.5 px-2 py-1.5">
            {step.stack.length === 0 && (
              <p className="px-1 py-2 text-xs text-ink-500">
                Call stack is empty.
              </p>
            )}
            <AnimatePresence initial={false}>
              {step.stack.map((frame, i) => (
                <motion.div
                  key={frame.id}
                  layout={!reduce}
                  initial={
                    reduce
                      ? false
                      : { opacity: 0, y: 16, scale: 0.97 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduce
                      ? undefined
                      : {
                          opacity: 0,
                          y: -16,
                          scale: 0.97,
                          transition: { duration: 0.14 },
                        }
                  }
                  transition={
                    reduce
                      ? undefined
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                  className={cn(
                    "rounded border px-2 py-1.5",
                    i === 0
                      ? "border-ember-500/50 bg-ember-500/10"
                      : "border-ink-700 bg-ink-800",
                    changedFrames.has(frame.id) && "value-flash",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-ink-100">
                      {frame.name}
                      {i === 0 && (
                        <span className="ml-1.5 text-[9px] uppercase tracking-wider text-ember-300">
                          running
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-ink-500">
                      line {frame.line}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    {Object.entries(frame.locals).map(([name, value]) => (
                      <span
                        key={name}
                        className="font-mono text-[11px] text-ink-300"
                      >
                        <span className="text-ink-500">{name} =</span>{" "}
                        {formatValue(value)}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {tab === "memory" && (
          <div>
            {!step.memory?.length && (
              <p className="px-3 py-2 text-xs text-ink-500">
                No memory items at this step.
              </p>
            )}
            {step.memory?.map((item) => (
              <MemoryArray key={item.id} item={item} reduce={reduce} />
            ))}
          </div>
        )}

        {tab === "output" && (
          <div className="px-3 py-2">
            {!step.output && (
              <p className="text-xs text-ink-500">Nothing printed yet.</p>
            )}
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-100">
              {step.output || ""}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
