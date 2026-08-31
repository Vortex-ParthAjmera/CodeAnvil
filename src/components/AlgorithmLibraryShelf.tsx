import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock3, Play, Sparkles } from "lucide-react";
import {
  ALGORITHM_SECTIONS,
  TOTAL_ALGORITHM_BUTTONS,
  TOTAL_READY_ALGORITHM_BUTTONS,
  countAlgorithmButtons,
  countReadyAlgorithmButtons,
  findAlgorithmForExample,
  type AlgorithmItem,
  type AlgorithmVariant,
} from "../data/algorithmLibrary";
import { Badge } from "./ui";
import { cn } from "../lib/cn";

interface AlgorithmLibraryShelfProps {
  activeExampleId?: string;
  collapsed?: boolean;
  collapsible?: boolean;
  compact?: boolean;
  className?: string;
  onCollapsedChange?: (collapsed: boolean) => void;
  onOpenExample: (exampleId: string) => void;
}

function actionTitle(item: AlgorithmItem, variant: AlgorithmVariant): string {
  return variant.exampleId
    ? "Open " + item.title + " animation"
    : item.title + " animation is queued";
}

function VariantButton({
  item,
  variant,
  activeExampleId,
  compact,
  onOpenExample,
}: {
  item: AlgorithmItem;
  variant: AlgorithmVariant;
  activeExampleId?: string;
  compact: boolean;
  onOpenExample: (exampleId: string) => void;
}) {
  const exampleId = variant.exampleId;
  const isReady = Boolean(exampleId);
  const isActive = exampleId === activeExampleId;
  const Icon = isActive ? CheckCircle2 : isReady ? Play : Clock3;

  return (
    <button
      type="button"
      disabled={!exampleId}
      title={actionTitle(item, variant)}
      onClick={exampleId ? () => onOpenExample(exampleId) : undefined}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400 disabled:cursor-not-allowed",
        compact ? "h-7 px-2 text-[10px]" : "h-8 px-2.5 text-xs",
        isActive && "border-ember-400 bg-ember-400 text-ink-950",
        isReady && !isActive && "border-ember-500/40 bg-ember-500/10 text-ember-200 hover:border-ember-400/70 hover:bg-ember-500/20",
        !isReady && "border-ink-800 bg-ink-950/50 text-ink-600",
      )}
    >
      <Icon size={compact ? 10 : 12} className="shrink-0" />
      <span className="truncate">{variant.label}</span>
    </button>
  );
}

function AlgorithmButton({
  item,
  activeExampleId,
  compact,
  onOpenExample,
}: {
  item: AlgorithmItem;
  activeExampleId?: string;
  compact: boolean;
  onOpenExample: (exampleId: string) => void;
}) {
  const readyCount = item.variants.filter((variant) => Boolean(variant.exampleId)).length;
  const isReady = readyCount > 0;
  const isActive = item.variants.some((variant) => variant.exampleId === activeExampleId);

  if (item.variants.length === 1) {
    const [variant] = item.variants;
    const exampleId = variant.exampleId;
    const Icon = isActive ? CheckCircle2 : isReady ? Play : Clock3;
    return (
      <button
        type="button"
        disabled={!exampleId}
        title={actionTitle(item, variant)}
        onClick={exampleId ? () => onOpenExample(exampleId) : undefined}
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400 disabled:cursor-not-allowed",
          compact ? "min-h-10 px-2.5 py-2" : "min-h-12 px-3 py-2.5",
          isActive && "border-ember-400 bg-ember-400 text-ink-950",
          isReady && !isActive && "border-ink-700 bg-ink-900 text-ink-100 hover:border-ember-500/50 hover:bg-ember-500/10",
          !isReady && "border-ink-800 bg-ink-950/35 text-ink-500 opacity-75",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border",
            compact ? "h-6 w-6" : "h-7 w-7",
            isActive && "border-ink-950/20 bg-ink-950/10 text-ink-950",
            isReady && !isActive && "border-ember-500/30 bg-ember-500/10 text-ember-300",
            !isReady && "border-ink-800 bg-ink-900 text-ink-600",
          )}
        >
          <Icon size={compact ? 11 : 13} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate font-semibold", compact ? "text-xs" : "text-sm")}>{item.title}</span>
          <span className={cn("block font-mono uppercase tracking-wider", compact ? "text-[8px]" : "text-[9px]", isActive ? "text-ink-900" : isReady ? "text-ember-300/80" : "text-ink-600")}>
            {isReady ? "animated" : "queued"}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border transition-colors",
        compact ? "p-2" : "p-3",
        isActive ? "border-ember-500/60 bg-ember-500/10" : "border-ink-800 bg-ink-950/35",
      )}
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
        <p className={cn("min-w-0 truncate font-semibold text-ink-100", compact ? "text-xs" : "text-sm")}>{item.title}</p>
        <Badge tone={isReady ? "amber" : "neutral"} className="shrink-0">
          {readyCount}/{item.variants.length}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.variants.map((variant) => (
          <VariantButton
            key={variant.label}
            item={item}
            variant={variant}
            activeExampleId={activeExampleId}
            compact={compact}
            onOpenExample={onOpenExample}
          />
        ))}
      </div>
    </div>
  );
}

