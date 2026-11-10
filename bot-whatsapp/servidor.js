// Bot de WhatsApp de AquaAbierta usando la API oficial de WhatsApp Cloud (Meta).
// Sin dependencias: Node 18 o más nuevo.
//
// Variables de entorno:
//   WHATSAPP_TOKEN        token de acceso de la app de Meta
//   WHATSAPP_PHONE_ID     id del número de teléfono de WhatsApp Business
//   WHATSAPP_VERIFY_TOKEN palabra secreta que elegís para verificar el webhook
//   WHATSAPP_APP_SECRET   secreto de la app (para comprobar que los mensajes vienen de Meta)
//   AQUA_API_URL          dirección de la API de AquaAbierta (ej.: https://aquaabierta-api.onrender.com)
//   PORT                  puerto (por defecto 3001)

const http = require("node:http");
const crypto = require("node:crypto");
const { responder } = require("./conversacion");

const {
  WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET,
  AQUA_API_URL = "http://localhost:3000", PORT = 3001,
} = process.env;
const GRAPH = "https://graph.facebook.com/v21.0";
const charlas = new Map(); // teléfono -> estado de la charla

// ---- Datos: se leen de la API abierta de AquaAbierta ----
const api = async (path, opts = {}) => {
  const r = await fetch(AQUA_API_URL + path, { ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`API ${r.status} en ${path}`);
  return r.json();
};
const datos = {
  estaciones: async () => (await api("/v1/estaciones")).estaciones,
  crearReclamo: (d) => api("/v1/reclamos", { method: "POST", body: JSON.stringify(d) }),
  verReclamo: (id) => api(`/v1/reclamos/${encodeURIComponent(id)}`),
  verificar: (id) => api(`/v1/verificar/${encodeURIComponent(id)}`),
};

// ---- Enviar un mensaje por WhatsApp ----
async function enviar(a, texto) {
  const r = await fetch(`${GRAPH}/${WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: a, type: "text", text: { body: texto, preview_url: false } }),
  });
  if (!r.ok) console.error("Error al enviar", r.status, await r.text());
}

// ---- Convertir el mensaje de Meta a nuestro formato ----
function leerMensaje(m) {
  if (m.type === "text") return { tipo: "texto", texto: m.text.body, de: m.from };
  if (m.type === "location") return { tipo: "ubicacion", lat: m.location.latitude, lon: m.location.longitude, de: m.from };
  if (m.type === "image") return { tipo: "imagen", imagenId: m.image.id, texto: m.image.caption || "", de: m.from };
  if (m.type === "interactive") return { tipo: "texto", texto: m.interactive?.button_reply?.id || m.interactive?.list_reply?.id || "", de: m.from };
  return { tipo: "texto", texto: "", de: m.from };
}

function firmaValida(cuerpo, firma) {
  if (!WHATSAPP_APP_SECRET) return true; // en pruebas locales
  if (!firma) return false;
  const esperada = "sha256=" + crypto.createHmac("sha256", WHATSAPP_APP_SECRET).update(cuerpo).digest("hex");
  return firma.length === esperada.length && crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  // 1) Meta verifica el webhook con un GET
  if (req.method === "GET" && url.pathname === "/webhook") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === WHATSAPP_VERIFY_TOKEN;
    res.writeHead(ok ? 200 : 403).end(ok ? url.searchParams.get("hub.challenge") : "no");
    return;
  }
  // 2) Mensajes que llegan
  if (req.method === "POST" && url.pathname === "/webhook") {
    let cuerpo = "";
    for await (const c of req) cuerpo += c;
    if (!firmaValida(cuerpo, req.headers["x-hub-signature-256"])) return res.writeHead(401).end();
    res.writeHead(200).end(); // Meta espera respuesta rápida
    try {
      const data = JSON.parse(cuerpo);
      for (const entry of data.entry || [])
        for (const ch of entry.changes || [])
          for (const m of ch.value?.messages || []) {
            const msg = leerMensaje(m);
            const { estado, respuestas } = await responder(charlas.get(msg.de), msg, datos);
            charlas.set(msg.de, estado);
            for (const r of respuestas) await enviar(msg.de, r);
          }
    } catch (e) { console.error(e); }
    return;
  }
  if (url.pathname === "/salud") return res.writeHead(200).end("ok");
  res.writeHead(404).end();
});

server.listen(PORT, () => console.log(`Bot de WhatsApp escuchando en el puerto ${PORT}`));

// Respaldo por Telegram: se activa si existe TELEGRAM_TOKEN (misma conversación y mismos datos)
if (process.env.TELEGRAM_TOKEN) {
  require("./telegram").iniciarTelegram(process.env.TELEGRAM_TOKEN, { ...datos, crearReclamo: (d) => datos.crearReclamo({ ...d, canal: "telegram" }) });
}
module.exports = { enviar };
