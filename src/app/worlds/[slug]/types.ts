import type { SelectedThread } from "./thread-view";

export type WorldThread = SelectedThread & { folder_id: string };

export type WorldFolder = {
  id: string;
  name: string;
  threads: WorldThread[];
};

export type MapHotspotLinkType = "folder" | "thread" | "url";

export type MapHotspotLink = {
  id: string;
  link_type: MapHotspotLinkType;
  link_id: string;
  label: string | null;
};

export type MapHotspot = {
  id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  links: MapHotspotLink[];
};

export type OwnedCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type WorldCharacterEntry = OwnedCharacter & { owner_id: string };

export type WorldCharacter = {
  id: string;
  character: WorldCharacterEntry | null;
};

export type WorldMemberRole = "owner" | "admin" | "member";

export type WorldMember = {
  id: string;
  user_id: string;
  role: WorldMemberRole;
  created_at: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type HeaderStyle = "solid" | "gradient" | "transparent";

export type WorldFontFamily = "default" | "serif" | "mono" | "fantasy";

export type WorldTheme = {
  accentColor: string;
  bgColor: string;
  headerStyle: HeaderStyle;
  fontFamily: WorldFontFamily;
  customCss: string;
};

export type WorldSettings = {
  theme?: Partial<WorldTheme>;
};

export const DEFAULT_WORLD_THEME: WorldTheme = {
  accentColor: "#a78bfa",
  bgColor: "#09090b",
  headerStyle: "gradient",
  fontFamily: "default",
  customCss: "",
};
