// Lógica de la conversación del bot de AquaAbierta (sin dependencias).
// Recibe el estado de la charla y el mensaje del vecino, devuelve el nuevo estado y las respuestas.
// La usan el servidor de WhatsApp (servidor.js) y las pruebas (prueba.js).

const MENU =
  "Hola, soy *AquaAbierta* 💧\n" +
  "Te cuento cómo está el agua de los ríos de San Juan.\n\n" +
  "Respondé con un número:\n" +
  "*1* Ver cómo está el agua\n" +
  "*2* Avisar algo raro en el agua\n" +
  "*3* Seguir mi reclamo\n" +
  "*4* Comprobar que un dato es real\n\n" +
  "También podés mandarme tu *ubicación* 📍 y te digo cómo está el punto más cercano.";

const SEMAFORO = { verde: "🟢 Normal", amarillo: "🟡 Atención", rojo: "🔴 Alerta" };
const QUE_VISTE = ["Color raro", "Olor feo", "Espuma", "Peces o animales muertos", "Poca agua", "Otra cosa"];

function distanciaKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fichaEstacion(e) {
  const r = e.ultima_lectura || {};
  let t = `*${e.nombre}*\n${SEMAFORO[e.estado] || "Sin datos"}\n`;
  if (r.ph != null) t += `• pH: ${r.ph} (normal entre 6,5 y 8,5)\n`;
  if (r.ce != null) t += `• Sales: ${r.ce} µS/cm\n`;
  if (r.q != null) t += `• Caudal: ${r.q} m³/s\n`;
  if (e.estado === "rojo") t += "\n⚠️ Hay un valor fuera de lo normal. Por precaución no uses esta agua para tomar ni para los animales.";
  if (e.estado === "amarillo") t += "\nHay un valor que conviene mirar de cerca.";
  if (r.id) t += `\n\nCódigo del dato: ${r.id}`;
  return t;
}

/**
 * @param {object} estado  estado guardado de esta charla ({paso, borrador})
 * @param {object} msg     {tipo:'texto'|'ubicacion'|'imagen', texto, lat, lon, imagenId, de}
 * @param {object} datos   funciones para leer/escribir datos: estaciones(), crearReclamo(d), verReclamo(id), verificar(id)
 * @returns {Promise<{estado:object, respuestas:string[]}>}
 */
