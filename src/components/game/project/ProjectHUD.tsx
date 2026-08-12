import { GameIcon } from "@/components/ui/GameIcon";
import { genreIconSrc } from "@/lib/game/content/art";
import { getGenre, getPlatform, getTopic } from "@/lib/game/data";
import { isReleaseReady, overallProjectProgress } from "@/lib/game/production/bridge";
import { useGame } from "@/lib/game/store";
import { projectPhaseLabel } from "@/lib/game/viewModels";

/** Level-1 project chip. One CTA. Room stays the stage. */
export function ProjectHUD() {
  const project = useGame((s) => s.currentProject);
  const setScreen = useGame((s) => s.setScreen);
  const setModal = useGame((s) => s.setModal);
  const phase = projectPhaseLabel(project);

  if (!project) {
    return (
      <div className="se-float">
        <button type="button" className="se-cta" onClick={() => setModal("newGame")}>
          Develop a game
        </button>
      </div>
    );
  }

  const topic = getTopic(project.topicId);
  const genre = getGenre(project.genreId);
  const plat = getPlatform(project.platformId);
  const pct = Math.round(overallProjectProgress(project) * 100);
  const bugs = project.bugs ?? 0;
  const ready = isReleaseReady(project);
  const cta = !project
    ? "Develop a game"
    : ready
      ? "Release"
      : phase.needsPlayerInput
        ? phase.primaryAction ?? "Open project"
        : "Open project";

  return (
    <div className="se-float">
      <button type="button" className="se-project-chip" onClick={() => setScreen("develop")}>
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
      <button type="button" className="se-cta" onClick={() => setScreen("develop")}>
        {cta}
      </button>
    </div>
  );
}
