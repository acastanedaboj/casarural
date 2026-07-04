import { useState, useEffect, useCallback, useRef } from "react";
import { loadState, saveState } from "./storage.js";

/* ============================================================
   EQUIPO GUMEO — Cartel mágico digital
   Finca Buytrón · Montilla · 16–19 julio 2026
   Persistencia: capa intercambiable en src/storage.js
   ============================================================ */

const KEY = "gumeo-app-v1";

const T = {
  bg: "#F3F6F6",
  card: "#FFFFFF",
  ink: "#182B33",
  sub: "#5B707A",
  cobalt: "#1D5FA8",
  cobaltDark: "#144679",
  albero: "#F2B33D",
  alberoDark: "#B77E14",
  vine: "#3E8A50",
  wine: "#8C3A49",
  line: "#E2E8EA",
  done: "#9AB0B9",
};

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const SEED = {
  version: 1,
  people: ["Álvaro", "María"],
  meals: [
    { id: "m1", when: "Jue 16 · noche", title: "BBQ 1", desc: "Alitas, pinchitos, choricitos, ternera, pan y ensalada." },
    { id: "m2", when: "Vie 17 · comida", title: "Boloñesa", desc: "Espaguetis boloñesa con carne picada y ensalada." },
    { id: "m3", when: "Vie 17 · noche", title: "BBQ 2", desc: "Carne + verduras a la plancha + patatas/snacks." },
    { id: "m4", when: "Sáb 18 · noche", title: "Tortillas", desc: "Tortillas de patata/francesas + embutido, queso y picoteo." },
    { id: "m5", when: "Dom 19 · mañana", title: "Desayuno buffet", desc: "Desayuno buffet Gumeo y salida sin drama." },
  ],
  bring: [
    { id: "b1", text: "Aceite 1 L, mermelada, café y cafetera", done: false },
    { id: "b2", text: "12 cervezas Victoria + 2 Lambrusco", done: false },
    { id: "b3", text: "Pavo, queso, almendras y ketchup zero", done: false },
    { id: "b4", text: "Vasos/cubiertos de plástico y sacacorchos", done: false },
  ],
  cats: [
    {
      id: "c1", name: "BBQ + Comidas", emoji: "🍖",
      items: [
        "Alitas de pollo — 3 kg", "Pinchitos — 2,5 kg", "Choricitos — 1,5 kg", "Ternera plancha — 2 kg",
        "Carne picada — 1,7 kg", "Espaguetis — 1,5 kg", "Tomate frito — 6 briks", "Huevos — 4 docenas",
        "Patatas — 5 kg", "Pan — 12 barras + molde", "Lechuga/tomate/pepino — 5 kg",
      ].map((t) => ({ id: uid(), text: t, done: false, who: "" })),
    },
    {
      id: "c2", name: "Desayuno + Peques", emoji: "🥐",
      items: [
        "Leche — 10 L (2 sin lactosa)", "Mantequilla — 2 tarrinas", "Azúcar + cacao/Colacao", "Cereales — 2 cajas",
        "Galletas/bizcochos — 5 paquetes", "Bollería/croissants — 20 uds", "Yogures/cuajadas — 24 uds",
        "Sandías 2 + melones 2", "Plátanos 2 kg + melocotones 2 kg", "Queso extra/lonchas — 2 paquetes",
        "Jamón york extra — 2 paquetes",
      ].map((t) => ({ id: uid(), text: t, done: false, who: "" })),
    },
    {
      id: "c3", name: "Bebidas + Extras", emoji: "🧊",
      items: [
        "Agua — 60 L aprox.", "Refrescos — 18 L surtidos", "Zumos/batidos — 8 L", "Cerveza extra — 48 latas",
        "Hielo — 4 bolsas", "Snacks/patatas — 6 bolsas", "Aceitunas — 3 botes", "Embutido picoteo — 1 kg",
        "Sal, pimienta, vinagre/limón", "Carbón/leña + pastillas si procede",
        "Papel, basura, lavavajillas, estropajo", "Solar + repelente",
      ].map((t) => ({ id: uid(), text: t, done: false, who: "" })),
    },
  ],
};

/* ---------- storage helpers (backend en src/storage.js) ---------- */
const fetchRemote = () => loadState(KEY);

