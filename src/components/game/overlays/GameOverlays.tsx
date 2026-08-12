/**
 * Presentation only. Mutations go through useGame.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AUDIENCES,
  FIELD_LABELS,
  GENRES,
  OFFICE_INFO,
  PLATFORMS,
  RESEARCH,
  REVIEWER_NAMES,
  SIZE_STATS,
  TOPICS,
  getGenre,
  getPlatform,
  getTopic,
} from "@/lib/game/data";
import { isGarageTopic } from "@/lib/game/content/garageSlice";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import { ENGINE_COMPONENTS } from "@/lib/game/content/engines";
import {
  SELECTABLE_MODULES,
  PURPOSE_LABEL,
  ARCH_LABEL,
  SUPPORT_STATE_LABEL,
  type EnginePurpose,
  type ArchitectureStyle,
} from "@/lib/game/engine";
import {
  MENU_ROOM_ART,
  roomArtForOffice as roomArtDefForOffice,
  screenRoomArt,
} from "@/lib/game/content/roomArt";
import { platformArt, platformThumb } from "@/lib/game/content/platformArt";
import { genreIconSrc } from "@/lib/game/content/genreArt";
import { evaluateCombo, formatCash, formatFans, generateGameTitle } from "@/lib/game/simulation";
import { availableSizes, hasSave, useGame } from "@/lib/game/store";
import {
  libraryRows,
  projectPhaseLabel,
  studioOverview,
  stageFieldsForProject,
  explainSales,
  calendarHudLabel,
} from "@/lib/game/viewModels";
import { disciplineProgress, overallProjectProgress } from "@/lib/game/production/bridge";
import {
  PILLAR_LABELS,
  TECH_CATALOG,
  type DifficultyPreset,
  type ProjectPillar,
} from "@/lib/game/research";
import type { AudienceId, DevField, GameSize, GenreId, ScreenId } from "@/lib/game/types";
import { Badge, Button, Input, Modal, SearchField, cnJoin } from "@/components/ui/primitives";
import { GarageLoopFlowchart, ScoringPipelineFlow } from "@/components/game/LoopFlowchart";
import { MarketScreen } from "@/components/game/MarketScreen";
import { SalesChart, salesPointsFromGame } from "@/components/game/SalesChart";
import { CAMPAIGN_CATALOG } from "@/lib/game/commercial/marketing";
import { HARDWARE_TIERS, type HardwareTierId } from "@/lib/game/tycoonLateMarket";
import { DRM_TIERS, type DrmTier } from "@/lib/game/tycoonPiracy";
import {
  MEDIA_DRIVES,
  GPU_PARTS,
  consoleRdCost,
  type MediaDriveId,
  type GpuPartId,
} from "@/lib/game/tycoonRiskAnalytics";
import { getPlatformSpec, platformMarketState, weekToCampaignDay } from "@/lib/game/platforms/lifecycle";
import { SYSTEM_UNLOCKS, describeUnlockRequirements } from "@/lib/game/progression/unlockRegistry";
import { idealPhaseSliders } from "@/lib/game/classicGdt";
import {
  FlaskConical,
  Gamepad2,
  History,
  Pause,
  Play,
  Settings,
  Home,
  FastForward,
  Sparkles,
  Bell,
  Menu,
  Bug,
  Cpu,
  Palette,
  CalendarDays,
  Diamond,
  Users,
  Wallet,
  TrendingUp,
} from "lucide-react";

const BAR_COLORS = ["#e86a4a", "#3aaa6a", "#3aa0d8", "#e8941a", "#9b6ad8", "#4ecb8a"];

function setScreen(id: ScreenId) {
  useGame.getState().setScreen(id);
}

export function NewGameModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const startProject = useGame((s) => s.startProject);
  const unlockedTopics = useGame((s) => s.unlockedTopics);
  const unlockedGenres = useGame((s) => s.unlockedGenres);
  const unlockedPlatforms = useGame((s) => s.unlockedPlatforms);
  const engines = useGame((s) => s.engines);
  const researched = useGame((s) => s.researched);
  const unlocks = useGame((s) => s.unlocks);
  const flags = useGame((s) => s.flags);
  const garageSlice = useGame((s) => s.garageSlice);
  const cash = useGame((s) => s.cash);
  const office = useGame((s) => s.office);
  const staffCount = useGame((s) => s.staff.length);
  const year = useGame((s) => s.year);
  // Unlocked topics always list; Garage catalog is the unlock source, not a second filter that hides research unlocks.
  const topics = TOPICS.filter((t) => unlockedTopics.includes(t.id));
  void garageSlice;
  void isGarageTopic;
  const genres = GENRES.filter((g) => unlockedGenres.includes(g.id));
  const platforms = PLATFORMS.filter((p) => unlockedPlatforms.includes(p.id) && (p.year <= year || p.startUnlocked));
  const sizes = availableSizes(researched, unlocks, { office, staffCount });
  const [topicId, setTopicId] = useState(topics[0]?.id ?? "space");
  const [genreId, setGenreId] = useState<GenreId>((genres[0]?.id as GenreId) ?? "action");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "pc");
  const [audience, setAudience] = useState<AudienceId>("everyone");
  const [size, setSize] = useState<GameSize>("small");
  const [engineId, setEngineId] = useState(engines[0]?.id ?? "basic");
  const [featureIds, setFeatureIds] = useState<string[]>(["basic_2d_v1"]);
  const [title, setTitle] = useState("");
  const [marketing, setMarketing] = useState(0);
  const [pillar, setPillar] = useState<ProjectPillar>("default");
  const [err, setErr] = useState("");
  // Classic GDT path: concept → topic → genre → platform → tech → start
  const [step, setStep] = useState<"concept" | "topic" | "genre" | "platform" | "tech">("concept");
  const [topicQuery, setTopicQuery] = useState("");
  const visibleTopics = topics.filter((topic) =>
    topic.name.toLocaleLowerCase().includes(topicQuery.trim().toLocaleLowerCase()),
  );

  const graphicOptions = ENGINE_COMPONENTS.filter(
    (c) =>
      c.category === "Graphics" &&
      (c.starting || researched.includes(c.id) || researched.includes(c.engineFeature ?? "")),
  );
  const soundOptions = ENGINE_COMPONENTS.filter(
    (c) =>
      c.category === "Sound" &&
      (c.starting || researched.includes(c.id) || researched.includes(c.engineFeature ?? "")),
  );

  useEffect(() => {
    if (modal === "newGame") {
      setTopicId(topics[0]?.id ?? "space");
      setGenreId((genres[0]?.id as GenreId) ?? "action");
      setPlatformId(platforms[0]?.id ?? "pc");
      setEngineId(engines[0]?.id ?? "basic");
      setFeatureIds(["basic_2d_v1"]);
      setSize("small");
      setTitle("");
      setMarketing(0);
      setErr("");
      setStep("concept");
      setTopicQuery("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const featureCost = featureIds.reduce((sum, id) => {
    const c = ENGINE_COMPONENTS.find((x) => x.id === id);
    if (!c || c.starting) return sum;
    return sum + 5000;
  }, 0);
  const cost = SIZE_STATS[size].cost + marketing + featureCost;
  const combo = evaluateCombo({ topicId, genreId, platformId, audience });
  const marketTotal = platforms.reduce((s, p) => s + p.marketSize, 0) || 1;

  const titleByStep: Record<typeof step, string> = {
    concept: "Game Concept",
    topic: "Pick Topic",
    genre: "Pick Genre",
    platform: "Pick Platform",
    tech: "Game Concept",
  };

  const chipBtn = (active: boolean) =>
    cnJoin(
      "min-h-12 rounded-xl border-2 px-3 py-3 text-left text-sm font-bold transition active:scale-[0.98]",
      active
        ? "border-accent bg-accent/15 text-fg shadow-sm"
        : "border-border bg-elevated text-fg hover:border-accent/50",
    );

  const canStart =
    !!topicId &&
    !!genreId &&
    !!platformId &&
    featureIds.length > 0 &&
    cash >= cost;

  return (
    <Modal
      open={modal === "newGame"}
      onClose={() => setModal(null)}
      title={titleByStep[step]}
      description={step === "concept" ? "Name it. Pick topic, genre, and platform. Then start." : undefined}
      wide
      tone="studio"
    >
      {/* ── Concept hub (GDT Game Concept) ── */}
      {step === "concept" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
              Working title
            </label>
            <Input
              value={title}
              placeholder={generateGameTitle(topicId, genreId)}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              className="!border-border-strong !bg-[rgba(8,28,38,0.9)] !text-fg"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-muted">Dev cost</span>
            <span className={cnJoin("font-bold tabular", cash >= cost ? "text-tech" : "text-red-300")}>
              {formatCash(cost)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" className={chipBtn(!!topicId)} onClick={() => setStep("topic")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Topic</div>
              <div>{getTopic(topicId)?.name ?? "Pick Topic"}</div>
            </button>
            <button type="button" className={chipBtn(!!genreId)} onClick={() => setStep("genre")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Genre</div>
              <div className="flex items-center gap-2">
                <img
                  src={genreIconSrc(genreId)}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md object-contain"
                  draggable={false}
                />
                <span>{getGenre(genreId).name}</span>
              </div>
            </button>
            <button type="button" className={chipBtn(!!platformId)} onClick={() => setStep("platform")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Platform</div>
              <div className="flex items-center gap-2">
                {(platformArt(platformId, year) || platformThumb(platformId, year)) && (
                  <img
                    src={platformArt(platformId, year) || platformThumb(platformId, year)}
                    alt=""
                    className="h-8 w-10 shrink-0 rounded-md object-contain bg-panel"
                    draggable={false}
                  />
                )}
                <span>{getPlatform(platformId)?.name ?? "Pick Platform"}</span>
              </div>
            </button>
            {(graphicOptions.length > 1 || soundOptions.length > 0) && (
            <button type="button" className={chipBtn(featureIds.length > 0)} onClick={() => setStep("tech")}>
              <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Tech pack</div>
              <div className="truncate">
                {featureIds
                  .map((id) => ENGINE_COMPONENTS.find((c) => c.id === id)?.name ?? id)
                  .join(" · ")
                  .replace("Basic 2D Graphics V1", "2D Graphics V1") || "Choose graphics"}
              </div>
            </button>
            )}
          </div>

          {(unlocks.audience === "owned" || flags.audience) && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted">Audience</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id as AudienceId)}
                    className={chipBtn(audience === a.id)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-muted">Size</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} type="button" onClick={() => setSize(s)} className={chipBtn(size === s)}>
                    {s} ({formatCash(SIZE_STATS[s].cost)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted">
            Fit {combo.topicGenre}/{combo.platformGenre} · Cash {formatCash(cash)}
          </p>
          <details className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <summary className="cursor-pointer text-center text-[11px] font-bold uppercase tracking-wide text-white/45">
              Advanced · pillar {PILLAR_LABELS[pillar]}
            </summary>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {(Object.keys(PILLAR_LABELS) as ProjectPillar[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={chipBtn(pillar === id)}
                  onClick={() => setPillar(id)}
                >
                  {PILLAR_LABELS[id]}
                </button>
              ))}
            </div>
          </details>
          {err && <p className="text-center text-sm text-red-300">{err}</p>}
          <Button
            size="lg"
            className="w-full"
            disabled={!canStart}
            onClick={() => {
              const msg = startProject({
                title: title || generateGameTitle(topicId, genreId),
                topicId,
                genreId,
                platformId,
                audience,
                size,
                engineId,
                marketingSpend: marketing,
                pillar,
                features: featureIds
                  .map((id) => ENGINE_COMPONENTS.find((c) => c.id === id)?.engineFeature ?? id)
                  .filter(Boolean),
              });
              if (msg) setErr(msg);
            }}
          >
            Start Development
          </Button>
        </div>
      )}

      {/* ── Pick Topic ── */}
      {step === "topic" && (
        <div>
          <button type="button" className="mb-3 text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <SearchField
            value={topicQuery}
            onChange={(event) => setTopicQuery(event.target.value)}
            placeholder="Search topics…"
            aria-label="Search topics"
            className="mb-3"
          />
          <div className="grid grid-cols-2 gap-2">
            {visibleTopics.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopicId(t.id);
                  setStep("concept");
                }}
                className={chipBtn(topicId === t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
          {visibleTopics.length === 0 && (
            <p className="mt-4 text-center text-sm text-muted">No topics found</p>
          )}
        </div>
      )}

      {/* ── Pick Genre ── */}
      {step === "genre" && (
        <div>
          <button type="button" className="mb-3 text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {genres.map((g) => {
              const selected = genreId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setGenreId(g.id as GenreId);
                    setStep("concept");
                  }}
                  className={cnJoin(
                    "flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition",
                    selected
                      ? "border-cyan-300/80 bg-[rgba(20,40,55,0.92)] text-fg shadow-[0_0_16px_rgba(60,220,240,0.25)]"
                      : "border-border bg-paper text-fg hover:border-accent hover:bg-elevated",
                  )}
                >
                  <img
                    src={genreIconSrc(g.id as GenreId)}
                    alt=""
                    className="h-14 w-14 object-contain drop-shadow-md sm:h-16 sm:w-16"
                    draggable={false}
                  />
                  <span className="text-sm font-bold tracking-tight">{g.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pick Platform — product cards (reference glass layout) ── */}
      {step === "platform" && (
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold text-tech"
            onClick={() => setStep("concept")}
          >
            ← Back
          </button>
          <div className="mx-auto flex max-w-md flex-col gap-4">
            {platforms.map((p) => {
              const share = Math.round((p.marketSize / marketTotal) * 1000) / 10;
              const devCost =
                p.id === "pc"
                  ? Math.round(SIZE_STATS[size].cost * 0.35)
                  : Math.max(
                      SIZE_STATS[size].cost,
                      Math.round(SIZE_STATS[size].cost * (0.85 + p.marketSize * 0.35)),
                    );
              const art = platformArt(p.id, year) ?? platformThumb(p.id, year);
              const selected = platformId === p.id;
              const genres: GenreId[] = ["action", "adventure", "rpg", "simulation", "strategy", "casual"];
              const tierMark = (t: string) =>
                t === "great" ? "+++" : t === "good" ? "++" : t === "ok" ? "+" : "·";
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPlatformId(p.id);
                    setStep("concept");
                  }}
                  className={cnJoin(
                    "w-full overflow-hidden rounded-[1.35rem] border text-left transition active:scale-[0.99]",
                    selected
                      ? "border-accent bg-accent/10 shadow-md"
                      : "border-border-strong bg-[rgba(10,36,48,0.82)] hover:border-cyan-300/50",
                  )}
                >
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-b from-white/10 to-transparent px-4 pt-4 sm:h-48">
                    {art ? (
                      <img
                        src={art}
                        alt=""
                        className="max-h-full max-w-[88%] object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
                        draggable={false}
                      />
                    ) : (
                      <div className="text-4xl font-black text-fg/30">{p.short}</div>
                    )}
                  </div>
                  <div className="px-5 pb-5 pt-1">
                    <div className="text-center text-2xl font-black tracking-tight text-fg">
                      {p.short || p.name}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Dev. cost:</span>
                        <span className="font-bold tabular text-cash">{formatCash(devCost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Marketshare:</span>
                        <span className="font-bold tabular text-fg">{share.toFixed(1)} %</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1.5 text-xs text-muted">Genre match:</div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {genres.map((g) => {
                          const fit = p.genreAffinity[g] ?? "ok";
                          const hot = g === genreId;
                          return (
                            <div
                              key={g}
                              className={cnJoin(
                                "flex w-[3.1rem] flex-col items-center gap-0.5 rounded-xl border px-1 py-1.5",
                                hot
                                  ? "border-cyan-300/70 bg-cyan-400/15"
                                  : "border-border bg-panel",
                              )}
                              title={`${getGenre(g).name}: ${fit}`}
                            >
                              <img
                                src={genreIconSrc(g)}
                                alt=""
                                className="h-7 w-7 object-contain"
                                draggable={false}
                              />
                              <span
                                className={cnJoin(
                                  "rounded-md px-1 text-[10px] font-black leading-none",
                                  fit === "great"
                                    ? "bg-emerald-500 text-fg"
                                    : fit === "good"
                                      ? "bg-teal-600 text-fg"
                                      : fit === "ok"
                                        ? "bg-slate-600 text-fg"
                                        : "bg-slate-800 text-muted",
                                )}
                              >
                                {tierMark(fit)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {platforms.length === 0 && (
            <p className="text-center text-sm text-muted">
              No platforms unlocked yet — PC should be day one.
            </p>
          )}
        </div>
      )}

      {/* ── Tech pack (graphics / sound) ── */}
      {step === "tech" && (
        <div className="space-y-4">
          <button type="button" className="text-xs font-bold text-tech underline" onClick={() => setStep("concept")}>
            ← Game Concept
          </button>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Graphics</h3>
              <span className="text-xs font-bold text-warn">+{formatCash(featureCost)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {graphicOptions.map((c) => {
                const on = featureIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      // one graphics pick
                      setFeatureIds((prev) => {
                        const withoutGfx = prev.filter(
                          (id) => ENGINE_COMPONENTS.find((x) => x.id === id)?.category !== "Graphics",
                        );
                        return [...withoutGfx, c.id];
                      });
                    }}
                    className={chipBtn(on)}
                  >
                    <div>{c.name}</div>
                    <div className="mt-1 text-[10px] text-muted">{c.starting ? "Free" : "+$5.0K"}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {soundOptions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Sound</h3>
              <div className="grid grid-cols-2 gap-2">
                {soundOptions.map((c) => {
                  const on = featureIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setFeatureIds((prev) =>
                          on ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        );
                      }}
                      className={chipBtn(on)}
                    >
                      <div>{c.name}</div>
                      <div className="mt-1 text-[10px] text-muted">{c.starting ? "Free" : "+$5.0K"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Button size="lg" className="w-full" onClick={() => setStep("concept")}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}

export function ReviewsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const lastId = useGame((s) => s.lastReviewGameId);
  const selectedId = useGame((s) => s.selectedGameId);
  const games = useGame((s) => s.releasedGames);
  const id = selectedId ?? lastId;
  const g = id ? games.find((x) => x.id === id) : undefined;
  if (!g || modal !== "reviews") return null;
  const avg =
    g.avgReview ??
    (g.reviewScores.length
      ? g.reviewScores.reduce((n, s) => n + (typeof s === "number" ? s : 0), 0) / g.reviewScores.length
      : 0);
  const lead = g.criticReviews?.[0];
  return (
    <Modal open title="" onClose={() => setModal(null)} tone="studio">
      <article className="se-review-sheet">
        <p className="se-review-kicker">{lead?.name ?? REVIEWER_NAMES[0] ?? "Game Informer"}</p>
        <h2>{g.title}</h2>
        <div className="se-review-score">{avg > 10 ? (avg / 10).toFixed(1) : avg.toFixed(1)}</div>
        <blockquote>“{lead?.comment ?? "An ambitious debut."}”</blockquote>
        <ul>
          {g.reviewScores.map((sc, i) => (
            <li key={i}>
              <b>{typeof sc === "number" ? (sc > 10 ? (sc / 10).toFixed(1) : sc.toFixed(1)) : sc}</b>
              <span>{g.criticReviews?.[i]?.name ?? REVIEWER_NAMES[i] ?? `Critic ${i + 1}`}</span>
            </li>
          ))}
        </ul>
        <p className="text-center text-xs text-muted">Sales begin next week.</p>
        <Button className="mt-3 w-full" onClick={() => setModal(null)}>
          Close
        </Button>
      </article>
    </Modal>
  );
}

export function ReportModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const completeReport = useGame((s) => s.completeReport);
  const knowledge = useGame((s) => s.knowledge);
  const selectedGameId = useGame((s) => s.selectedGameId);
  const lastReviewGameId = useGame((s) => s.lastReviewGameId);
  const games = useGame((s) => s.releasedGames);
  if (modal !== "report") return null;
  const gameId =
    selectedGameId ??
    lastReviewGameId ??
    games.find((g) => !g.reportDone)?.id ??
    games[0]?.id ??
    null;
  const game = gameId ? games.find((g) => g.id === gameId) : undefined;
  const entries = knowledge.entries.filter((e) => e.sourceGameId === gameId);
  return (
    <Modal open title={game ? `Report · ${game.title}` : "Game Report"} onClose={() => setModal(null)} tone="studio">
      {!game ? (
        <p className="text-sm text-muted">Pick a shipped title from the Library first.</p>
      ) : !game.reportDone ? (
        <>
          <p className="text-sm text-muted">
            Spend a short post-mortem on <strong>{game.title}</strong> to learn combo and market lessons.
          </p>
          <Button
            className="mt-4 w-full"
            onClick={() => {
              completeReport(game.id);
            }}
          >
            Start report
          </Button>
        </>
      ) : entries.length ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.key} className="rounded-lg border border-border bg-elevated p-3">
              <h3 className="font-bold text-fg">{entry.label}</h3>
              <p className="mt-1 text-sm text-muted">{entry.detail}</p>
            </div>
          ))}
          <Button className="w-full" onClick={() => setModal(null)}>
            Close
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">Report filed for {game.title}. Insights are in your knowledge log.</p>
          <Button className="mt-4 w-full" onClick={() => setModal(null)}>
            Close
          </Button>
        </>
      )}
    </Modal>
  );
}

export function PauseMenu() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const setScreen = useGame((s) => s.setScreen);
  const saveGame = useGame((s) => s.saveGame);
  const returnToMenu = useGame((s) => s.returnToMenu);
  return (
    <Modal open={modal === "pauseMenu"} onClose={() => setModal(null)} title="Paused" tone="studio">
      <div className="space-y-2">
        <Button className="w-full" onClick={() => { saveGame(); setModal(null); }}>
          Save & resume
        </Button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            setModal(null);
            setScreen("settings");
          }}
        >
          Save & backup…
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("loopGuide")}>
          How the loop works
        </Button>
        <Button className="w-full" variant="secondary" onClick={() => setModal("cheats")}>
          Cheats
        </Button>
        <Button className="w-full" variant="ghost" onClick={() => { saveGame(); returnToMenu(); setModal(null); }}>
          Save & exit
        </Button>
      </div>
    </Modal>
  );
}

export function ConfirmMenuModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  return (
    <Modal open={modal === "confirmMenu"} onClose={() => setModal(null)} title="Confirm">
      <Button className="w-full" onClick={() => setModal(null)}>
        OK
      </Button>
    </Modal>
  );
}

export function CheatsModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const applyCheat = useGame((s) => s.applyCheat);
  const settings = useGame((s) => s.settings);
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const office = useGame((s) => s.office);
  const project = useGame((s) => s.currentProject);
  const seed = useGame((s) => s.campaignSeed);
  const year = useGame((s) => s.year);
  const cheatLog = useGame((s) => s.cheatLog);
  const cheatsEnabled = useGame((s) => s.cheatsEnabled);
  const executeCheatCommand = useGame((s) => s.executeCheatCommand);
  const [cheatCmd, setCheatCmd] = useState("");
  const [cheatCmdMsg, setCheatCmdMsg] = useState("");
  const [tab, setTab] = useState<"main" | "dev" | "modes" | "modding">("main");
  const [cashField, setCashField] = useState("");
  const [fansField, setFansField] = useState("");
  const [yearField, setYearField] = useState(String(year));

  const rowBtn = (label: string, cheat: string, arg?: string | number) => (
    <Button
      key={cheat + label}
      size="sm"
      variant="secondary"
      className="min-w-[5.5rem] flex-1"
      onClick={() => applyCheat(cheat, arg)}
    >
      {label}
    </Button>
  );

  const wideBtn = (label: string, cheat: string, arg?: string | number, active?: boolean) => (
    <Button
      key={cheat + label}
      size="sm"
      variant={active ? "primary" : "secondary"}
      className="w-full justify-start text-left"
      onClick={() => applyCheat(cheat, arg)}
    >
      {label}
      {active ? " · ON" : ""}
    </Button>
  );

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "main", label: "Resources" },
    { id: "dev", label: "Dev" },
    { id: "modes", label: "Modes" },
    { id: "modding", label: "Modding" },
  ];

  return (
    <Modal open={modal === "cheats"} onClose={() => setModal(null)} title="CheatMod" wide>
      <p className="text-xs text-muted">
        Inspired by kristof1104's GDT CheatMod — safer than editing saves.
        {cheatsEnabled ? " Campaign marked modified." : ""}
      </p>
      <div className="mt-2 rounded-lg border border-border bg-elevated p-2">
        <p className="mb-1 text-[10px] font-bold uppercase text-muted">EXECUTE_CHEAT</p>
        <div className="flex gap-2">
          <Input
            value={cheatCmd}
            placeholder="/money_boost · /rp_max · /instafans · /bug_wipe"
            onChange={(e) => setCheatCmd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setCheatCmdMsg(executeCheatCommand(cheatCmd) ?? "OK");
                setCheatCmd("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => {
              setCheatCmdMsg(executeCheatCommand(cheatCmd) ?? "OK");
              setCheatCmd("");
            }}
          >
            Run
          </Button>
        </div>
        {cheatCmdMsg && <p className="mt-1 text-[11px] text-muted">{cheatCmdMsg}</p>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
        <span className="tabular rounded-md bg-elevated px-2 py-1 font-semibold text-fg">
          {formatCash(cash)}
        </span>
        <span className="tabular rounded-md bg-elevated px-2 py-1">{formatFans(fans)} fans</span>
        <span className="rounded-md bg-elevated px-2 py-1">
          {OFFICE_INFO[office]?.name ?? `Office ${office}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={cnJoin(
              "min-h-9 rounded-lg px-3 text-xs font-semibold",
              tab === tb.id ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[52dvh] space-y-4 overflow-y-auto pr-1">
        {tab === "main" && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Money</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("1M", "cash_1m")}
                {rowBtn("10M", "cash_10m")}
                {rowBtn("100M", "cash_100m")}
                {rowBtn("1B", "cash_1b")}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rowBtn("+10k", "cash_10k")}
                {rowBtn("+100k", "cash_100k")}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Fans</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("1M", "fans_1m")}
                {rowBtn("10M", "fans_10m")}
                {rowBtn("100M", "fans_100m")}
                {rowBtn("+10k", "fans", 10000)}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Add Hype</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "hype_10")}
                {rowBtn("+50", "hype_50")}
                {rowBtn("+100", "hype_100")}
              </div>
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Research & team</h3>
              {wideBtn("Add Research Points (100)", "rp_100")}
              {wideBtn("Fill open slots · 1337 Dream Team", "dream_team")}
              {wideBtn("Fill open slots · B-Team", "b_team")}
              {wideBtn("Turn founder into 1337 developer", "pro_developer")}
              {wideBtn("Generate random market trend", "random_trend")}
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Progression</h3>
              {wideBtn("Move to final level (HQ + unlocks)", "move_to_final_level")}
              {wideBtn("Office-ready pack (garage gate)", "office_ready")}
              {wideBtn("Add all topics", "add_all_topics")}
              {wideBtn("Unlock large / AAA path", "add_aaa")}
              {wideBtn("Unlock everything", "unlock_all")}
              {wideBtn("Unlock sequels", "sequels")}
            </section>
          </>
        )}

        {tab === "dev" && (
          <>
            <p className="text-xs text-muted">
              {project
                ? `${project.title} · D${Math.round(project.designPoints)} / T${Math.round(project.techPoints)} · bugs ${project.bugs}`
                : "No active project."}
            </p>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Design points</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "design_10")}
                {rowBtn("+100", "design_100")}
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tech points</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn("+10", "tech_10")}
                {rowBtn("+100", "tech_100")}
              </div>
            </section>
            <section className="space-y-1.5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Stage & polish</h3>
              {wideBtn("Finish / boost stage", "finish_stage")}
              {wideBtn("Force release-ready stats", "force_release_ready")}
              {wideBtn("Clear bugs", "bugs")}
              {wideBtn("Add 5 bugs", "add_bugs", 5)}
              {wideBtn("Max points + clean", "max_points")}
              {wideBtn("Finish research job", "finish_research")}
              {wideBtn("Restore staff energy", "energy")}
            </section>
          </>
        )}

        {tab === "modes" && (
          <>
            <p className="text-xs text-muted">Toggle modes stay on until turned off (CheatMod parity).</p>
            <div className="space-y-1.5">
              {wideBtn("Always perfect scores", "perfect_scores", undefined, !!settings.forcePerfectScore)}
              {wideBtn("Force bad scores", "toggle_bad_score", undefined, !!settings.forceBadScore)}
              {wideBtn("No Bugs Mode", "no_bugs_mode", undefined, !!settings.noBugsMode)}
              {wideBtn("Fast Research Mode", "fast_research_mode", undefined, !!settings.fastResearchMode)}
              {wideBtn("Remove staff vacation need", "no_vacation", undefined, !!settings.noVacationMode)}
              {wideBtn("Show all hints (Analyst)", "show_all_hints", undefined, !!settings.showAllHints)}
              {wideBtn("Disable bankruptcy", "no_bankruptcy", undefined, !!settings.disableBankruptcy)}
            </div>
            <section>
              <h3 className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Information mode</h3>
              <div className="flex flex-wrap gap-1.5">
                {rowBtn(settings.infoMode === "classic" ? "Classic ●" : "Classic", "info_classic")}
                {rowBtn(settings.infoMode === "assisted" ? "Assisted ●" : "Assisted", "info_assisted")}
                {rowBtn(settings.infoMode === "analyst" ? "Analyst ●" : "Analyst", "info_analyst")}
              </div>
            </section>
          </>
        )}

        {tab === "modding" && (
          <>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Set absolute values</h3>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="text-[11px] font-semibold uppercase text-muted">Cash</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    placeholder={String(Math.floor(cash))}
                    value={cashField}
                    onChange={(e) => setCashField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => cashField && applyCheat("set_cash", Number(cashField))}>
                  SET
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="text-[11px] font-semibold uppercase text-muted">Fans</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    placeholder={String(Math.floor(fans))}
                    value={fansField}
                    onChange={(e) => setFansField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => fansField && applyCheat("set_fans", Number(fansField))}>
                  SET
                </Button>
              </div>
            </section>
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Move through time</h3>
              <p className="mb-2 text-xs text-subtle">
                Experimental — prefer forward jumps for testing.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem]">
                  <label className="text-[11px] font-semibold uppercase text-muted">Year</label>
                  <Input
                    className="mt-1"
                    inputMode="numeric"
                    value={yearField}
                    onChange={(e) => setYearField(e.target.value.replace(/[^\d]/g, ""))}
                  />
                </div>
                <Button size="sm" onClick={() => yearField && applyCheat("set_year", Number(yearField))}>
                  Move to year
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rowBtn("+1 week", "advance_time", 1)}
                {rowBtn("+1 month", "advance_time", 4)}
                {rowBtn("+12 weeks", "advance_time", 12)}
                {rowBtn("+1 year", "advance_time", 48)}
              </div>
            </section>
            <section className="rounded-xl bg-elevated p-3 text-xs text-muted">
              <p className="font-semibold text-fg">Diagnostics</p>
              <p className="mt-1 tabular">Campaign seed: {seed}</p>
              <p className="tabular">
                perfect={String(!!settings.forcePerfectScore)} · noBugs=
                {String(!!settings.noBugsMode)} · fastRP={String(!!settings.fastResearchMode)}
              </p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => applyCheat("reveal_seed")}>
                Reveal seed toast
              </Button>
              <p className="mt-3 font-semibold text-fg">Cheat log</p>
              <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                {(cheatLog ?? []).slice(0, 14).map((c, i) => (
                  <li key={`${c.week}-${c.action}-${i}`} className="tabular">
                    W{c.week}: {c.action}
                    {c.detail ? ` (${c.detail})` : ""}
                  </li>
                ))}
                {!(cheatLog ?? []).length && <li>None yet</li>}
              </ul>
            </section>
          </>
        )}
      </div>

      <Button className="mt-5 w-full" variant="secondary" onClick={() => setModal(null)}>
        Close
      </Button>
    </Modal>
  );
}

export function EventModal() {
  const modal = useGame((s) => s.modal);
  const pending = useGame((s) => s.pendingEvent);
  const resolveEvent = useGame((s) => s.resolveEvent);
  const open = modal === "event" && !!pending;
  if (!pending) return null;
  const choices = pending.choices ?? [{ label: "Continue", effect: "Dismiss" }];
  // Prefer dismiss-safe first option for soft events (Not now / Pass / Continue)
  return (
    <Modal
      open={open}
      onClose={() => {
        resolveEvent(0);
      }}
      title={pending.title}
    >
      <p className="max-h-[28dvh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-fg sm:max-h-none">
        {pending.body}
      </p>
      <div className="mt-4 flex max-h-[42dvh] flex-col gap-2 overflow-y-auto sm:max-h-none">
        {choices.map((c, i) => (
          <Button
            key={`${c.label}-${i}`}
            className="min-h-12 w-full justify-start px-3 py-3 text-left sm:min-h-11"
            variant={i === 0 ? "secondary" : i === 1 ? "primary" : "secondary"}
            onClick={() => resolveEvent(i)}
          >
            <span className="flex w-full flex-col items-start gap-0.5">
              <span className="text-[15px] font-semibold leading-snug">{c.label}</span>
              {c.effect ? (
                <span className="text-[12px] font-medium leading-snug opacity-80">{c.effect}</span>
              ) : null}
            </span>
          </Button>
        ))}
      </div>
    </Modal>
  );
}

export function LoopGuideModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  return (
    <Modal open={modal === "loopGuide"} onClose={() => setModal(null)} title="The Garage Loop" wide>
      <div className="space-y-4 text-sm text-muted">
        <p>Plan three stages, polish, release, read reviews, then weekly sales. Marketing changes awareness — never quality.</p>
        <GarageLoopFlowchart />
        <ScoringPipelineFlow />
      </div>
      <Button className="mt-4 w-full" onClick={() => setModal(null)}>
        Got it
      </Button>
    </Modal>
  );
}

export function NotificationsInbox() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const notes = useGame((s) => s.notifications);
  const markRead = useGame((s) => s.markNotificationsRead);
  const clearAll = useGame((s) => s.dismissNotifications);
  const open = modal === "notifications";

  useEffect(() => {
    if (open) markRead();
  }, [open, markRead, notes.length]);

  return (
    <Modal open={open} onClose={() => setModal(null)} title="Notifications">
      {!notes.length ? (
        <p className="text-sm text-muted">No messages yet.</p>
      ) : (
        <ul className="max-h-[60dvh] space-y-2 overflow-y-auto">
          {notes.map((n) => (
            <li
              key={n.id}
              className={cnJoin(
                "rounded-xl border px-3 py-2.5 text-sm",
                n.tone === "good" && "border-good/25 bg-good/5",
                n.tone === "bad" && "border-bad/25 bg-bad/5",
                n.tone === "warn" && "border-warn/25 bg-warn/5",
                (!n.tone || n.tone === "info") && "border-border bg-elevated",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="leading-snug">{n.text}</p>
                <span className="shrink-0 text-[10px] font-bold uppercase tabular text-subtle">W{n.week}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" variant="secondary" onClick={() => setModal(null)}>
          Close
        </Button>
        {notes.length > 0 && (
          <Button className="flex-1" variant="ghost" onClick={() => { clearAll(); setModal(null); }}>
            Clear all
          </Button>
        )}
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ First office offer (bible §5.4 / §31.1) ═══════════════════════════ */

export function OfficeOfferModal() {
  const modal = useGame((s) => s.modal);
  const setModal = useGame((s) => s.setModal);
  const state = useGame();
  const acceptOfficeOffer = useGame((s) => s.acceptOfficeOffer);
  const deferOfficeOffer = useGame((s) => s.deferOfficeOffer);
  const [err, setErr] = useState<string | null>(null);

  const open = modal === "officeOffer";
  const ov = studioOverview(state);
  const goal = ov.officeGoal;

  if (!open) return null;

  const moveCost = goal?.moveCost ?? 150_000;
  const seatsAfter = goal?.seatsAfter ?? 4;
  const construction = goal?.constructionWeeks ?? 2;
  const overhead = goal?.weeklyOverheadAfter ?? 2_000;
  const cashAfter = state.cash - moveCost;
  const runway = goal?.runway ?? 0;
  const canAccept = goal?.canMove ?? false;

  return (
    <Modal
      open={open}
      onClose={() => setModal(null)}
      title="A real office is possible"
      description="Optional move — stay in the garage as long as you want."
      wide
    >
      <div className="space-y-3 text-sm">
        <p className="text-muted">
          You have proven the garage. Moving unlocks hiring capacity (Checkpoint 2) and a higher burn rate.
          No free staff. Campaign progress is preserved.
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-elevated p-3 text-xs">
          <div>
            <div className="font-bold uppercase tracking-wide text-muted">Now</div>
            <div className="mt-1 font-semibold text-fg">1 HQ seat · Founder Garage</div>
            <div className="text-muted">$0 weekly overhead</div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wide text-muted">After move</div>
            <div className="mt-1 font-semibold text-fg">
              {seatsAfter} HQ seats · First Office
            </div>
            <div className="text-muted">{formatCash(overhead)}/week overhead</div>
          </div>
        </div>

        <ul className="space-y-1 text-xs">
          <li>
            Move cost: <strong>{formatCash(moveCost)}</strong>
          </li>
          <li>
            Construction: <strong>{construction} week(s)</strong>
          </li>
          <li>
            Cash after move:{" "}
            <strong className={cashAfter < 0 ? "text-bad" : ""}>{formatCash(cashAfter)}</strong>
          </li>
          <li>
            Est. runway:{" "}
            <strong>
              {runway >= 500
                ? "stable (ops cash covers burn)"
                : `~${Math.max(0, Math.floor(runway))} weeks`}
            </strong>{" "}
            (need 26)
          </li>
        </ul>

        {goal?.proofs && goal.proofs.length > 0 && (
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
              Proofs
            </div>
            <ul className="space-y-0.5 text-xs">
              {goal.proofs.map((p) => (
                <li key={p.id} className={p.met ? "text-good" : "text-muted"}>
                  {p.met ? "✓" : "○"} {p.label} — {p.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {err && <p className="text-xs font-semibold text-bad">{err}</p>}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button
            className="flex-1"
            disabled={!canAccept}
            onClick={() => {
              const msg = acceptOfficeOffer();
              if (msg) setErr(msg);
              else setErr(null);
            }}
          >
            Accept move
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => {
              deferOfficeOffer();
              setErr(null);
            }}
          >
            Decide later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
