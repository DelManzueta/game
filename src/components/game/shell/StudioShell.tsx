import { useEffect } from "react";
import { DevelopmentDesk } from "@/components/game/project/DevelopmentDesk";
import { ProjectHUD } from "@/components/game/project/ProjectHUD";
import { DepartmentPanel } from "@/components/game/screens/DepartmentPanel";
import { BottomDock } from "@/components/game/shell/BottomDock";
import { TopHUD } from "@/components/game/shell/TopHUD";
import { RoomScene } from "@/components/game/world/RoomScene";
import { useGame } from "@/lib/game/store";
import { projectPhaseLabel } from "@/lib/game/viewModels";

export function StudioShell() {
  const screen = useGame((s) => s.screen);
  const office = useGame((s) => s.office);
  const era =
    office >= 4 ? "empire" : office >= 3 ? "studio" : office >= 2 ? "office" : "garage";
  const project = useGame((s) => s.currentProject);
  const phase = projectPhaseLabel(project);
  const forcePause = phase.needsPlayerInput && !!project;
  const speed = useGame((s) => s.speed);

  useEffect(() => {
    if (forcePause && speed !== 0) useGame.getState().setSpeed(0);
  }, [forcePause, speed]);

  const secondary =
    screen === "games" ||
    screen === "research" ||
    screen === "staff" ||
    screen === "engines" ||
    screen === "platforms" ||
    screen === "finances" ||
    screen === "market" ||
    screen === "settings";

  return (
    <div className="se-app" data-era={era}>
      <TopHUD forcePause={forcePause} />
      <div className="se-stage">
        <RoomScene />
        {screen === "studio" && <ProjectHUD />}
        {screen === "develop" && <DevelopmentDesk />}
        {secondary && <DepartmentPanel />}
      </div>
      <BottomDock />
    </div>
  );
}
