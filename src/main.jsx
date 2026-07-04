import React from "react";
import { createRoot } from "react-dom/client";
import EquipoGumeo from "./EquipoGumeo.jsx";

// Doble seguro por si el media query display-mode no aplicase:
// navigator.standalone solo existe (true) en PWAs instaladas de iOS.
if (window.navigator.standalone === true) {
  document.documentElement.classList.add("ios-standalone");
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EquipoGumeo />
  </React.StrictMode>
);
