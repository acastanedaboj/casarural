# Equipo Gumeo — App de vacaciones familiares

## Contexto del proyecto

App web colaborativa para un fin de semana familiar (11 adultos + 4 peques, ~12 usuarios)
en la casa rural **Finca Buytrón** (Ctra. Córdoba–Málaga N-331 km 43, Montilla, Córdoba),
del **16 al 19 de julio de 2026**.

Fue diseñada y construida en una conversación de claude.ai como **artifact React**
y después convertida en proyecto **Vite + React** desplegable:

- `src/EquipoGumeo.jsx` — el componente completo de la app.
- `src/storage.js` — capa de persistencia intercambiable (ver abajo).
- `src/main.jsx`, `index.html`, `vite.config.js` — arranque estándar de Vite.

Comandos: `npm install`, `npm run dev`, `npm run build`.

## Qué hace la app

4 pestañas (móvil primero, navegación inferior):

1. **La Finca** 🏡 — resumen de la casa (8 hab. dobles, piscina 64 m², BBQ, ping-pong,
   WiFi), condiciones clave (fianza 150 €, basura no incluida 10/6/3 €, leña extra 10 €,
   toallas piscina 3 €, mantenimiento piscina 2-3 veces/semana), contacto
   (Enrique Borrajo / Rocío Márquez, +34 630 768 877) y enlace a Google Maps.
2. **El Viaje** 📅 — cuenta atrás al 16/07/2026, lista editable de personas del equipo
   (usada para asignaciones), mini normas (confirmar BBQ con la casa antes de comprar carbón).
3. **Comidas** 🍖 — 5 comidas planificadas, editables (tocar para editar), añadir/eliminar.
4. **Compra** ✅ — lista "Ya llevamos" + 3 checklists de Mercadona (BBQ+Comidas,
   Desayuno+Peques, Bebidas+Extras) con: check de comprado, barras de progreso,
   edición de texto, **asignación de responsable por ítem** (chip "¿quién?"),
   añadir/eliminar ítems.

## Decisiones técnicas importantes

- **Persistencia**: toda pasa por `src/storage.js` (`loadState`/`saveState`), con una
  única clave `gumeo-app-v1` que contiene todo el estado en JSON. Si existe
  `window.storage` (artifact de claude.ai) lo usa con `shared: true`; si no, cae a
  **localStorage** (solo ese dispositivo). ⚠️ Para colaboración real fuera de claude.ai
  hay que sustituir esas dos funciones por un backend compartido (Firebase/Supabase…).
  El resto de la app no necesita cambios.
- **Concurrencia**: patrón read-merge-write (relee el estado remoto antes de cada
  escritura) + refresco en `visibilitychange` + botón manual "Actualizar".
  Última escritura gana a nivel de blob.
- Sin dependencias externas salvo React y Google Fonts (Titan One + Nunito).
  Estilos inline (no Tailwind).
- Idioma de la UI: español.

## Estado

- ✅ Convertida a proyecto Vite + React (build y smoke test en navegador OK).
- ✅ Repo en GitHub: [acastanedaboj/casarural](https://github.com/acastanedaboj/casarural).
- ⬜ Elegir y conectar backend compartido (Firebase/Supabase…) en `src/storage.js`.
- ⬜ Desplegar (Vercel, GitHub Pages…).

## Ideas mencionadas pero no implementadas

- Pestaña de gastos compartidos.
- Asignación de responsables también en la lista "Ya llevamos".
