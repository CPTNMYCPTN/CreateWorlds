type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function logWikiError(context: string, error: unknown) {
  if (!error) {
    return;
  }

  const err = error as SupabaseLikeError;

  console.error(`[wiki] ${context}`, JSON.stringify(error, null, 2));
  console.error(`[wiki] ${context} details:`, err.message, err.code, err.details, err.hint);
}
