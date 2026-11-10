// Bot de Telegram de AquaAbierta (respaldo del de WhatsApp, misma conversación).
// Se activa solo si existe la variable TELEGRAM_TOKEN (la da @BotFather).
// Usa "long polling": no necesita webhook ni dominio.
const { responder } = require("./conversacion");

const TG = (token, metodo) => `https://api.telegram.org/bot${token}/${metodo}`;
const TECLADO = {
  keyboard: [[{ text: "📍 Mandar mi ubicación", request_location: true }], [{ text: "1" }, { text: "2" }, { text: "3" }, { text: "4" }], [{ text: "menú" }]],
  resize_keyboard: true,
};

function leerMensaje(m) {
  const de = String(m.chat.id);
  if (m.location) return { tipo: "ubicacion", lat: m.location.latitude, lon: m.location.longitude, de };
  if (m.photo) return { tipo: "imagen", imagenId: m.photo[m.photo.length - 1].file_id, texto: m.caption || "", de };
  let texto = m.text || "";
  if (texto === "/start") texto = "hola";
  return { tipo: "texto", texto, de };
}

function iniciarTelegram(token, datos) {
  const charlas = new Map();
  const llamar = async (metodo, cuerpo) => {
    const r = await fetch(TG(token, metodo), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
    return r.json();
  };
  const enviar = async (chat_id, texto) => {
    // Primero con negritas (*texto*); si Telegram no lo acepta, en texto plano.
    const r = await llamar("sendMessage", { chat_id, text: texto, parse_mode: "Markdown", reply_markup: TECLADO });
    if (!r.ok) await llamar("sendMessage", { chat_id, text: texto.replace(/\*/g, ""), reply_markup: TECLADO });
  };
  let desde = 0;
  (async function bucle() {
    for (;;) {
      try {
        const r = await llamar("getUpdates", { offset: desde, timeout: 50, allowed_updates: ["message"] });
        for (const u of r.result || []) {
          desde = u.update_id + 1;
          if (!u.message) continue;
          const msg = leerMensaje(u.message);
          const { estado, respuestas } = await responder(charlas.get(msg.de), msg, datos);
          charlas.set(msg.de, estado);
          for (const t of respuestas) await enviar(msg.de, t);
        }
      } catch (e) {
        console.error("Telegram:", e.message);
        await new Promise((z) => setTimeout(z, 5000));
      }
    }
  })();
  console.log("Bot de Telegram activo");
}

module.exports = { iniciarTelegram, leerMensaje };
