// The single password rule shown on every screen. The server enforces the same rule in
// Nishit-erp-be/src/utils/password.ts — keep the two in step.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter, a number and a symbol.`;
export const PASSWORD_RULE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number and a symbol.`;

/** Returns the rule message when the password doesn't meet it, otherwise null. */
export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_RULE;
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return PASSWORD_RULE;
  return null;
}
