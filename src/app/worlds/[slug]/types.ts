import type { SelectedThread } from "./thread-view";

export type WorldThread = SelectedThread & { folder_id: string };

export type WorldFolder = {
  id: string;
  name: string;
  threads: WorldThread[];
};

export type MapHotspotLinkType = "folder" | "thread" | "url";

export type MapHotspot = {
  id: string;
  label: string;
  link_type: MapHotspotLinkType | null;
  link_id: string | null;
  x_percent: number;
  y_percent: number;
};

export type OwnedCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type WorldCharacter = {
  id: string;
  character: OwnedCharacter | null;
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