async function responder(estado, msg, datos) {
  estado = estado || { paso: "inicio" };
  const txt = (msg.texto || "").trim();
  const t = txt.toLowerCase();
  const out = [];

  if (["menu", "menú", "hola", "inicio", "0", "volver"].includes(t)) {
    return { estado: { paso: "inicio" }, respuestas: [MENU] };
  }

  if (msg.tipo === "ubicacion") {
    const est = await datos.estaciones();
    const cerca = est
      .map((e) => ({ e, d: distanciaKm({ lat: msg.lat, lon: msg.lon }, e) }))
      .sort((a, b) => a.d - b.d)[0];
    if (estado.paso === "aviso_lugar") {
      estado.borrador.est = cerca.e.id;
      estado.paso = "aviso_que";
      out.push(`Anotado: cerca de *${cerca.e.nombre}* (a ${cerca.d.toFixed(1)} km).`);
      out.push(preguntaQueViste());
      return { estado, respuestas: out };
    }
    out.push(`El punto de control más cercano está a ${cerca.d.toFixed(1)} km:\n\n${fichaEstacion(cerca.e)}`);
    out.push("Escribí *menu* para volver.");
    return { estado: { paso: "inicio" }, respuestas: out };
  }

  switch (estado.paso) {
    case "inicio": {
      if (t === "1") {
        const est = await datos.estaciones();
        const lista = est.map((e, i) => `*${i + 1}* ${SEMAFORO[e.estado] || "⚪"} ${e.nombre}`).join("\n");
        return { estado: { paso: "elegir_estacion" }, respuestas: [`Estos son los puntos de control:\n\n${lista}\n\nRespondé con el número para ver el detalle.`] };
      }
      if (t === "2") {
        const est = await datos.estaciones();
        const lista = est.map((e, i) => `*${i + 1}* ${e.nombre}`).join("\n");
        return { estado: { paso: "aviso_lugar", borrador: {} }, respuestas: [`Vamos a cargar tu aviso. ¿Dónde fue?\n\n${lista}\n\nRespondé con el número o mandame tu *ubicación* 📍`] };
      }
      if (t === "3") return { estado: { paso: "seguir" }, respuestas: ["Escribí el número de tu reclamo. Por ejemplo: *AQ-0001*"] };
      if (t === "4") return { estado: { paso: "verificar" }, respuestas: ["Escribí el código del dato que querés comprobar. Por ejemplo: *L-000123*"] };
      return { estado: { paso: "inicio" }, respuestas: [MENU] };
    }
    case "elegir_estacion": {
      const est = await datos.estaciones();
      const e = est[Number(t) - 1];
      if (!e) return { estado, respuestas: ["No encontré ese número. Probá de nuevo o escribí *menu*."] };
      return { estado: { paso: "inicio" }, respuestas: [fichaEstacion(e), "Escribí *menu* para volver."] };
    }
    case "aviso_lugar": {
      const est = await datos.estaciones();
      const e = est[Number(t) - 1];
      if (!e) return { estado, respuestas: ["Respondé con el número del lugar o mandame tu ubicación 📍"] };
      estado.borrador.est = e.id;
      estado.paso = "aviso_que";
      return { estado, respuestas: [preguntaQueViste()] };
    }
    case "aviso_que": {
      const n = Number(t);
      estado.borrador.chips = n >= 1 && n <= QUE_VISTE.length ? [QUE_VISTE[n - 1]] : [];
      if (!estado.borrador.chips.length) estado.borrador.desc = txt;
      estado.paso = "aviso_desc";
      return { estado, respuestas: ["Contame con tus palabras qué viste. Si tenés una *foto*, mandala ahora. Cuando termines escribí *listo*."] };
    }
    case "aviso_desc": {
      if (msg.tipo === "imagen") {
        estado.borrador.fotos = [...(estado.borrador.fotos || []), msg.imagenId];
        return { estado, respuestas: ["📷 Foto recibida. Podés mandar otra o escribir *listo*."] };
      }
      if (t !== "listo") {
        estado.borrador.desc = [estado.borrador.desc, txt].filter(Boolean).join(" ");
        return { estado, respuestas: ["Anotado. Si querés agregar algo más, escribilo. Si no, escribí *listo*."] };
      }
      const tk = await datos.crearReclamo({ ...estado.borrador, canal: "whatsapp", contacto: msg.de });
      let r = `✅ Tu reclamo es el *${tk.id}*.\nLa empresa tiene plazo hasta el *${tk.vence_texto}* para responder por escrito. La autoridad ambiental controla el plazo.`;
      if (tk.vinculado) r += `\n\nTu aviso coincide con una alerta del sensor (${tk.vinculado}). Quedaron unidos.`;
      r += "\n\nTe aviso por acá cuando haya una respuesta. Escribí *menu* para volver.";
      return { estado: { paso: "inicio" }, respuestas: [r] };
    }
    case "seguir": {
      const tk = await datos.verReclamo(txt.toUpperCase());
      if (!tk) return { estado, respuestas: ["No encontré ese reclamo. Revisá el número o escribí *menu*."] };
      const ult = tk.eventos[tk.eventos.length - 1];
      return {
        estado: { paso: "inicio" },
        respuestas: [`*${tk.id}* · ${tk.estado}\n${tk.titulo}\n\nÚltima novedad (${ult.quien}):\n${ult.texto}\n\nEscribí *menu* para volver.`],
      };
    }
    case "verificar": {
      const v = await datos.verificar(txt.toUpperCase());
      if (!v) return { estado, respuestas: ["No encontré ese dato o todavía se está sellando. Probá en unos segundos."] };
      return {
        estado: { paso: "inicio" },
        respuestas: [v.ok ? `✅ El dato *${v.id}* es real. Coincide con el sello del lote #${v.lote}.` : `❌ El dato *${v.id}* no coincide con su sello.`],
      };
    }
    default:
      return { estado: { paso: "inicio" }, respuestas: [MENU] };
  }
}

function preguntaQueViste() {
  return "¿Qué viste?\n\n" + QUE_VISTE.map((q, i) => `*${i + 1}* ${q}`).join("\n") + "\n\nRespondé con el número o escribilo.";
}

module.exports = { responder, MENU, distanciaKm };
