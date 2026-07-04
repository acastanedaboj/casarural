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
una única clave `gumeo-app-v1` con todo el estado en JSON):

- Dentro de un artifact de claude.ai usa `window.storage` con `shared: true`
  (datos compartidos entre todos los usuarios).
- Fuera (Vercel, GitHub Pages, local) cae a **localStorage**: la app funciona,
  pero los datos son solo de ese dispositivo.

Para hacerla colaborativa de verdad en un despliegue propio, sustituir esas dos
funciones por un backend compartido (Firebase, Supabase…). El resto de la app no
necesita cambios: usa un patrón read-merge-write (relee el estado remoto antes de
cada escritura) + refresco en `visibilitychange` + botón manual «Actualizar».
Última escritura gana a nivel de blob.

## Ideas pendientes

- Pestaña de gastos compartidos.
- Asignación de responsables también en la lista «Ya llevamos».
