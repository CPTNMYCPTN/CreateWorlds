export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "url",
  "spotify",
  "youtube",
  "image",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  textarea: "Long text",
  number: "Number",
  url: "Link",
  spotify: "Spotify embed",
  youtube: "YouTube embed",
  image: "Image",
};

export type TemplateField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
};

export type CharacterTemplate = {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
};
