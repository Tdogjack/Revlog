// Shared by the sign-up and username forms and the server actions.
export const USERNAME_HINT = "3 to 20 characters: letters, numbers, and underscores.";

const RESERVED = new Set([
  "admin",
  "administrator",
  "api",
  "community",
  "garage",
  "help",
  "login",
  "mod",
  "moderator",
  "revlog",
  "root",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
]);

export function normalizeUsername(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

// Returns an error message, or null when the username is allowed.
export function checkUsername(username: string) {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return `Usernames are ${USERNAME_HINT.toLowerCase()}`;
  if (/^_|_$/.test(username)) return "Usernames can't start or end with an underscore.";
  if (RESERVED.has(username)) return "That username is reserved. Try another.";
  return null;
}
