/* ============================================================
   Capa de almacenamiento intercambiable.

   Orden de preferencia:

   1. Supabase, si hay VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
      (tabla app_state — ver supabase/schema.sql). Compartido entre
      todos los usuarios: es el modo "de verdad" para el grupo.
   2. `window.storage` si existe (artifact de claude.ai).
   3. localStorage (solo este dispositivo).

   La app solo consume loadState/saveState; el patrón
   read-merge-write y el botón «Actualizar» viven en EquipoGumeo.jsx.
   ============================================================ */

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabase = () => Boolean(SUPA_URL && SUPA_KEY);
const hasArtifactStorage = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const supaHeaders = () => ({
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  "Content-Type": "application/json",
});

export async function loadState(key) {
  if (hasSupabase()) {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: supaHeaders() }
    );
    if (!res.ok) throw new Error(`Supabase load: ${res.status}`);
    const rows = await res.json();
    return rows.length ? rows[0].value : null;
  }

  if (hasArtifactStorage()) {
    try {
      const r = await window.storage.get(key, true);
      if (r && r.value) return JSON.parse(r.value);
    } catch (e) {
      /* la clave aún no existe */
    }
    return null;
  }

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function saveState(key, value) {
  if (hasSupabase()) {
    const res = await fetch(`${SUPA_URL}/rest/v1/app_state`, {
      method: "POST",
      headers: { ...supaHeaders(), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Supabase save: ${res.status}`);
    return;
  }

  const json = JSON.stringify(value);
  if (hasArtifactStorage()) {
    await window.storage.set(key, json, true);
    return;
  }
  localStorage.setItem(key, json);
}
