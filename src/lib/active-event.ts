const STORAGE_KEY = "festa-active-event";
export const DEFAULT_EVENT_ID = "11111111-1111-4111-8111-111111111111";

let current: string | null = null;

export function setActiveEvent(id: string | null) {
  current = id;
  if (typeof window !== "undefined" && id) window.localStorage.setItem(STORAGE_KEY, id);
}

export function activeEventId(): string {
  if (current) return current;
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  }
  return DEFAULT_EVENT_ID;
}
