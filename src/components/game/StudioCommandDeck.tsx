/**
 * Wireframe command deck — room photo stays the world.
 * Status / project card / four actions / activity. Art from the existing kit.
 */
import { useMemo, useState } from "react";
import { GameIcon } from "@/components/ui/GameIcon";
import { GlassChip, GlassProgress } from "@/components/ui/GlassHud";
import { cnJoin } from "@/components/ui/primitives";
import { genreIconSrc } from "@/lib/game/content/genreArt";
import { platformThumb } from "@/lib/game/content/platformArt";
import { UI_FRAMES } from "@/lib/game/content/uiFrames";
import { getGenre, getPlatform, getTopic } from "@/lib/game/data";
import { isGaragePhaseOne } from "@/lib/game/phaseOne";
import {
  disciplineProgress,
  isReleaseReady,
  overallProjectProgress,
} from "@/lib/game/production/bridge";
import { PROGRESSION_STAGES, normalizeOfficeLevel } from "@/lib/game/progressionStages";
import { formatCash, formatFans } from "@/lib/game/simulation";
import { useGame } from "@/lib/game/store";
import { projectPhaseLabel } from "@/lib/game/viewModels";

export function StudioCommandDeck() {
  const cash = useGame((s) => s.cash);
  const fans = useGame((s) => s.fans);
  const rp = useGame((s) => s.researchPoints);
  const hype = useGame((s) => s.hype);
  const year = useGame((s) => s.year);
  const month = useGame((s) => s.month);
  const week = useGame((s) => s.week);
  const office = useGame((s) => s.office);
  const staff = useGame((s) => s.staff);
  const project = useGame((s) => s.currentProject);
  const notes = useGame((s) => s.notifications);
  const engines = useGame((s) => s.engines);
  const unlockedPlatforms = useGame((s) => s.unlockedPlatforms);
  const setScreen = useGame((s) => s.setScreen);
  const setModal = useGame((s) => s.setModal);
  const [details, setDetails] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const garage = isGaragePhaseOne({ office });
  const phase = projectPhaseLabel(project);
  const ready = !!project && isReleaseReady(project);
  const stage = PROGRESSION_STAGES[normalizeOfficeLevel(office)];
  const payroll = staff.reduce((n, m) => n + (m.salary || 0), 0);
  const burn = stage.rent + payroll;
  const showBurn = week >= 4;

  const techRatio = useMemo(() => {
    if (!project) return 0;
    const rows = disciplineProgress(project);
    const tech = rows.filter((r) => /engine|tech|graphics|ai|sound/i.test(r.field + r.discipline));
    if (tech.length) return tech.reduce((n, r) => n + r.ratio, 0) / tech.length;
    return Math.min(1, (project.techPoints || 0) / 80);
  }, [project]);

  const designRatio = useMemo(() => {
    if (!project) return 0;
    const rows = disciplineProgress(project);
    const des = rows.filter((r) => /story|design|dialogue|world|level|gameplay/i.test(r.field + r.discipline));
    if (des.length) return des.reduce((n, r) => n + r.ratio, 0) / des.length;
    return Math.min(1, (project.designPoints || 0) / 80);
  }, [project]);

  const bugs = project?.bugs ?? 0;
  const topic = project ? getTopic(project.topicId) : null;
  const genre = project ? getGenre(project.genreId) : null;
  const plat = project ? getPlatform(project.platformId) : null;
  const platArt = project ? platformThumb(project.platformId, year) : undefined;
  const recent = [...notes].slice(-5).reverse();
  const equipped = engines[0];

  function onDevelop() {
    setHint(null);
    if (!project) {
      setModal("newGame");
      return;
    }
    setScreen("develop");
  }

  function onShip() {
    if (!project) {
      setHint("Start a game first — Develop.");
      return;
    }
    if (!ready) {
      setHint("Ship unlocks after Phase 3 + polish. Keep developing.");
      return;
    }
    setScreen("develop");
  }

  function onMarket() {
    setHint(null);
    setScreen("market");
  }

  function onStaff() {
    setHint(null);
    if (garage) setDetails(true);
    else setScreen("staff");
  }

  return (
    <div className="se-deck" data-testid="studio-command-deck">
      <div className="se-deck-status">
        <div className="se-stat">
          <GameIcon name="cash" variant="dark" size={18} />
          <div>
            <span className="se-stat-k">Cash</span>
            <strong className={cash < 0 ? "text-[var(--glass-red)]" : undefined}>{formatCash(cash)}</strong>
          </div>
        </div>
        <div className="se-stat">
          <GameIcon name="fans" variant="dark" size={18} />
          <div>
            <span className="se-stat-k">Fans</span>
            <strong>{formatFans(fans)}</strong>
          </div>
        </div>
        <div className="se-stat">
          <GameIcon name="research" variant="dark" size={18} />
          <div>
            <span className="se-stat-k">RP</span>
            <strong>{Math.floor(rp)}</strong>
          </div>
        </div>
        {showBurn && (
          <div className="se-payroll" title="Month-end rent and payroll">
            <span>{payroll > 0 ? "Payroll due" : "Rent due"}</span>
            <strong>{formatCash(burn)}</strong>
          </div>
        )}
      </div>

      <div className="se-deck-meta">
        <GlassChip tone="date">
          <GameIcon name="calendar" variant="dark" size={14} />
          Year {year} · Month {month} · Week {week}
        </GlassChip>
        <GlassChip tone="hype" hot={hype > 20}>
          Hype {Math.round(hype)}
        </GlassChip>
      </div>

      <article
        className="se-project-card"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(10,16,22,0.72), rgba(8,12,16,0.88)), url(${UI_FRAMES.panelDark})` }}
      >
        {project ? (
          <>
            <header className="se-project-head">
              <div className="min-w-0">
                <h2>{project.title}</h2>
                <p>
                  {topic?.name ?? project.topicId} · {genre?.name ?? project.genreId} · {plat?.name ?? project.platformId}
                </p>
              </div>
              <div className="se-project-badges">
                {genre && (
                  <img src={genreIconSrc(genre.id)} alt="" className="se-genre-mark" draggable={false} />
                )}
                {platArt && <img src={platArt} alt="" className="se-plat-mark" draggable={false} />}
                <span className="se-phase-badge">{phase.title}</span>
              </div>
            </header>
            <GlassProgress label="Tech" value={Math.round(techRatio * 100)} tone="tech" icon="engine" />
            <GlassProgress label="Design" value={Math.round(designRatio * 100)} tone="design" icon="star" />
            <div className="se-project-foot">
              {bugs > 0 ? (
                <span className="se-bugs">
                  <GameIcon name="bug" variant="dark" size={14} /> {bugs} bugs open
                </span>
              ) : (
                <span className="se-bugs se-bugs--clear">No open bugs</span>
              )}
              <span className="se-muted">{Math.round(overallProjectProgress(project) * 100)}% pipeline</span>
            </div>
          </>
        ) : (
          <button type="button" className="se-empty-project" onClick={onDevelop}>
            <img src="/art/desk-garage.jpg" alt="" draggable={false} />
            <div>
              <strong>No active project</strong>
              <span>Develop starts a new title at the CRT desk.</span>
            </div>
          </button>
        )}
      </article>

      <div className="se-action-grid" role="group" aria-label="Studio actions">
        <ActionTile icon="play" label="Develop" onClick={onDevelop} />
        <ActionTile icon="star" label="Ship" onClick={onShip} locked={!ready} />
        <ActionTile icon="trend-up" label="Market" onClick={onMarket} />
        <ActionTile icon="staff" label="Staff" onClick={onStaff} />
      </div>
      {hint && <p className="se-hint">{hint}</p>}

      {recent.length > 0 && (
      <section className="se-activity" aria-label="Recent activity">
        <h3>Recent activity</h3>
        <ul>
            {recent.map((n) => (
              <li key={n.id} data-tone={n.tone}>
                <span>{n.text}</span>
              </li>
            ))}
        </ul>
      </section>
      )}

      {details && (
        <div className="se-details" role="dialog" aria-label="Studio details">
          <div className="se-details-head">
            <h3>Studio details</h3>
            <button type="button" onClick={() => setDetails(false)} aria-label="Close">
              <GameIcon name="close" variant="dark" size={16} />
            </button>
          </div>
          <p>
            <GameIcon name="engine" variant="dark" size={14} /> {equipped?.name ?? "Default engine"}
          </p>
          <p>
            <GameIcon name="platform" variant="dark" size={14} /> {unlockedPlatforms.join(", ")}
          </p>
          <p>
            <GameIcon name="staff" variant="dark" size={14} />{" "}
            {garage ? "Solo founder — hiring unlocks at the first office." : `${staff.length} on payroll`}
          </p>
          <button type="button" className="se-details-more" onClick={() => { setDetails(false); setScreen("settings"); }}>
            More…
          </button>
        </div>
      )}
    </div>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  locked,
}: {
  icon: "play" | "star" | "trend-up" | "staff";
  label: string;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button type="button" className={cnJoin("se-action", locked && "is-locked")} onClick={onClick}>
      <GameIcon name={icon} variant="dark" size={22} />
      <span>{label}</span>
    </button>
  );
}
