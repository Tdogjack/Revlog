// Point this at a local dev server with EXPO_PUBLIC_API_URL in mobile/.env.
// The www host: revlog.me redirects, and a redirect would drop the sign-in token.
export const SITE_URL = "https://www.revlog.me";
export const API_URL = `${process.env.EXPO_PUBLIC_API_URL ?? SITE_URL}/api/v1`;
