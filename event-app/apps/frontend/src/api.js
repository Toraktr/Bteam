const API_BASE = import.meta.env.VITE_API_URL ?? "";
async function api(path, init) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.error ?? `HTTP ${res.status}`);
    return data;
}
export const listEvents = () => api("/api/events");
export const getEvent = (id) => api(`/api/events/${id}`);
export const createEvent = (input) => api("/api/events", { method: "POST", body: JSON.stringify(input) });
export const increaseCapacity = (id, capacity) => api(`/api/events/${id}`, { method: "PATCH", body: JSON.stringify({ capacity }) });
export const answerRsvp = (id, name, status) => api(`/api/events/${id}/rsvps`, { method: "POST", body: JSON.stringify({ name, status }) });
export function formatDT(iso) {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" });
}
/** datetime-local input (YYYY-MM-DDTHH:mm) <-> ISO の変換 */
export function toInputValue(isoOrNow) {
    const d = new Date(isoOrNow);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
