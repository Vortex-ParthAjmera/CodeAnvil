import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { TerminalSquare } from "lucide-react";
import { cn } from "../lib/cn";

/** Event → label + tone, so the commentary reads as a forge log. */
const EVENT_META: Record<string, { label: string; tone: string }> = {
  line_enter: { label: "executing", tone: "text-arc-300 ring-arc-500/40 bg-arc-500/10" },
  assignment: { label: "assign", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  condition_check: { label: "branch", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  loop_start: { label: "loop", tone: "text-arc-300 ring-arc-500/40 bg-arc-500/10" },
  loop_iteration: { label: "iterate", tone: "text-arc-300 ring-arc-500/40 bg-arc-500/10" },
  function_call: { label: "call", tone: "text-verdant-300 ring-verdant-500/40 bg-verdant-500/10" },
  function_return: { label: "return", tone: "text-verdant-300 ring-verdant-500/40 bg-verdant-500/10" },
  recursion_call: { label: "recurse", tone: "text-verdant-300 ring-verdant-500/40 bg-verdant-500/10" },
  array_read: { label: "read", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  array_write: { label: "write", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  comparison: { label: "compare", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  swap: { label: "swap", tone: "text-ember-300 ring-ember-500/40 bg-ember-500/10" },
  output_write: { label: "print", tone: "text-arc-300 ring-arc-500/40 bg-arc-500/10" },
  program_start: { label: "start", tone: "text-verdant-300 ring-verdant-500/40 bg-verdant-500/10" },
  program_end: { label: "done", tone: "text-verdant-300 ring-verdant-500/40 bg-verdant-500/10" },
  error: { label: "error", tone: "text-rose-300 ring-rose-500/40 bg-rose-500/10" },
};

function useTypewriter(text: string, cps = 150) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const per = 1000 / cps;
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          window.clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, per);
    return () => window.clearInterval(id);
  }, [text, cps]);
  return text.slice(0, n);
}

export function CommentaryBar({ event, text }: { event: string; text: string }) {
  const reduce = useReducedMotion();
  const typed = useTypewriter(text);
  const meta = EVENT_META[event] ?? {
    label: event.replaceAll("_", " "),
    tone: "text-ink-300 ring-ink-600 bg-ink-800",
  };

  return (
    <div className="flex min-h-[42px] items-center gap-3 border-t border-ink-700 bg-ink-900/70 px-4 py-2 backdrop-blur-sm">
      <TerminalSquare size={14} className="shrink-0 text-ember-400" />
      <motion.span
        key={event}
        initial={reduce ? false : { scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 540, damping: 30 }}
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] ring-1",
          meta.tone,
        )}
      >
        {meta.label}
      </motion.span>
      <p className="min-w-0 flex-1 truncate font-mono text-xs leading-relaxed text-ink-200">
        {typed}
        <span className="caret" aria-hidden />
      </p>
    </div>
  );
}
