/**
 * Visual garage-phase game loop flowchart (no mermaid dependency).
 */
import { cnJoin } from "@/components/ui/primitives";

type NodeTone = "start" | "player" | "auto" | "decision" | "end" | "knowledge";

const TONE: Record<NodeTone, string> = {
  start: "border-accent bg-accent text-accent-fg",
  player: "border-accent/40 bg-accent/10 text-fg",
  auto: "border-border bg-elevated text-fg",
  decision: "border-warn/50 bg-warn/10 text-fg",
  end: "border-good/40 bg-good/10 text-fg",
  knowledge: "border-research/40 bg-research/10 text-fg",
};

function FlowNode({
  label,
  sub,
  tone = "auto",
  className,
}: {
  label: string;
  sub?: string;
  tone?: NodeTone;
  className?: string;
}) {
  return (
    <div
      className={cnJoin(
        "rounded-[var(--radius-md)] border px-3 py-2 text-center shadow-[var(--shadow-card)]",
        TONE[tone],
        className,
      )}
    >
      <div className="text-sm font-semibold leading-tight">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] opacity-80">{sub}</div>}
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-subtle" aria-hidden>
      <div className="h-4 w-px bg-border-strong" />
      {label && <span className="my-0.5 text-[10px] font-medium uppercase tracking-wide">{label}</span>}
      <svg width="12" height="8" viewBox="0 0 12 8" className="text-border-strong">
        <path d="M1 1 L6 7 L11 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function BranchArrows() {
  return (
    <div className="grid grid-cols-2 gap-3 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
      <div className="flex flex-col items-center">
        <div className="h-3 w-px bg-good/50" />
        <span className="text-good">Release</span>
        <svg width="12" height="8" viewBox="0 0 12 8" className="text-good">
          <path d="M1 1 L6 7 L11 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-3 w-px bg-bad/50" />
        <span className="text-bad">Cancel</span>
        <svg width="12" height="8" viewBox="0 0 12 8" className="text-bad">
          <path d="M1 1 L6 7 L11 1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

/** Main garage development loop — player must confirm every stage. */
export function GarageLoopFlowchart({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cnJoin("mx-auto w-full", compact ? "max-w-sm" : "max-w-md")}>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted">
        <Legend swatch="bg-accent" label="You decide" />
        <Legend swatch="bg-elevated border border-border" label="Sim runs" />
        <Legend swatch="bg-warn/20 border border-warn/40" label="Branch" />
        <Legend swatch="bg-research/15 border border-research/40" label="Knowledge" />
      </div>

      <div className="flex flex-col items-stretch">
        <FlowNode tone="start" label="Campaign" sub="Name studio · seed · start garage" />
        <Arrow />
        <FlowNode tone="player" label="Plan game" sub="Topic · Genre · Platform · Audience*" />
        <Arrow label="Develop" />
        <FlowNode tone="player" label="Stage 1 — Configure" sub="Engine · Gameplay · Story" />
        <Arrow />
        <FlowNode tone="auto" label="Stage 1 — Develop" sub="Work ticks until complete" />
        <Arrow />
        <FlowNode tone="player" label="Stage 2 — Configure" sub="Dialogues · Level Design · AI" />
        <Arrow />
        <FlowNode tone="auto" label="Stage 2 — Develop" />
        <Arrow />
        <FlowNode tone="player" label="Stage 3 — Configure" sub="World · Graphics · Sound" />
        <Arrow />
        <FlowNode tone="auto" label="Stage 3 — Develop" />
        <Arrow />
        <FlowNode tone="player" label="Polish" sub="Fix bugs · decide when ready" />
        <Arrow />
        <FlowNode tone="player" label="Pre-Release" sub="Final title + launch price" />
        <Arrow />
        <FlowNode tone="decision" label="Release or Cancel?" />
        <BranchArrows />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-stretch">
            <FlowNode tone="auto" label="Reviews" sub="≥ release only" />
            <Arrow />
            <FlowNode tone="auto" label="Weekly sales" sub="Long-tail · no forced delist" />
            <Arrow />
            <FlowNode tone="knowledge" label="Game Report" sub="Explainable outcomes" />
          </div>
          <div className="flex flex-col items-stretch">
            <FlowNode tone="auto" label="Project closed" sub="Costs sunk" />
            <Arrow />
            <FlowNode tone="knowledge" label="Knowledge kept" sub="No reroll on cancel" />
            <div className="flex-1" />
          </div>
        </div>
        <Arrow label="Next game" />
        <FlowNode tone="end" label="Persistent knowledge" sub="Feeds better next decisions" />
        <Arrow label="loop" />
        <FlowNode tone="player" label="Plan next game" sub="Same garage home" />
      </div>

      <p className="mt-4 text-center text-[11px] text-muted">
        * Audience unlocks later. Stages never auto-configure. Save/load never rerolls reviews or sales.
      </p>
    </div>
  );
}

/** Scoring pipeline strip (horizontal on desktop). */
export function ScoringPipelineFlow() {
  const steps = [
    { id: "cf", label: "Concept Fit", sub: "Topic · genre · audience · platform" },
    { id: "pd", label: "Production", sub: "Demand · features · scope" },
    { id: "eq", label: "Execution", sub: "Work · balance · bugs" },
    { id: "rv", label: "Reviews", sub: "Critics · expectations" },
    { id: "md", label: "Market", sub: "Awareness · lifecycle" },
    { id: "sl", label: "Sales", sub: "Weekly · long-tail" },
    { id: "kn", label: "Knowledge", sub: "Reports · mastery" },
  ];
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-[640px] items-stretch gap-1">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-1">
            <div className="flex-1 rounded-[var(--radius-md)] border border-border bg-elevated px-2 py-2 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wide text-accent">{i + 1}</div>
              <div className="text-xs font-semibold leading-tight">{s.label}</div>
              <div className="mt-0.5 text-[10px] text-muted">{s.sub}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="shrink-0 text-subtle" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cnJoin("inline-block size-2.5 rounded-sm", swatch)} />
      {label}
    </span>
  );
}
