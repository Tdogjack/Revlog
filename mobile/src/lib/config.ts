// Point this at a local dev server with EXPO_PUBLIC_API_URL in mobile/.env.
export const SITE_URL = "https://revlog.me";
export const API_URL = `${process.env.EXPO_PUBLIC_API_URL ?? SITE_URL}/api/v1`;