export function AlgorithmLibraryShelf({
  activeExampleId,
  collapsed = false,
  collapsible = false,
  compact = false,
  className,
  onCollapsedChange,
  onOpenExample,
}: AlgorithmLibraryShelfProps) {
  const activeAlgorithm = useMemo(
    () => (activeExampleId ? findAlgorithmForExample(activeExampleId) : undefined),
    [activeExampleId],
  );
  const activeSectionId = activeAlgorithm?.sectionId;
  const [selectedSectionId, setSelectedSectionId] = useState(activeSectionId ?? ALGORITHM_SECTIONS[0].id);

  useEffect(() => {
    if (activeSectionId) setSelectedSectionId(activeSectionId);
  }, [activeSectionId]);

  const section = ALGORITHM_SECTIONS.find((item) => item.id === selectedSectionId) ?? ALGORITHM_SECTIONS[0];
  const selectedReady = countReadyAlgorithmButtons(section);
  const selectedTotal = countAlgorithmButtons(section);
  const isCollapsed = collapsible && collapsed;
  const CollapseIcon = isCollapsed ? ChevronDown : ChevronUp;
  const collapsedTitle = activeAlgorithm?.displayTitle ?? section.title;
  const collapsedContext = activeAlgorithm
    ? `${activeAlgorithm.sectionTitle} / ${activeAlgorithm.variantLabel}`
    : section.title;

  return (
    <section
      className={cn(
        "rounded-xl border border-ink-800 bg-ink-950/35",
        compact ? "p-2" : "p-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2",
          compact
            ? "mb-2 sm:flex-row sm:items-center sm:justify-between"
            : "mb-4 sm:flex-row sm:items-end sm:justify-between",
        )}
      >
        {compact ? (
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-ink-500">
              Algorithm library
            </p>
            <p className="truncate text-xs font-semibold text-ink-200">
              {isCollapsed ? collapsedTitle : section.title}
            </p>
          </div>
        ) : (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
              <Sparkles size={14} className="text-ember-300" /> Algorithm library
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-400">
              {TOTAL_READY_ALGORITHM_BUTTONS} animations are live now. The rest are queued with honest disabled buttons until their traces are built.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">{TOTAL_READY_ALGORITHM_BUTTONS} live</Badge>
          <Badge tone="neutral">{TOTAL_ALGORITHM_BUTTONS} planned</Badge>
          {collapsible && (
            <button
              type="button"
              aria-expanded={!isCollapsed}
              title={isCollapsed ? "Show algorithm library" : "Minimize algorithm library"}
              onClick={() => onCollapsedChange?.(!isCollapsed)}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-ink-700 bg-ink-900 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-300 transition-colors hover:border-ember-500/60 hover:text-ember-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400"
            >
              <CollapseIcon size={12} />
              {isCollapsed ? "Expand" : "Minimize"}
            </button>
          )}
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900/55 px-3 py-2">
          <div className="min-w-0">
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-widest text-ink-500">
              {activeAlgorithm ? "Current animation" : "Current set"}
            </span>
            <span className="block truncate text-xs font-semibold text-ink-100">{collapsedTitle}</span>
            <span className="mt-0.5 block truncate font-mono text-[9px] uppercase tracking-wider text-ink-500">
              {collapsedContext}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-500">
            {selectedReady}/{selectedTotal} playable
          </span>
        </div>
      ) : (
        <>
          <div className={cn("grid gap-2", compact ? "max-h-28 grid-cols-2 overflow-y-auto pr-1 sm:grid-cols-4 xl:grid-cols-7" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}>
            {ALGORITHM_SECTIONS.map((candidate) => {
              const selected = candidate.id === section.id;
              const readyCount = countReadyAlgorithmButtons(candidate);
              const totalCount = countAlgorithmButtons(candidate);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedSectionId(candidate.id)}
                  className={cn(
                    "min-w-0 rounded-lg border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-400",
                    compact ? "px-2.5 py-2" : "px-3 py-2.5",
                    selected
                      ? "border-ember-500/60 bg-ember-500/15 text-ember-200"
                      : "border-ink-800 bg-ink-900/60 text-ink-300 hover:border-ink-600 hover:text-ink-100",
                  )}
                >
                  <span className={cn("block truncate font-semibold", compact ? "text-[11px]" : "text-xs")}>{candidate.title}</span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-ink-500">
                    {readyCount}/{totalCount} live
                  </span>
                </button>
              );
            })}
          </div>

          <div className={cn("mt-3 border-t border-ink-800", compact ? "pt-2" : "pt-4")}>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink-100">{section.title}</h3>
                {!compact && <p className="mt-1 text-xs leading-relaxed text-ink-500">{section.description}</p>}
              </div>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                {selectedReady}/{selectedTotal} playable
              </span>
            </div>
            <div className={cn("grid gap-2", compact ? "max-h-44 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 2xl:grid-cols-3")}>
              {section.items.map((entry) => (
                <AlgorithmButton
                  key={entry.title}
                  item={entry}
                  activeExampleId={activeExampleId}
                  compact={compact}
                  onOpenExample={onOpenExample}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
