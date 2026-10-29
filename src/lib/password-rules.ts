// Shared by the sign-up and reset forms (live checklist) and the server actions.
export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
] as const;

// Returns an error message, or null when the password meets every rule.
export function checkPassword(password: string) {
  if (password.length > 72) return "Use 72 characters or fewer for your password.";
  const missing = PASSWORD_RULES.filter((r) => !r.test(password));
  if (missing.length === 0) return null;
  return `Your password needs: ${missing.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