/* ============================================================ */
export default function EquipoGumeo() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("finca");
  const [status, setStatus] = useState("");   // "", "saving", "saved", "error"
  const [editing, setEditing] = useState(null); // {type, catId?, item?} modal state
  const statusTimer = useRef(null);

  /* ---- initial load ---- */
  useEffect(() => {
    (async () => {
      const remote = await fetchRemote();
      if (remote) setData(remote);
      else {
        setData(SEED);
        try { await saveState(KEY, SEED); } catch (e) {}
      }
    })();
  }, []);

  /* ---- refresh when app becomes visible again ---- */
  useEffect(() => {
    const onVis = async () => {
      if (document.visibilityState === "visible") {
        const remote = await fetchRemote();
        if (remote) setData(remote);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /* ---- auto-refresh: sondeo cada 15 s mientras la app está visible ---- */
  useEffect(() => {
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const remote = await fetchRemote();
      if (remote) {
        // Solo re-renderiza si de verdad hay cambios remotos
        setData((prev) => (JSON.stringify(prev) === JSON.stringify(remote) ? prev : remote));
      }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const flashStatus = (s) => {
    setStatus(s);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    if (s === "saved") statusTimer.current = setTimeout(() => setStatus(""), 1500);
  };

  /* ---- read-merge-write mutation: reduces clobbering with 12 users ---- */
  const mutate = useCallback(async (fn) => {
    flashStatus("saving");
    let base = data;
    const remote = await fetchRemote();
    if (remote) base = remote;
    const next = fn(JSON.parse(JSON.stringify(base)));
    setData(next);
    try {
      await saveState(KEY, next);
      flashStatus("saved");
    } catch (e) {
      flashStatus("error");
    }
  }, [data]);

  const refresh = async () => {
    flashStatus("saving");
    const remote = await fetchRemote();
    if (remote) setData(remote);
    flashStatus("saved");
  };

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito', sans-serif", color: T.sub }}>
        <FontLoader />
        Cargando el cartel mágico…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.ink, fontFamily: "'Nunito', 'Segoe UI', sans-serif", paddingBottom: 92 }}>
      <FontLoader />
      <Header status={status} onRefresh={refresh} />

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 0" }}>
        {tab === "finca" && <FincaTab />}
        {tab === "viaje" && <ViajeTab data={data} mutate={mutate} />}
        {tab === "comidas" && <ComidasTab data={data} mutate={mutate} setEditing={setEditing} />}
        {tab === "compra" && <CompraTab data={data} mutate={mutate} setEditing={setEditing} />}
        <footer style={{ textAlign: "center", padding: "28px 20px 10px", color: T.sub, fontSize: 13, fontStyle: "italic" }}>
          «Que falte sueño… pero nunca café, hielo ni pan para mojar»
        </footer>
      </main>

      <TabBar tab={tab} setTab={setTab} />

      {editing && (
        <EditModal
          editing={editing}
          people={data.people}
          onClose={() => setEditing(null)}
          mutate={mutate}
        />
      )}
    </div>
  );
}

/* ============================================================
   HEADER — cartel de feria
   ============================================================ */
function FontLoader() {
  return (
    <style>{`
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { overflow-x: hidden; }
      button { font-family: inherit; }
      input, textarea, select { font-family: inherit; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
    `}</style>
  );
}

function Header({ status, onRefresh }) {
  return (
    <header style={{ background: T.cobalt, borderBottom: `6px solid ${T.albero}`, padding: "18px 16px 14px", position: "relative" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'Titan One', cursive", fontSize: 28, lineHeight: 1, color: "#fff", letterSpacing: 0.5, textShadow: `2px 2px 0 ${T.cobaltDark}` }}>
            EQUIPO GUMEO
          </div>
          <div style={{ color: T.albero, fontWeight: 800, fontSize: 13, marginTop: 4, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Finca Buytrón · 16–19 julio
          </div>
        </div>
        <button
          onClick={onRefresh}
          aria-label="Actualizar datos"
          style={{
            background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)",
            color: "#fff", borderRadius: 12, padding: "8px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            minWidth: 92,
          }}
        >
          {status === "saving" ? "⏳…" : status === "saved" ? "✓ Al día" : status === "error" ? "⚠️ Error" : "🔄 Actualizar"}
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   TAB BAR
   ============================================================ */
const TABS = [
  { id: "finca", label: "La Finca", emoji: "🏡" },
  { id: "viaje", label: "El Viaje", emoji: "📅" },
  { id: "comidas", label: "Comidas", emoji: "🍖" },
  { id: "compra", label: "Compra", emoji: "✅" },
];

function TabBar({ tab, setTab }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: T.card,
      borderTop: `1px solid ${T.line}`, display: "flex", justifyContent: "center",
      boxShadow: "0 -4px 16px rgba(20,50,70,0.08)", zIndex: 40,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 560 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 4px 12px", background: "none", border: "none", cursor: "pointer",
                color: active ? T.cobalt : T.sub, fontWeight: active ? 800 : 600, fontSize: 12,
                borderTop: active ? `3px solid ${T.albero}` : "3px solid transparent",
              }}
            >
              <div style={{ fontSize: 22, lineHeight: 1.2 }}>{t.emoji}</div>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================
   UI atoms
   ============================================================ */
function Card({ children, style }) {
  return (
    <section style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.line}`, padding: 16, marginBottom: 14, boxShadow: "0 2px 6px rgba(20,50,70,0.04)", ...style }}>
      {children}
    </section>
  );
}

function SectionTitle({ emoji, children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span>{children}
      </h2>
      {right}
    </div>
  );
}

/* ============================================================
   TAB 1 — LA FINCA
   ============================================================ */
function FincaTab() {
  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Finca Buytrón, Carretera Córdoba-Málaga N-331 km 43, 14550 Montilla, Córdoba");
  const chips = [
    "🛏️ 8 hab. dobles (16 pax)", "🚿 4 baños + aseos", "🏊 Piscina 64 m²", "🔥 Barbacoa con parrillas",
    "🏓 Ping-pong y baloncesto", "📶 WiFi en toda la casa", "❄️ A/C en dormitorios", "🌳 Finca de 8 ha con viñedo",
  ];
  const condiciones = [
    ["💶 Fianza", "150 € a la llegada, se devuelve tras la salida."],
    ["🗑️ Basura", "No incluida (zona protegida). Contenedores a 3 km, o servicio: 10 € bolsa grande, 6 € mediana, 3 € pequeña."],
    ["🪵 Leña", "Solo incluida para la llegada. Carga extra (~80 kg): 10 €."],
    ["🏖️ Toallas piscina", "Las blancas son solo de baño. Toallas de piscina: 3 €/ud."],
    ["🧹 Mantenimiento", "Piscina y exteriores 2–3 veces/semana, a primera hora. Avisan antes."],
    ["👋 Visitas", "Amigos permitidos avisando antes. Sin pernoctar."],
    ["🐕 Mascotas", "Solo en el exterior de la casa."],
    ["🎉 BBQ / celebración", "Recomiendan llevar carbón. Confirmar con la casa antes de comprarlo."],
  ];
  return (
    <>
      <Card style={{ background: T.cobalt, color: "#fff", border: "none" }}>
        <div style={{ fontFamily: "'Titan One', cursive", fontSize: 20, marginBottom: 6 }}>Finca Buytrón</div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.92)" }}>
          Cortijo histórico del siglo XVI entre viñedos ecológicos de Pedro Ximénez, en plena campiña de Montilla
          (la «Toscana cordobesa»). Noria romana, olmos centenarios, piscina cercada y barbacoa. A 3 km de Montilla
          y ~30 km de Córdoba.
        </p>
        <a href={mapsUrl} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", marginTop: 12, background: T.albero, color: T.ink, fontWeight: 800, borderRadius: 12, padding: "12px 16px", textDecoration: "none", fontSize: 15 }}>
          📍 Abrir en Google Maps
        </a>
      </Card>

      <Card>
        <SectionTitle emoji="✨">Qué hay en la casa</SectionTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map((c) => (
            <span key={c} style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>{c}</span>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle emoji="📋">Condiciones que conviene saber</SectionTitle>
        <div>
          {condiciones.map(([k, v]) => (
            <div key={k} style={{ padding: "9px 0", borderBottom: `1px solid ${T.line}`, fontSize: 14, lineHeight: 1.45 }}>
              <strong style={{ display: "block", marginBottom: 2 }}>{k}</strong>
              <span style={{ color: T.sub }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle emoji="📞">Contacto</SectionTitle>
        <div style={{ fontSize: 14, lineHeight: 1.7 }}>
          <div><strong>Enrique Borrajo / Rocío Márquez</strong></div>
          <div>Ctra. Córdoba–Málaga, N-331 km 43 · 14550 Montilla (Córdoba)</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <a href="tel:+34630768877" style={btnLink(T.vine)}>📱 630 768 877</a>
            <a href="https://www.fincabuytron.com" target="_blank" rel="noreferrer" style={btnLink(T.cobalt)}>🌐 fincabuytron.com</a>
          </div>
        </div>
      </Card>
    </>
  );
}

const btnLink = (bg) => ({
  background: bg, color: "#fff", textDecoration: "none", fontWeight: 800,
  borderRadius: 12, padding: "10px 14px", fontSize: 14,
});

/* ============================================================
   TAB 2 — EL VIAJE
   ============================================================ */
function ViajeTab({ data, mutate }) {
  const [newPerson, setNewPerson] = useState("");
  const start = new Date(2026, 6, 16); // 16 julio 2026
  const now = new Date();
  const days = Math.ceil((start - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);

  const addPerson = () => {
    const name = newPerson.trim();
    if (!name) return;
    mutate((d) => {
      if (!d.people.includes(name)) d.people.push(name);
      return d;
    });
    setNewPerson("");
  };

  const removePerson = (name) => {
    mutate((d) => {
      d.people = d.people.filter((p) => p !== name);
      d.cats.forEach((c) => c.items.forEach((i) => { if (i.who === name) i.who = ""; }));
      return d;
    });
  };

  return (
    <>
      <Card style={{ textAlign: "center", background: T.albero, border: "none" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: T.alberoDark }}>Cuenta atrás</div>
        <div style={{ fontFamily: "'Titan One', cursive", fontSize: 52, lineHeight: 1.1, color: T.ink }}>
          {days > 0 ? days : days === 0 ? "¡HOY!" : "🏖️"}
        </div>
        <div style={{ fontWeight: 800, fontSize: 15 }}>
          {days > 1 ? "días para la aventura" : days === 1 ? "día para la aventura" : days === 0 ? "Nos vamos a la finca" : "¡Ya estamos de vuelta (o allí)!"}
        </div>
        <div style={{ marginTop: 8, fontSize: 14, color: T.alberoDark, fontWeight: 700 }}>
          Jueves 16 → Domingo 19 de julio · 11 adultos + 4 peques
        </div>
      </Card>

      <Card>
        <SectionTitle emoji="👥">El equipo</SectionTitle>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: T.sub }}>
          Añade aquí a la gente para poder asignarles cosas de la compra.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {data.people.map((p) => (
            <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.bg, border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 8px 7px 12px", fontSize: 14, fontWeight: 700 }}>
              {p}
              <button onClick={() => removePerson(p)} aria-label={`Quitar a ${p}`}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.sub, fontSize: 15, padding: "0 4px" }}>✕</button>
            </span>
          ))}
          {data.people.length === 0 && <span style={{ fontSize: 13, color: T.sub }}>Nadie todavía…</span>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            placeholder="Nombre (ej. Tita Loli)"
            style={inputStyle}
          />
          <button onClick={addPerson} style={addBtnStyle}>Añadir</button>
        </div>
      </Card>

      <Card>
        <SectionTitle emoji="📜">Mini normas Gumeo</SectionTitle>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
          <li>Antes de comprar carbón: <strong>confirmar BBQ con la casa</strong>.</li>
          <li>Basura: la gestión no está incluida — decidir si la llevamos (contenedores a 3 km) o pedimos el servicio.</li>
          <li>Toallas blancas solo para el baño; para la piscina, las nuestras o alquilar (3 €).</li>
          <li>Salida el domingo <strong>«sin drama»</strong>: desayuno buffet y a recoger entre todos.</li>
        </ul>
      </Card>
    </>
  );
}

const inputStyle = {
  flex: 1, border: `2px solid ${T.line}`, borderRadius: 12, padding: "11px 12px",
  // 16px mínimo: con menos, iOS Safari hace zoom al enfocar el campo
  // y deja la página con scroll lateral.
  fontSize: 16, outline: "none", background: "#fff", color: T.ink, minWidth: 0,
};
const addBtnStyle = {
  background: T.cobalt, color: "#fff", border: "none", borderRadius: 12,
  padding: "11px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer", flexShrink: 0,
};

/* ============================================================
   TAB 3 — COMIDAS
   ============================================================ */
function ComidasTab({ data, mutate, setEditing }) {
  const addMeal = () => setEditing({ type: "meal", meal: { id: uid(), when: "", title: "", desc: "" }, isNew: true });
  return (
    <>
      <Card>
        <SectionTitle emoji="🍖" right={
          <button onClick={addMeal} style={{ ...addBtnStyle, padding: "8px 12px" }}>+ Comida</button>
        }>Plan de comidas «modo aventura»</SectionTitle>
        <p style={{ margin: "0 0 4px", fontSize: 13, color: T.sub }}>Toca una comida para editarla.</p>
      </Card>
      {data.meals.map((m, idx) => (
        <button
          key={m.id}
          onClick={() => setEditing({ type: "meal", meal: m })}
          style={{
            display: "block", width: "100%", textAlign: "left", background: T.card, cursor: "pointer",
            border: `1px solid ${T.line}`, borderLeft: `6px solid ${[T.wine, T.vine, T.wine, T.albero, T.cobalt][idx % 5]}`,
            borderRadius: 16, padding: "14px 16px", marginBottom: 12, boxShadow: "0 2px 6px rgba(20,50,70,0.04)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: T.sub }}>{m.when || "Sin fecha"}</div>
          <div style={{ fontSize: 18, fontWeight: 800, margin: "3px 0", color: T.ink }}>{m.title || "Sin título"}</div>
          <div style={{ fontSize: 14, color: T.sub, lineHeight: 1.5 }}>{m.desc}</div>
        </button>
      ))}
    </>
  );
}

/* ============================================================
   TAB 4 — COMPRA (checklists + ya llevamos)
   ============================================================ */
function CompraTab({ data, mutate, setEditing }) {
  return (
    <>
      <BringCard data={data} mutate={mutate} />
      {data.cats.map((cat) => (
        <CategoryCard key={cat.id} cat={cat} data={data} mutate={mutate} setEditing={setEditing} />
      ))}
    </>
  );
}

function ProgressBar({ done, total, color }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ flex: 1, height: 8, background: T.bg, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width .3s" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, whiteSpace: "nowrap" }}>{done}/{total}</span>
    </div>
  );
}

function BringCard({ data, mutate }) {
  const [txt, setTxt] = useState("");
  const done = data.bring.filter((b) => b.done).length;

  const add = () => {
    const t = txt.trim();
    if (!t) return;
    mutate((d) => { d.bring.push({ id: uid(), text: t, done: false }); return d; });
    setTxt("");
  };

  return (
    <Card>
      <SectionTitle emoji="🎒">Ya llevamos</SectionTitle>
      <ProgressBar done={done} total={data.bring.length} color={T.vine} />
      {data.bring.map((b) => (
        <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
          <Checkbox checked={b.done} onToggle={() =>
            mutate((d) => { const x = d.bring.find((i) => i.id === b.id); if (x) x.done = !x.done; return d; })
          } />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: b.done ? T.done : T.ink, textDecoration: b.done ? "line-through" : "none" }}>
            {b.text}
          </span>
          <button
            onClick={() => mutate((d) => { d.bring = d.bring.filter((i) => i.id !== b.id); return d; })}
            aria-label="Eliminar" style={{ background: "none", border: "none", color: T.sub, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Añadir algo que llevamos…" style={inputStyle} />
        <button onClick={add} style={addBtnStyle}>+</button>
      </div>
    </Card>
  );
}

function CategoryCard({ cat, data, mutate, setEditing }) {
  const [txt, setTxt] = useState("");
  const done = cat.items.filter((i) => i.done).length;
  const colors = { c1: T.wine, c2: T.albero, c3: T.cobalt };
  const color = colors[cat.id] || T.vine;

  const add = () => {
    const t = txt.trim();
    if (!t) return;
    mutate((d) => {
      const c = d.cats.find((x) => x.id === cat.id);
      if (c) c.items.push({ id: uid(), text: t, done: false, who: "" });
      return d;
    });
    setTxt("");
  };

  return (
    <Card>
      <SectionTitle emoji={cat.emoji}>{cat.name}</SectionTitle>
      <ProgressBar done={done} total={cat.items.length} color={color} />
      {cat.items.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.line}` }}>
          <Checkbox checked={item.done} onToggle={() =>
            mutate((d) => {
              const c = d.cats.find((x) => x.id === cat.id);
              const it = c && c.items.find((i) => i.id === item.id);
              if (it) it.done = !it.done;
              return d;
            })
          } />
          <button
            onClick={() => setEditing({ type: "item", catId: cat.id, item })}
            style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0 }}
          >
            <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: item.done ? T.done : T.ink, textDecoration: item.done ? "line-through" : "none", lineHeight: 1.35 }}>
              {item.text}
            </span>
          </button>
          <button
            onClick={() => setEditing({ type: "item", catId: cat.id, item })}
            style={{
              flexShrink: 0, border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 10px",
              fontSize: 12, fontWeight: 800,
              background: item.who ? color : T.bg, color: item.who ? "#fff" : T.sub,
            }}
          >
            {item.who || "¿quién?"}
          </button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={`Añadir a ${cat.name}…`} style={inputStyle} />
        <button onClick={add} style={addBtnStyle}>+</button>
      </div>
    </Card>
  );
}

