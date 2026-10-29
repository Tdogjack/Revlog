// Public facts about the site, used in emails and the legal pages.

// SITE_URL overrides; otherwise Vercel's production domain (which becomes the
// custom domain once one is added), then local dev.
export function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

// Where people reach the operator about privacy, terms, or their account.
export const CONTACT_EMAIL = "support@revlog.app";

export const LEGAL_UPDATED = "October 29, 2026";
