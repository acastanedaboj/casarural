# Equipo Gumeo 🏡

App web colaborativa para el fin de semana familiar en la casa rural **Finca Buytrón**
(Ctra. Córdoba–Málaga N-331 km 43, Montilla, Córdoba), del **16 al 19 de julio de 2026**.
11 adultos + 4 peques.

Nació como artifact React en una conversación de claude.ai y ahora es un proyecto
Vite + React desplegable.

## Qué hace

4 pestañas (móvil primero, navegación inferior):

1. **La Finca** 🏡 — resumen de la casa, condiciones clave (fianza, basura, leña,
   toallas de piscina…), contacto y enlace a Google Maps.
2. **El Viaje** 📅 — cuenta atrás al 16/07/2026, lista editable de personas del equipo
   y mini normas.
3. **Comidas** 🍖 — plan de comidas editable (tocar para editar), añadir/eliminar.
4. **Compra** ✅ — lista «Ya llevamos» + 3 checklists de Mercadona con check de
   comprado, barras de progreso, edición y asignación de responsable por ítem.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
```

## Persistencia

Toda la persistencia pasa por [`src/storage.js`](src/storage.js) (`loadState`/`saveState`,
una única clave `gumeo-app-v1` con todo el estado en JSON). Elige backend por este orden:

1. **Supabase** (colaborativo, el modo bueno): si existen `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`. Configuración:
   - Ejecutar [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor del proyecto
     (crea la tabla `app_state` con RLS de lectura/escritura pública).
   - Copiar `.env.example` a `.env` y rellenar con los datos de
     *Project Settings → API* (también hay que definirlas en Vercel/Pages al desplegar).
2. `window.storage` si la app corre dentro de un artifact de claude.ai.
3. **localStorage** como último recurso (datos solo de ese dispositivo).

Concurrencia: patrón read-merge-write (relee el estado remoto antes de cada
escritura) + refresco en `visibilitychange` + botón manual «Actualizar».
Última escritura gana a nivel de blob.

## Ideas pendientes

- Pestaña de gastos compartidos.
- Asignación de responsables también en la lista «Ya llevamos».
