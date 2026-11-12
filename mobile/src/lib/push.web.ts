// The browser preview has no push; these keep the shared screens working.
export type PushStatus = "on" | "denied" | "unavailable";

export async function registerForPush(_options: { ask: boolean }): Promise<PushStatus> {
  return "unavailable";
}

export async function unregisterPush() {}

export async function pushPermission(): Promise<PushStatus> {
  return "unavailable";
}

export function onPushTap(_open: (url: string) => void) {
  return () => {};
}
