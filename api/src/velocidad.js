// Prueba de velocidad de la API: cuántas lecturas por segundo puede recibir y guardar.
// Uso: node src/velocidad.js [url]   (sin url levanta una API temporal en memoria)
const { crearApp } = require("./app");
const EST = require("./estaciones");

async function main() {
  let url = process.argv[2], app;
  if (!url) {
    app = crearApp({ archivoDb: ":memory:", selladoMs: 0, ots: false });
    await app.listen({ port: 0, host: "127.0.0.1" });
    url = `http://127.0.0.1:${app.server.address().port}`;
  }
  const POR_PEDIDO = 1000, PEDIDOS = 100, PARALELO = 10;
  const lote = () => ({ lecturas: Array.from({ length: POR_PEDIDO }, (_, i) => { const e = EST[i % EST.length]; return { est: e.id, ph: +(e.base.ph + Math.random() * 0.2).toFixed(2), ce: Math.round(e.base.ce * (1 + Math.random() * 0.05)), q: e.base.q }; }) });
  const cuerpos = Array.from({ length: PEDIDOS }, () => JSON.stringify(lote()));
  const tiempos = [], internos = [];
  let i = 0;
  const t0 = performance.now();
  await Promise.all(Array.from({ length: PARALELO }, async () => {
    while (i < PEDIDOS) {
      const body = cuerpos[i++];
      const s = performance.now();
      const r = await fetch(url + "/v1/lecturas/lote", { method: "POST", headers: { "content-type": "application/json" }, body });
      const j = await r.json();
      tiempos.push(performance.now() - s); internos.push(j.ms);
    }
  }));
  const total = performance.now() - t0;
  const p = (arr, q) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length * q)];
  const t1 = performance.now();
  if (app) await app.aqua.sellar();
  const sellado = performance.now() - t1;
  const n = POR_PEDIDO * PEDIDOS;
  console.log(JSON.stringify({
    lecturas: n,
    segundos: +(total / 1000).toFixed(2),
    lecturas_por_segundo: Math.round(n / (total / 1000)),
    ms_por_pedido_de_1000: { mediana: +p(tiempos, 0.5).toFixed(1), p95: +p(tiempos, 0.95).toFixed(1) },
    ms_guardado_interno_por_1000: { mediana: +p(internos, 0.5).toFixed(1), p95: +p(internos, 0.95).toFixed(1) },
    ms_sellar_todo_en_un_lote: app ? +sellado.toFixed(0) : null,
  }, null, 2));
  if (app) await app.close();
}
main();
