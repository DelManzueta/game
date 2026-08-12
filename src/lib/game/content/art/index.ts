/**
 * Studio Empire art manifest.
 * Raw masters live in /attachments. Runtime assets live in /public/art.
 * UI must import from this module (or the existing typed helpers it re-exports).
 */
export {
  getRoomArt,
  getDeskArt,
  getMenuArt,
  type RoomView,
} from "./resolve";
export {
  roomArtForOffice,
  eraIdForOffice,
  screenRoomArt,
  departmentRoom,
  labRoom,
  MENU_ROOM_ART,
  ROOM_ART_LADDER,
  DEPARTMENT_ROOMS,
  LAB_ART,
  type RoomArtDef,
  type RoomEraId,
  type DepartmentRoomId,
  type ScreenRoomKey,
} from "./rooms";
export { platformArt, platformThumb } from "./platforms";
export { GENRE_ICON, genreIconSrc } from "./genres";
