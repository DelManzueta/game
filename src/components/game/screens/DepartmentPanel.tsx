import {
  ContractsScreen,
  EnginesScreen,
  FinancesScreen,
  GamesScreen,
  MarketingPanel,
  PlatformsScreen,
  ResearchScreen,
  SettingsScreen,
  StaffScreen,
} from "@/components/game/screens/departmentScreens";
import { MarketScreen } from "@/components/game/MarketScreen";
import { useGame } from "@/lib/game/store";
import type { ReactNode } from "react";

function Film({ children }: { children: ReactNode }) {
  return (
    <div className="se-panel se-panel--film">
      <div className="se-panel-scroll">{children}</div>
    </div>
  );
}

/** Level-2 film over the department room. */
export function DepartmentPanel() {
  const screen = useGame((s) => s.screen);
  return (
    <Film>
      {screen === "games" && <GamesScreen />}
      {screen === "research" && <ResearchScreen />}
      {screen === "staff" && <StaffScreen />}
      {screen === "engines" && <EnginesScreen />}
      {screen === "platforms" && <PlatformsScreen />}
      {screen === "finances" && (
        <div className="space-y-3">
          <ContractsScreen />
          <FinancesScreen />
        </div>
      )}
      {screen === "market" && (
        <div className="space-y-2">
          <MarketingPanel />
          <MarketScreen />
        </div>
      )}
      {screen === "settings" && <SettingsScreen />}
    </Film>
  );
}
