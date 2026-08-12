import { GameIcon } from "@/components/ui/GameIcon";
import { genreIconSrc, getDeskArt } from "@/lib/game/content/art";
import { getGenre, getPlatform, getTopic } from "@/lib/game/data";
import { isReleaseReady, overallProjectProgress } from "@/lib/game/production/bridge";
import { useGame } from "@/lib/game/store";
import { projectPhaseLabel } from "@/lib/game/viewModels";

function primaryCta(opts: {
  hasProject: boolean;
  ready: boolean;
  needsPlayerInput: boolean;
}): string {
  if (!opts.hasProject) return "Start Game";
  if (opts.ready) return "Release";
  if (opts.needsPlayerInput) return "Make Decision";
  return "Open Project";
}

/** Level-1 project chip. One CTA. Room stays the stage. */
export function ProjectHUD() {
  const project = useGame((s) => s.currentProject);
  const office = useGame((s) => s.office);
  const setScreen = useGame((s) => s.setScreen);
  const setModal = useGame((s) => s.setModal);
  const phase = projectPhaseLabel(project);
  const ready = !!project && isReleaseReady(project);
  const cta = primaryCta({
    hasProject: !!project,
    ready,
    needsPlayerInput: phase.needsPlayerInput,
  });

  function open() {
    if (!project) {
      setModal("newGame");
      return;
    }
    setScreen("develop");
  }

  if (!project) {
    return (
      <div className="se-float">
        <button type="button" className="se-project-chip se-project-chip--idle" onClick={open}>
          <img src={getDeskArt(office)} alt="" draggable={false} />
          <div>
            <strong>No active project</strong>
            <span>The desk is idle. Start your next title.</span>
          </div>
        </button>
        <button type="button" className="se-cta" onClick={open}>
          {cta}
        </button>
      </div>
    );
  }

  const topic = getTopic(project.topicId);
  const genre = getGenre(project.genreId);
  const plat = getPlatform(project.platformId);
  const pct = Math.round(overallProjectProgress(project) * 100);
  const bugs = project.bugs ?? 0;

  return (
    <div className="se-float">
      <button type="button" className="se-project-chip" onClick={open}>
        <header>
          <div className="min-w-0">
            <strong>{project.title}</strong>
            <span>
              {genre?.name ?? project.genreId} · {topic?.name ?? project.topicId} · {plat?.name ?? project.platformId}
            </span>
          </div>
          {genre && <img src={genreIconSrc(genre.id)} alt="" draggable={false} />}
        </header>
        <p className="se-project-phase">
          {phase.title}
          <b>{pct}%</b>
        </p>
        <div className="se-project-meter" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </div>
        <footer>
          <span>Design {Math.round(project.designPoints ?? 0)}</span>
          <span>Tech {Math.round(project.techPoints ?? 0)}</span>
          {bugs > 0 && (
            <span className="is-bugs">
              <GameIcon name="bug" variant="dark" size={12} /> {bugs}
            </span>
          )}
        </footer>
      </button>
      <button type="button" className="se-cta" onClick={open}>
        {cta}
      </button>
    </div>
  );
}
