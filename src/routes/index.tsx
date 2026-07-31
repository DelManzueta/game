import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { GameApp } from "@/components/game/GameApp";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <ClientOnly fallback={<BootScreen />}>
      <GameApp />
    </ClientOnly>
  );
}

function BootScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-bg text-fg">
      <div className="text-center">
        <div className="text-2xl font-semibold tracking-tight">Studio Empire</div>
        <p className="mt-2 text-sm text-muted">Loading studio…</p>
      </div>
    </div>
  );
}
