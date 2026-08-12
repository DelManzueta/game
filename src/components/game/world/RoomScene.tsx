import { getRoomArt } from "@/lib/game/content/art";
import { useGame } from "@/lib/game/store";

/** Full-bleed world plate. Screen + office pick the still. */
export function RoomScene() {
  const office = useGame((s) => s.office);
  const year = useGame((s) => s.year);
  const screen = useGame((s) => s.screen);
  const art = getRoomArt(office, screen === "develop" ? "studio" : screen, year);

  return (
    <div className="se-room" data-room={art.label}>
      <img
        src={art.src}
        alt=""
        className="se-room-img"
        style={{ objectPosition: art.objectPosition || "center 48%" }}
        draggable={false}
      />
      <div className="se-room-vignette" />
    </div>
  );
}
