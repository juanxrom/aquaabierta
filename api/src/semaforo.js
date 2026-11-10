// Reglas del semáforo. pH: Código Alimentario Argentino art. 982 (6,5 a 8,5).
// Conductividad y caudal: comparados con lo habitual de cada punto (umbrales provisorios).
const ORDEN = { verde: 0, amarillo: 1, rojo: 2 };
function param(p, v, e) {
  if (v == null) return "verde";
  if (p === "ph") return v >= 6.5 && v <= 8.5 ? "verde" : v >= 6 && v <= 9 ? "amarillo" : "rojo";
  if (p === "ce") { const r = v / e.base.ce; return r < 1.3 ? "verde" : r < 1.6 ? "amarillo" : "rojo"; }
  if (p === "q") return v / e.base.q < 0.5 ? "amarillo" : "verde";
  return "verde";
}
function estacion(r, e) {
  if (!r) return "gris";
  return ["ph", "ce", "q"].map((p) => param(p, r[p], e)).reduce((a, b) => (ORDEN[b] > ORDEN[a] ? b : a), "verde");
}
module.exports = { param, estacion, ORDEN };
