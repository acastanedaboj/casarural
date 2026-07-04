/* ============================================================
   Capa de almacenamiento intercambiable.

   La app original vivía en un artifact de claude.ai y usaba
   `window.storage` (compartido entre todos los usuarios). Fuera
   de claude.ai esa API no existe, así que aquí se elige backend:

   1. `window.storage` si existe (compatibilidad con el artifact).
   2. localStorage como fallback (solo este dispositivo).

   Para hacerla colaborativa de verdad (12 usuarios), sustituir
   `loadState`/`saveState` por llamadas a Firebase/Supabase/etc.
   El resto de la app no necesita cambios: solo consume estas
   dos funciones.
   ============================================================ */

const hasArtifactStorage = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

export async function loadState(key) {
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
  const json = JSON.stringify(value);
  if (hasArtifactStorage()) {
    await window.storage.set(key, json, true);
    return;
  }
  localStorage.setItem(key, json);
}