function Checkbox({ checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={checked ? "Marcar como pendiente" : "Marcar como comprado"}
      style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0, cursor: "pointer",
        border: checked ? `2px solid ${T.vine}` : `2px solid ${T.line}`,
        background: checked ? T.vine : "#fff", color: "#fff", fontSize: 16, fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {checked ? "✓" : ""}
    </button>
  );
}

/* ============================================================
   EDIT MODAL (items & meals)
   ============================================================ */
function EditModal({ editing, people, onClose, mutate }) {
  const isItem = editing.type === "item";
  const [text, setText] = useState(isItem ? editing.item.text : editing.meal.title);
  const [desc, setDesc] = useState(isItem ? "" : editing.meal.desc);
  const [when, setWhen] = useState(isItem ? "" : editing.meal.when);
  const [who, setWho] = useState(isItem ? editing.item.who : "");

  const save = () => {
    if (isItem) {
      mutate((d) => {
        const c = d.cats.find((x) => x.id === editing.catId);
        const it = c && c.items.find((i) => i.id === editing.item.id);
        if (it) { it.text = text.trim() || it.text; it.who = who; }
        return d;
      });
    } else {
      mutate((d) => {
        if (editing.isNew) {
          d.meals.push({ id: editing.meal.id, when: when.trim(), title: text.trim() || "Comida", desc: desc.trim() });
        } else {
          const m = d.meals.find((x) => x.id === editing.meal.id);
          if (m) { m.title = text.trim() || m.title; m.desc = desc.trim(); m.when = when.trim(); }
        }
        return d;
      });
    }
    onClose();
  };

  const remove = () => {
    if (isItem) {
      mutate((d) => {
        const c = d.cats.find((x) => x.id === editing.catId);
        if (c) c.items = c.items.filter((i) => i.id !== editing.item.id);
        return d;
      });
    } else if (!editing.isNew) {
      mutate((d) => { d.meals = d.meals.filter((m) => m.id !== editing.meal.id); return d; });
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,30,40,0.55)", zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, padding: "20px 18px", paddingBottom: "calc(26px + env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {isItem ? "Editar artículo" : editing.isNew ? "Nueva comida" : "Editar comida"}
          </h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: T.bg, border: "none", borderRadius: 99, width: 32, height: 32, cursor: "pointer", fontSize: 15, fontWeight: 800, color: T.sub }}>✕</button>
        </div>

        {!isItem && (
          <label style={labelStyle}>
            Cuándo
            <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Ej. Vie 17 · noche" style={{ ...inputStyle, width: "100%" }} />
          </label>
        )}

        <label style={labelStyle}>
          {isItem ? "Artículo" : "Título"}
          <input value={text} onChange={(e) => setText(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </label>

        {!isItem && (
          <label style={labelStyle}>
            Descripción
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} style={{ ...inputStyle, width: "100%", resize: "vertical" }} />
          </label>
        )}

        {isItem && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.sub, marginBottom: 8 }}>Responsable</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <PersonChip label="Nadie" active={who === ""} onClick={() => setWho("")} />
              {people.map((p) => (
                <PersonChip key={p} label={p} active={who === p} onClick={() => setWho(p)} />
              ))}
            </div>
            {people.length === 0 && (
              <div style={{ fontSize: 12, color: T.sub, marginTop: 8 }}>Añade personas en la pestaña «El Viaje» para poder asignar.</div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          {(!editing.isNew) && (
            <button onClick={remove} style={{ background: "#fff", border: `2px solid ${T.wine}`, color: T.wine, borderRadius: 12, padding: "12px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              🗑️ Eliminar
            </button>
          )}
          <button onClick={save} style={{ flex: 1, background: T.cobalt, color: "#fff", border: "none", borderRadius: 12, padding: "12px 14px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? `2px solid ${T.cobalt}` : `2px solid ${T.line}`,
        background: active ? T.cobalt : "#fff", color: active ? "#fff" : T.ink,
        borderRadius: 999, padding: "9px 14px", fontSize: 14, fontWeight: 800, cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 800, color: T.sub, marginBottom: 14 };
