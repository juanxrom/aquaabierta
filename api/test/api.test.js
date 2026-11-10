const test = require("node:test");
const assert = require("node:assert");
const { crearApp } = require("../src/app");

test("ingesta, sellado y verificación", async () => {
  const app = crearApp({ archivoDb: ":memory:", selladoMs: 0, ots: false });
  await app.ready();
  const lecturas = Array.from({ length: 2000 }, (_, i) => ({ est: i % 2 ? "jachal" : "rodeo", ph: 7.8, ce: 1000 + (i % 50), q: 6 }));
  const r = await app.inject({ method: "POST", url: "/v1/lecturas/lote", payload: { lecturas } });
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().recibidas, 2000);
  const n = await app.aqua.sellar();
  assert.equal(n, 1);
  const v = await app.inject({ url: "/v1/verificar/L-0000777" });
  assert.equal(v.json().ok, true);
  assert.equal(app.aqua.verificar("L-0000777", { ce: 1 }).ok, false, "un dato alterado no debe pasar");
  await app.close();
});

test("rechaza datos fuera de rango y estaciones desconocidas", async () => {
  const app = crearApp({ archivoDb: ":memory:", selladoMs: 0, ots: false });
  const malo = await app.inject({ method: "POST", url: "/v1/lecturas/lote", payload: { lecturas: [{ est: "jachal", ph: 20 }] } });
  assert.equal(malo.statusCode, 400);
  const desconocida = await app.inject({ method: "POST", url: "/v1/lecturas/lote", payload: { lecturas: [{ est: "marte", ph: 7 }] } });
  assert.equal(desconocida.json().rechazadas.length, 1);
  await app.close();
});

test("una lectura en rojo abre un reclamo y se une al aviso de un vecino", async () => {
  const app = crearApp({ archivoDb: ":memory:", selladoMs: 0, ots: false });
  const v = await app.inject({ method: "POST", url: "/v1/reclamos", payload: { est: "angualasto", chips: ["Color raro"], canal: "whatsapp", contacto: "549264" } });
  assert.equal(v.statusCode, 201);
  assert.equal(v.json().contacto, undefined, "el contacto no se publica");
  await app.inject({ method: "POST", url: "/v1/lecturas/lote", payload: { lecturas: [{ est: "taguas-abajo", ph: 5.5, ce: 1200, q: 1.5 }] } });
  const lista = (await app.inject({ url: "/v1/reclamos" })).json().reclamos;
  const alerta = lista.find((t) => t.tipo === "alerta");
  assert.ok(alerta);
  assert.deepEqual(alerta.vinculos, ["AQ-0001"]);
  process.env.CLAVE_EMPRESA = "clave-demo";
  const sin = await app.inject({ method: "POST", url: `/v1/reclamos/${alerta.id}/respuestas`, payload: { texto: "Respuesta formal de prueba." } });
  assert.equal(sin.statusCode, 401);
  const con = await app.inject({ method: "POST", url: `/v1/reclamos/${alerta.id}/respuestas`, headers: { "x-clave-rol": "clave-demo" }, payload: { texto: "Respuesta formal de prueba." } });
  assert.equal(con.json().estado, "Respondido");
  await app.close();
});
