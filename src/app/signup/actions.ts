"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  if (password !== confirmPassword) {
    redirect(
      `/signup?error=${encodeURIComponent("Passwords do not match")}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  redirect(
    `/login?message=${encodeURIComponent("Check your email to confirm your account")}&redirectTo=${encodeURIComponent(redirectTo)}`,
  );
}
