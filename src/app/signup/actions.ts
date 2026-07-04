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

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(
      `/signup?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  // Email confirmation is disabled in Supabase, so signUp returns a session
  // and the user is signed in immediately. A null session means confirmation
  // got re-enabled — fall back to the old check-your-email flow.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent("Check your email to confirm your account")}&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  redirect(redirectTo);
}
