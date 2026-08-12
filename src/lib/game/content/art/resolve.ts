import { roomArtForOffice, screenRoomArt, MENU_ROOM_ART, type ScreenRoomKey } from "./rooms";

export type RoomView = {
  src: string;
  desk: string;
  label: string;
  objectPosition: string;
};

export function getMenuArt(): string {
  return MENU_ROOM_ART;
}

export function getDeskArt(office: number): string {
  return roomArtForOffice(office).desk;
}

/** World plate for the current office + screen. */
export function getRoomArt(
  office: number,
  screen: ScreenRoomKey | string = "studio",
  year = 1979,
): RoomView {
  const ladder = roomArtForOffice(office);
  const plate = screenRoomArt(screen, office, year);
  return {
    src: plate.src,
    desk: ladder.desk,
    label: plate.label,
    objectPosition: plate.objectPosition,
  };
}
