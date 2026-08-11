import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipBack,
  SkipForward,
  Target,
} from "lucide-react";
import type { PlaybackState } from "../engine/playback";
import type { PracticeStats } from "../engine/usePlayback";
import { cn } from "../lib/cn";
import { SPEEDS } from "../engine/playback";
import { Button } from "./ui";

export function PlaybackControls({
  state,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onReset,
  onSetSpeed,
  onSetMode,
  onSave,
  stats,
}: {
  state: PlaybackState;
  onTogglePlay: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onSetMode: (mode: "watch" | "practice") => void;
  onSave: () => void;
  stats: PracticeStats;
}) {
  const atEnd = state.stepIndex >= state.stepCount - 1;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-700 bg-ink-900 px-3 py-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" onClick={onReset} title="Reset (back to start)">
          <RotateCcw size={16} />
        </Button>
        <Button
          variant="ghost"
          onClick={onStepBack}
          disabled={state.stepIndex === 0}
          title="Previous step"
        >
          <SkipBack size={16} />
        </Button>
        <Button
          variant="primary"
          onClick={onTogglePlay}
          disabled={atEnd && !state.isPlaying}
          title={state.isPlaying ? "Pause" : "Play"}
          className="h-8 w-12"
        >
          {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button
          variant="ghost"
          onClick={onStepForward}
          disabled={atEnd}
          title="Next step"
        >
          <SkipForward size={16} />
        </Button>
      </div>

      <div className="font-mono text-xs text-ink-300 tabular-nums">
        Step <span className="text-ember-300">{state.stepIndex + 1}</span> /{" "}
        {state.stepCount}
      </div>

      <div className="flex items-center gap-1" title="Playback speed">
        <Gauge size={14} className="text-ink-500" />
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => onSetSpeed(speed)}
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors",
              state.speed === speed
                ? "bg-ember-500/20 text-ember-300 ring-1 ring-ember-500/40"
                : "text-ink-400 hover:bg-ink-800 hover:text-ink-200",
            )}
          >
            {speed}×
          </button>
        ))}
      </div>

      <div className="mx-1 hidden h-5 w-px bg-ink-700 sm:block" />

      <div className="flex items-center gap-1" title="Dry-run practice mode">
        <Target size={14} className="text-ink-500" />
        <button
          type="button"
          onClick={() =>
            onSetMode(state.mode === "practice" ? "watch" : "practice")
          }
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
            state.mode === "practice"
              ? "bg-arc-500/20 text-arc-300 ring-1 ring-arc-500/40"
              : "text-ink-400 hover:bg-ink-800 hover:text-ink-200",
          )}
        >
          Practice mode {state.mode === "practice" ? "on" : "off"}
        </button>
        {state.mode === "practice" && (
          <span className="font-mono text-[11px] text-ink-400 tabular-nums">
            {stats.correct}/{stats.answered} · streak {stats.streak}
          </span>
        )}
      </div>

      <div className="ml-auto">
        <Button variant="default" onClick={onSave} title="Save this session locally">
          <Save size={15} />
          Save session
        </Button>
      </div>
    </div>
  );
}
