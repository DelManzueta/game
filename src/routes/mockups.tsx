import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { GarageStudioView } from "@/components/mockups/v2/GarageStudioView";

export const Route = createFileRoute("/mockups")({
  component: () => (
    <ClientOnly fallback={<div className="min-h-[100dvh] bg-[#08090b]" />}>
      <GarageStudioView />
    </ClientOnly>
  ),
});
