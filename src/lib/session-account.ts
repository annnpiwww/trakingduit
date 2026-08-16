export function shouldResetForLocalSignIn(input: {
  currentSupabaseUserId?: string;
  previousLocalAccountKey?: string;
  nextLocalAccountKey: string;
}): boolean {
  return Boolean(
    input.currentSupabaseUserId
      || (input.previousLocalAccountKey && input.previousLocalAccountKey !== input.nextLocalAccountKey),
  );
}

export function shouldResetForSupabaseSignIn(input: {
  currentSupabaseUserId?: string;
  nextSupabaseUserId: string;
  hasExistingProfile: boolean;
}): boolean {
  if (!input.hasExistingProfile) return false;
  return input.currentSupabaseUserId !== input.nextSupabaseUserId;
}
