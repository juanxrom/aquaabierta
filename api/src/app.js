// API abierta de AquaAbierta.
const Fastify = require("fastify");
const { abrir } = require("./db");
const { sha, canon, niveles, prueba, recorrer } = require("./merkle");
const semaforo = require("./semaforo");
const ESTACIONES_DEF = require("./estaciones");

const PLAZO_MS = 5 * 24 * 3600 * 1000;

function crearApp({ archivoDb, selladoMs = 10000, ots = true, logger = false } = {}) {
  const app = Fastify({ logger, bodyLimit: 20 * 1024 * 1024 });
  const db = abrir(archivoDb);
  const EST = new Map(ESTACIONES_DEF.map((e) => [e.id, e]));
  const ultima = new Map(); // estación -> última lectura (caché en memoria para respuestas rápidas)
  const clientes = new Set(); // conexiones de tiempo real

  // Contadores de códigos
  let nLect = db.prepare("SELECT COALESCE(MAX(n),0) m FROM lecturas").get().m;
  for (const e of EST.values()) {
    const r = db.prepare("SELECT codigo, est, t, ph, ce, q FROM lecturas WHERE est=? ORDER BY n DESC LIMIT 1").get(e.id);
    if (r) ultima.set(e.id, r);
  }

  const docs = (tabla) => ({
    todos: () => db.prepare(`SELECT doc FROM ${tabla} ORDER BY rowid DESC`).all().map((x) => JSON.parse(x.doc)),
    uno: (id) => { const x = db.prepare(`SELECT doc FROM ${tabla} WHERE id=?`).get(id); return x && JSON.parse(x.doc); },
    guardar: (d) => db.prepare(`INSERT INTO ${tabla}(id,doc) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET doc=excluded.doc`).run(d.id, JSON.stringify(d)),
    cuantos: () => db.prepare(`SELECT COUNT(*) c FROM ${tabla}`).get().c,
  });
  const R = docs("reclamos"), A = docs("analisis");

  const emitir = (tipo, datos) => {
    const m = JSON.stringify({ tipo, datos });
    for (const c of clientes) { try { c.send(m); } catch {} }
  };

  // ---------- Reclamos ----------
  function evento(tk, quien, texto) {
    const prev = tk.eventos.length ? tk.eventos[tk.eventos.length - 1].sello : "0";
    const ev = { t: new Date().toISOString(), quien, texto };
    ev.sello = sha(prev + JSON.stringify(ev));
    tk.eventos.push(ev);
  }
  function nuevoReclamo(d) {
    const id = "AQ-" + String(R.cuantos() + 1).padStart(4, "0");
    const creado = Date.now();
    const tk = {
      id, tipo: d.tipo || "vecino", est: d.est, titulo: d.titulo || (d.chips || []).join(", ") || "Aviso de la comunidad",
      desc: d.desc || "", canal: d.canal || "web", autor: d.autor || "Vecino/a (anónimo)", estado: "Recibido",
      responsable: "Empresa operadora", control: "Autoridad ambiental provincial",
      creado: new Date(creado).toISOString(), vence: new Date(creado + PLAZO_MS).toISOString(),
      vinculos: [], eventos: [], fotos: d.fotos || [], lectura: d.lectura || null,
    };
    evento(tk, tk.autor, tk.tipo === "alerta" ? "Alerta automática del sensor." : "Envió el aviso.");
    const e = EST.get(tk.est);
    if (e) {
      for (const otro of R.todos()) {
        if (otro.estado === "Cerrado" || otro.id === tk.id) continue;
        const o = EST.get(otro.est);
        if (o && o.cuenca === e.cuenca && otro.tipo !== tk.tipo && creado - Date.parse(otro.creado) < 864e5) {
          tk.vinculos.push(otro.id); otro.vinculos.push(tk.id);
          evento(otro, "Sistema AquaAbierta", `Se unió con ${tk.id} (misma cuenca, mismo día).`);
          R.guardar(otro);
        }
      }
      if (tk.vinculos.length) evento(tk, "Sistema AquaAbierta", `Coincide con ${tk.vinculos.join(", ")}. Quedan unidos.`);
    }
    R.guardar(tk);
    emitir("reclamo", tk);
    return tk;
  }

  // ---------- Ingesta de lecturas ----------
  const insertar = db.prepare("INSERT INTO lecturas(codigo,est,t,ph,ce,q,hoja) VALUES(@codigo,@est,@t,@ph,@ce,@q,@hoja)");
  const insertarLote = db.transaction((filas) => { for (const f of filas) insertar.run(f); });

  function ingerir(lecturas) {
    const filas = [];
    const rechazadas = [];
    for (const l of lecturas) {
      if (!EST.has(l.est)) { rechazadas.push({ est: l.est, motivo: "estación desconocida" }); continue; }
      const f = { codigo: "L-" + String(++nLect).padStart(7, "0"), est: l.est, t: l.t || new Date().toISOString(), ph: l.ph ?? null, ce: l.ce ?? null, q: l.q ?? null };
      f.hoja = sha(canon(f));
      filas.push(f);
    }
    insertarLote(filas);
    const cambios = new Map();
    for (const f of filas) { const { hoja, ...r } = f; ultima.set(f.est, r); cambios.set(f.est, r); }
    for (const [id, r] of cambios) {
      const e = EST.get(id);
      if (semaforo.estacion(r, e) === "rojo" && !R.todos().some((t) => t.tipo === "alerta" && t.est === id && t.estado !== "Cerrado")) {
        nuevoReclamo({ tipo: "alerta", est: id, autor: "Sensor automático", lectura: r.codigo,
          titulo: "Alerta automática: valor fuera de lo normal", desc: `El sensor de ${e.nombre} marcó pH ${r.ph} y ${r.ce} µS/cm (lo habitual: ${e.base.ce}).` });
      }
    }
    if (cambios.size) emitir("lecturas", [...cambios.values()]);
    return { filas, rechazadas };
  }

  // ---------- Sellado por lotes + OpenTimestamps ----------
  async function sellar() {
    const filas = db.prepare("SELECT n, hoja FROM lecturas WHERE lote IS NULL ORDER BY n").all();
    if (!filas.length) return null;
    const lv = niveles(filas.map((f) => f.hoja));
    const raiz = lv[lv.length - 1][0];
    const ant = db.prepare("SELECT sello FROM lotes ORDER BY n DESC LIMIT 1").get();
    const previo = ant ? ant.sello : "0".repeat(64);
    const sello = sha(previo + raiz);
    const n = db.transaction(() => {
      const info = db.prepare("INSERT INTO lotes(raiz,previo,sello,t,cant) VALUES(?,?,?,?,?)").run(raiz, previo, sello, new Date().toISOString(), filas.length);
      const up = db.prepare("UPDATE lecturas SET lote=?, idx=? WHERE n=?");
      filas.forEach((f, i) => up.run(info.lastInsertRowid, i, f.n));
      return Number(info.lastInsertRowid);
    })();
    emitir("lote", { n, sello, cant: filas.length });
    if (ots) anclarOTS(n, sello).catch(() => {});
    return n;
  }
  // Envía la huella del sello a un calendario público de OpenTimestamps (anclaje en Bitcoin).
  async function anclarOTS(n, selloHex) {
    const calendarios = ["https://a.pool.opentimestamps.org", "https://b.pool.opentimestamps.org"];
    for (const c of calendarios) {
      try {
        const r = await fetch(c + "/digest", { method: "POST", body: Buffer.from(selloHex, "hex"), headers: { accept: "application/vnd.opentimestamps.v1" }, signal: AbortSignal.timeout(10000) });
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          db.prepare("UPDATE lotes SET ots=?, ots_estado=? WHERE n=?").run(buf, "enviado a OpenTimestamps (" + new URL(c).host + ")", n);
          return;
        }
      } catch {}
    }
    db.prepare("UPDATE lotes SET ots_estado=? WHERE n=?").run("sin conexión con OpenTimestamps, se reintenta", n);
  }
  async function reintentarOTS() {
    for (const l of db.prepare("SELECT n, sello FROM lotes WHERE ots IS NULL ORDER BY n DESC LIMIT 20").all()) await anclarOTS(l.n, l.sello);
  }
  let timer = null, timerOts = null;
  if (selladoMs) {
    timer = setInterval(() => sellar().catch((e) => app.log.error(e)), selladoMs);
    if (ots) timerOts = setInterval(() => reintentarOTS().catch(() => {}), 5 * 60 * 1000);
  }
  app.addHook("onClose", async () => { clearInterval(timer); clearInterval(timerOts); db.close(); });

  function verificar(codigo, alterar) {
    const r = db.prepare("SELECT codigo, est, t, ph, ce, q, hoja, lote, idx FROM lecturas WHERE codigo=?").get(codigo);
    if (!r) return null;
    if (r.lote == null) return { id: codigo, sellado: false };
    const hojas = db.prepare("SELECT hoja FROM lecturas WHERE lote=? ORDER BY idx").all(r.lote).map((x) => x.hoja);
    const lote = db.prepare("SELECT n, raiz, previo, sello, t, ots_estado FROM lotes WHERE n=?").get(r.lote);
    const dato = alterar ? { ...r, ...alterar } : r;
    const hoja = sha(canon(dato));
    const p = prueba(niveles(hojas), r.idx);
    const calculada = recorrer(hoja, p);
    return { id: codigo, sellado: true, ok: calculada === lote.raiz && sha(lote.previo + lote.raiz) === lote.sello, dato: { est: r.est, t: r.t, ph: r.ph, ce: r.ce, q: r.q }, hoja, prueba: p, raiz_calculada: calculada, lote };
  }

  // ---------- Rutas ----------
  app.register(require("@fastify/cors"), { origin: true });
  app.register(require("@fastify/swagger"), {
    openapi: { info: { title: "API abierta de AquaAbierta", version: "0.1.0", description: "Datos del agua de los ríos de San Juan, de uso libre. Lecturas simuladas en el prototipo." } },
  });
  app.register(require("@fastify/swagger-ui"), { routePrefix: "/docs" });
  app.register(require("@fastify/websocket"));

  const lecturaSchema = {
    type: "object", required: ["est"], additionalProperties: false,
    properties: { est: { type: "string", maxLength: 64 }, t: { type: "string", format: "date-time" }, ph: { type: "number", minimum: 0, maximum: 14 }, ce: { type: "number", minimum: 0, maximum: 200000 }, q: { type: "number", minimum: 0, maximum: 100000 } },
  };

  app.register(async (r) => {
    r.get("/v1/estaciones", { schema: { description: "Puntos de control con su estado y última lectura" } }, async () => ({
      actualizado: new Date().toISOString(),
      estaciones: [...EST.values()].map((e) => ({ ...e, estado: semaforo.estacion(ultima.get(e.id), e), ultima_lectura: ultima.get(e.id) || null })),
    }));

    r.get("/v1/lecturas", {
      schema: { description: "Lecturas de un punto, de la más nueva a la más vieja", querystring: { type: "object", properties: { estacion: { type: "string" }, desde: { type: "string" }, hasta: { type: "string" }, limite: { type: "integer", minimum: 1, maximum: 10000, default: 500 } } } },
    }, async (req) => {
      const { estacion, desde = "0000", hasta = "9999", limite } = req.query;
      const filas = estacion
        ? db.prepare("SELECT codigo id, est, t, ph, ce, q, lote FROM lecturas WHERE est=? AND t BETWEEN ? AND ? ORDER BY n DESC LIMIT ?").all(estacion, desde, hasta, limite)
        : db.prepare("SELECT codigo id, est, t, ph, ce, q, lote FROM lecturas WHERE t BETWEEN ? AND ? ORDER BY n DESC LIMIT ?").all(desde, hasta, limite);
      return { cantidad: filas.length, lecturas: filas };
    });

    r.post("/v1/lecturas/lote", {
      schema: { description: "Carga masiva de lecturas de sensores (hasta 50.000 por pedido)", body: { type: "object", required: ["lecturas"], properties: { lecturas: { type: "array", maxItems: 50000, items: lecturaSchema } } } },
    }, async (req, reply) => {
      const t0 = process.hrtime.bigint();
      const { filas, rechazadas } = ingerir(req.body.lecturas);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      reply.code(201);
      return { recibidas: filas.length, rechazadas, ms: +ms.toFixed(2), primera: filas[0]?.codigo, ultima: filas[filas.length - 1]?.codigo };
    });

    r.get("/v1/verificar/:codigo", { schema: { description: "Prueba de que una lectura no fue alterada" } }, async (req, reply) => {
      const v = verificar(req.params.codigo);
      if (!v) return reply.code(404).send({ error: "No existe esa lectura" });
      return v;
    });

    r.get("/v1/lotes", async (req) => ({ lotes: db.prepare("SELECT n, raiz, previo, sello, t, cant, ots_estado FROM lotes ORDER BY n DESC LIMIT ?").all(Math.min(Number(req.query.limite) || 20, 500)) }));
    r.get("/v1/lotes/:n/ots", { schema: { description: "Archivo .ots de OpenTimestamps del lote (se verifica en opentimestamps.org)" } }, async (req, reply) => {
      const l = db.prepare("SELECT ots FROM lotes WHERE n=?").get(Number(req.params.n));
      if (!l || !l.ots) return reply.code(404).send({ error: "Ese lote todavía no tiene comprobante de OpenTimestamps" });
      reply.header("content-type", "application/octet-stream").header("content-disposition", `attachment; filename="aquaabierta-lote-${req.params.n}.ots"`);
      return l.ots;
    });

    r.get("/v1/reclamos", async () => ({ reclamos: R.todos() }));
    r.get("/v1/reclamos/:id", async (req, reply) => R.uno(req.params.id) || reply.code(404).send({ error: "No existe ese reclamo" }));
    r.post("/v1/reclamos", {
      schema: { body: { type: "object", required: ["est"], properties: { est: { type: "string" }, chips: { type: "array", items: { type: "string" } }, desc: { type: "string", maxLength: 4000 }, autor: { type: "string", maxLength: 120 }, canal: { type: "string", enum: ["web", "whatsapp", "telegram"] }, fotos: { type: "array", items: { type: "string" } }, contacto: { type: "string" } } } },
    }, async (req, reply) => {
      if (!EST.has(req.body.est)) return reply.code(400).send({ error: "Estación desconocida" });
      const { contacto, ...d } = req.body; // el contacto no se publica
      const tk = nuevoReclamo(d);
      reply.code(201);
      return { ...tk, vinculado: tk.vinculos[0] || null, vence_texto: new Date(tk.vence).toLocaleDateString("es-AR", { timeZone: "America/Argentina/San_Juan" }) };
    });
    // Respuestas formales: empresa o autoridad, con clave de rol (variables CLAVE_EMPRESA y CLAVE_AUTORIDAD)
    r.post("/v1/reclamos/:id/respuestas", {
      schema: { body: { type: "object", required: ["texto"], properties: { texto: { type: "string", minLength: 10, maxLength: 8000 }, estado: { type: "string", enum: ["En análisis", "Respondido", "Cerrado"] } } } },
    }, async (req, reply) => {
      const clave = req.headers["x-clave-rol"];
      const rol = clave && clave === process.env.CLAVE_EMPRESA ? "Empresa operadora" : clave && clave === process.env.CLAVE_AUTORIDAD ? "Autoridad ambiental" : null;
      if (!rol) return reply.code(401).send({ error: "Solo la empresa o la autoridad pueden responder" });
      const tk = R.uno(req.params.id);
      if (!tk) return reply.code(404).send({ error: "No existe ese reclamo" });
      evento(tk, rol + " (respuesta formal)", req.body.texto);
      tk.estado = req.body.estado || (rol === "Empresa operadora" ? "Respondido" : tk.estado);
      R.guardar(tk); emitir("reclamo", tk);
      return tk;
    });

    r.get("/v1/analisis", async () => ({ analisis: A.todos() }));
    r.post("/v1/analisis", {
      schema: { body: { type: "object", required: ["org", "resp", "mat", "punto", "fecha", "res", "docs"], properties: {
        tipo: { type: "string" }, org: { type: "string" }, resp: { type: "string" }, mat: { type: "string" }, acred: { type: "string" }, punto: { type: "string" }, fecha: { type: "string" }, motivo: { type: "string" },
        res: { type: "array", minItems: 1, items: { type: "object", required: ["p"], properties: { p: { type: "string" }, v: { type: ["number", "null"] }, met: { type: "string" }, ld: { type: ["number", "null"] }, menorLD: { type: "boolean" } } } },
        docs: { type: "array", minItems: 1, items: { type: "object", required: ["tipo", "nombre", "hash"], properties: { tipo: { type: "string" }, nombre: { type: "string" }, kb: { type: "number" }, hash: { type: "string", pattern: "^[0-9a-f]{64}$" } } } },
        conflicto: { type: "string" }, obs: { type: "string" } } } },
    }, async (req, reply) => {
      const a = { ...req.body, id: "AN-" + String(A.cuantos() + 1).padStart(4, "0"), creado: new Date().toISOString(), estado: "En revisión técnica" };
      a.sello = sha(JSON.stringify({ id: a.id, org: a.org, resp: a.resp, mat: a.mat, punto: a.punto, fecha: a.fecha, res: a.res, docs: a.docs.map((d) => d.hash) }));
      A.guardar(a); emitir("analisis", a);
      reply.code(201); return a;
    });

    r.get("/v1/tiempo-real", { websocket: true }, (socket) => {
      clientes.add(socket);
      socket.send(JSON.stringify({ tipo: "hola", datos: { estaciones: EST.size } }));
      socket.on("close", () => clientes.delete(socket));
    });
  });

  app.get("/", async () => ({ nombre: "API abierta de AquaAbierta", documentacion: "/docs", lema: "El agua es de todos, la información también." }));

  app.decorate("aqua", { ingerir, sellar, verificar, db });
  return app;
}

module.exports = { crearApp };
