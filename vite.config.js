import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Rutas relativas: la app funciona igual en raíz (local) que bajo
  // /casarural/ en GitHub Pages. Es una SPA sin router, así que es seguro.
  base: "./",
  plugins: [react()],
});
