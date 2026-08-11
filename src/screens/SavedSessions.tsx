import { useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { EXAMPLES } from "../data/examples";
import { deleteSession, loadSessions, type SavedSession } from "../lib/storage";
import type { Route } from "../router";
import { Badge, Button, Card, EmptyState } from "../components/ui";
import { TiltCard } from "../components/TiltCard";
import { AnimatedHeading, FadeIn } from "../components/motionfx";

export function SavedSessions({
  onNavigate,
}: {
  onNavigate: (route: Route) => void;
}) {
  const [sessions, setSessions] = useState<SavedSession[]>(() => loadSessions());

  function handleDelete(id: string) {
    setSessions(deleteSession(id));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <AnimatedHeading
          text="Saved Sessions"
          className="mb-1 text-xl font-bold text-ink-100"
        />
        <p className="mb-6 text-sm text-ink-400">
          Playback sessions saved in this browser (localStorage). Resume where
          you left off.
        </p>

        {sessions.length === 0 ? (
          <Card>
            <EmptyState
              title="No saved sessions yet"
              hint="Open an example in the Playback Lab, step through it, and press Save session."
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {[...sessions]
              .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
              .map((s, i) => {
                const ex = EXAMPLES.find((e) => e.id === s.exampleId);
                if (!ex) return null;
                const progress = Math.round(
                  (s.stepIndex / Math.max(1, ex.trace.steps.length - 1)) * 100,
                );
                return (
                  <FadeIn key={s.id} delay={0.05 + i * 0.06}>
                  <TiltCard intensity={4}>
                  <Card className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-ink-100">
                            {ex.title}
                          </h3>
                          <Badge tone="amber">{ex.topic}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-500">
                          Step {s.stepIndex + 1} / {ex.trace.steps.length} · saved{" "}
                          {new Date(s.savedAt).toLocaleString()}
                        </p>
                        <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-800">
                          <div
                            className="h-full rounded-full bg-ember-400"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="primary"
                          onClick={() =>
                            onNavigate({
                              name: "lab",
                              exampleId: ex.id,
                              stepIndex: s.stepIndex,
                            })
                          }
                        >
                          <Play size={14} /> Resume
                        </Button>
                        <Button
                          variant="danger"
                          title="Delete session"
                          onClick={() => handleDelete(s.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                  </TiltCard>
                  </FadeIn>
                );
              })}
          </div>
        )}

        <div className="mt-8">
          <Button
            variant="default"
            className="btn-shine"
            onClick={() => onNavigate({ name: "lab" })}
          >
            <Play size={14} /> Open Playback Lab
          </Button>
        </div>
      </div>
    </div>
  );
}
