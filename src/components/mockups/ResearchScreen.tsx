import { FlaskConical, Lock, Radio } from "lucide-react";
import { DockBtn, MockShell, Panel, cnJoin } from "./shared";

const AVAILABLE = [
  {
    name: "Improved 2D Graphics",
    cost: 35,
    cat: "Graphics",
    desc: "Sharper sprites and palettes. Install in a new custom engine to use.",
    state: "researchable",
  },
  {
    name: "Basic Sound Suite",
    cost: 28,
    cat: "Audio",
    desc: "Sample playback and simple music loops for stage 3.",
    state: "researchable",
  },
  {
    name: "Custom Engine Framework",
    cost: 50,
    cat: "Engine",
    desc: "Build named engines and slot researched tech into future projects.",
    state: "researchable",
  },
];

const DISCOVERED = [
  {
    name: "Topic · Military",
    cost: 40,
    cat: "Topics",
    desc: "Unlocked via report insight after Starfall Protocol.",
    state: "discovered",
  },
];

const TEASED = [
  {
    name: "??? Network experiments",
    cost: null,
    cat: "Future",
    desc: "Industry press mentions linked multiplayer prototypes. Too early to pursue.",
    state: "teased",
  },
  {
    name: "??? Medium productions",
    cost: null,
    cat: "Future",
    desc: "Requires office expansion and a second developer before research opens.",
    state: "teased",
  },
];

const OWNED = [
  "Basic Graphics",
  "Basic Sound",
  "Game Tutorials",
  "Topic · Space",
  "Topic · Fantasy",
];

export function ResearchScreen() {
  return (
    <MockShell
      active="research"
      phase="garage"
      label="4 · Research progressive disclosure"
      unlockedNav={["studio", "develop", "games", "research", "finances"]}
      dock={
        <>
          <DockBtn primary>
            <FlaskConical className="size-4" /> Start research
          </DockBtn>
          <DockBtn>Owned tech</DockBtn>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Research lab</h1>
            <p className="text-sm text-muted">
              Only nearby tech is listed. Distant chains stay hidden — not greyed-out
              forever.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-research/40 bg-research/10 px-4 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-research">
              Available RP
            </div>
            <div className="stat-num text-2xl text-research">86</div>
          </div>
        </div>

        <Panel title="Researchable now · 3">
          <div className="grid gap-3 sm:grid-cols-3">
            {AVAILABLE.map((item) => (
              <TechCard key={item.name} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="Recently discovered · 1">
          <div className="grid gap-3 sm:grid-cols-2">
            {DISCOVERED.map((item) => (
              <TechCard key={item.name} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="On the horizon · teased">
          <div className="grid gap-3 sm:grid-cols-2">
            {TEASED.map((item) => (
              <TechCard key={item.name} {...item} />
            ))}
          </div>
        </Panel>

        <Panel title="Owned · collapsible">
          <div className="flex flex-wrap gap-2">
            {OWNED.map((name) => (
              <span
                key={name}
                className="rounded-full border border-good/30 bg-good/10 px-3 py-1 text-xs font-semibold text-good"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-subtle">
            Mastery builds as engines using these features ship games — next version
            reveals only after mastery + era conditions.
          </p>
        </Panel>
      </div>
    </MockShell>
  );
}

function TechCard({
  name,
  cost,
  cat,
  desc,
  state,
}: {
  name: string;
  cost: number | null;
  cat: string;
  desc: string;
  state: string;
}) {
  return (
    <div
      className={cnJoin(
        "rounded-[var(--radius-md)] border p-4",
        state === "researchable" && "border-border bg-elevated",
        state === "discovered" && "border-tech/40 bg-tech/5",
        state === "teased" && "border-dashed border-border-strong bg-surface opacity-90",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">
            {cat}
          </div>
          <div className="text-sm font-bold">{name}</div>
        </div>
        {state === "teased" ? (
          <Lock className="size-4 text-subtle" />
        ) : state === "discovered" ? (
          <Radio className="size-4 text-tech" />
        ) : (
          <span className="text-xs font-bold text-research">{cost} RP</span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted">{desc}</p>
      {state === "researchable" && (
        <button
          type="button"
          className="mt-3 w-full rounded-[var(--radius-sm)] bg-research/20 py-2 text-xs font-bold text-research"
        >
          Research
        </button>
      )}
      {state === "discovered" && (
        <button
          type="button"
          className="mt-3 w-full rounded-[var(--radius-sm)] border border-border py-2 text-xs font-bold text-muted"
        >
          Requirements
        </button>
      )}
    </div>
  );
}
