// Prueba la conversación sin WhatsApp: node prueba.js
const { responder } = require("./conversacion");
const estaciones = [
  { id: "taguas-abajo", nombre: "Río de las Taguas (aguas abajo)", lat: -29.3467, lon: -69.9066, estado: "rojo", ultima_lectura: { id: "L-000010", ph: 5.9, ce: 1180, q: 1.5 } },
  { id: "jachal", nombre: "Río Jáchal en San José de Jáchal", lat: -30.2208, lon: -68.7571, estado: "verde", ultima_lectura: { id: "L-000011", ph: 7.9, ce: 1400, q: 6 } },
];
const reclamos = new Map();
const datos = {
  estaciones: async () => estaciones,
  crearReclamo: async (d) => { const tk = { id: "AQ-0001", estado: "Recibido", titulo: (d.chips || []).join(", ") || "Aviso", vence_texto: "15/11", vinculado: "AQ-0000", eventos: [{ quien: "Vecino/a", texto: "Envió el aviso." }] }; reclamos.set(tk.id, tk); return tk; },
  verReclamo: async (id) => reclamos.get(id) || null,
  verificar: async (id) => ({ id, ok: true, lote: 3 }),
};
(async () => {
  let estado;
  const charla = [
    { tipo: "texto", texto: "hola" }, { tipo: "texto", texto: "1" }, { tipo: "texto", texto: "1" },
    { tipo: "texto", texto: "2" }, { tipo: "ubicacion", lat: -30.22, lon: -68.76 }, { tipo: "texto", texto: "1" },
    { tipo: "texto", texto: "El agua bajó amarillenta" }, { tipo: "imagen", imagenId: "123" }, { tipo: "texto", texto: "listo" },
    { tipo: "texto", texto: "3" }, { tipo: "texto", texto: "aq-0001" }, { tipo: "texto", texto: "4" }, { tipo: "texto", texto: "L-000010" },
  ];
  for (const m of charla) {
    const r = await responder(estado, { ...m, de: "549264000000" }, datos);
    estado = r.estado;
    console.log(`\n> ${m.texto ?? `[${m.tipo}]`}`);
    r.respuestas.forEach((x) => console.log(x.replace(/^/gm, "  ")));
  }
})();
