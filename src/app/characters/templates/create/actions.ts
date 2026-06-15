"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { FIELD_TYPES, type TemplateField } from "../../types";

export type CreateTemplateState = {
  error: string | null;
};

export async function createTemplate(
  _prevState: CreateTemplateState,
  formData: FormData,
): Promise<CreateTemplateState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const fieldsRaw = (formData.get("fields") as string) ?? "[]";

  if (!name) {
    return { error: "Template name is required." };
  }

  let rawFields: unknown;
  try {
    rawFields = JSON.parse(fieldsRaw);
  } catch {
    return { error: "Invalid field data." };
  }

  if (!Array.isArray(rawFields)) {
    return { error: "Invalid field data." };
  }

  const fields: TemplateField[] = [];

  for (const field of rawFields) {
    const label = ((field?.label as string) ?? "").trim();
    const type = field?.type as TemplateField["type"];

    if (!label) {
      return { error: "Every field needs a label." };
    }
    if (!FIELD_TYPES.includes(type)) {
      return { error: "Invalid field type." };
    }

    fields.push({
      id: (field?.id as string) ?? crypto.randomUUID(),
      label,
      type,
      required: Boolean(field?.required),
    });
  }

  const { error } = await supabase.from("character_templates").insert({
    owner_id: user.id,
    name,
    description,
    fields,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/characters/create");
}
