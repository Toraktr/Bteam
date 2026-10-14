const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}

export type RsvpStatus = "attend" | "decline" | "maybe";

export interface EventDetail {
  id: string;
  title: string;
  datetime: string;
  capacity: number;
  deadline: string;
  counts: Record<RsvpStatus, number>;
  attendCount: number;
  remaining: number;
  isClosed: boolean;
  rsvps: { name: string; status: RsvpStatus; updatedAt: string }[];
}

export const listEvents = () => api<EventDetail[]>("/api/events");
export const getEvent = (id: string) => api<EventDetail>(`/api/events/${id}`);
export const createEvent = (input: {
  title: string;
  datetime: string;
  capacity: number;
  deadline: string;
}) => api<{ id: string }>("/api/events", { method: "POST", body: JSON.stringify(input) });
export const increaseCapacity = (id: string, capacity: number) =>
  api<EventDetail>(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify({ capacity }) });
export const answerRsvp = (id: string, name: string, status: RsvpStatus) =>
  api(`/api/events/${id}/rsvps`, { method: "POST", body: JSON.stringify({ name, status }) });

export function formatDT(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}

/** datetime-local input (YYYY-MM-DDTHH:mm) <-> ISO の変換 */
export function toInputValue(isoOrNow: string): string {
  const d = new Date(isoOrNow);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
