type SupabaseLikeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function logFriendError(context: string, error: unknown) {
  if (!error) {
    return;
  }

  const err = error as SupabaseLikeError;

  console.error(`[friends] ${context}`, JSON.stringify(error, null, 2));
  console.error(`[friends] ${context} details:`, err.message, err.code, err.details, err.hint);
}
