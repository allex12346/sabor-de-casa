/**
 * Manages unique client session ID so cart state is preserved
 * in local database across reloads and mobile visits.
 */

const SESSION_KEY = "sabor_de_casa_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "guest-server-session";
  }

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function resetSessionId(): string {
  if (typeof window === "undefined") return "";
  const newId = "sess_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now();
  localStorage.setItem(SESSION_KEY, newId);
  return newId;
}
