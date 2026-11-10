// Simulador de sensores: manda lecturas a la API cada 2 segundos.
// Uso: node src/simulador.js [url] [--pico estacion]
const EST = require("./estaciones");
const url = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000";
const iPico = process.argv.indexOf("--pico");
const pico = iPico > 0 ? { est: process.argv[iPico + 1], ini: Date.now() } : null;

function lectura(e, now) {
  const s = Math.sin(now / 45000 + e.id.length);
  let ph = e.base.ph + 0.08 * s + (Math.random() - 0.5) * 0.08;
  let ce = e.base.ce * (1 + 0.04 * s + (Math.random() - 0.5) * 0.03);
  const q = e.base.q * (1 + 0.05 * s + (Math.random() - 0.5) * 0.04);
  if (pico && pico.est === e.id) {
    const t = (now - pico.ini) / 1000; // segundos
    const k = t < 6 ? 1 + 1.2 * (t / 6) : t < 70 ? 2.2 : Math.max(1, 2.2 - (t - 70) / 10);
    ce *= k; ph -= (k - 1) * 1.25;
  }
  return { est: e.id, t: new Date(now).toISOString(), ph: +ph.toFixed(2), ce: Math.round(ce), q: +q.toFixed(2) };
}

async function enviar() {
  const now = Date.now();
  try {
    const r = await fetch(url + "/v1/lecturas/lote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lecturas: EST.map((e) => lectura(e, now)) }) });
    const j = await r.json();
    process.stdout.write(`\r${new Date().toLocaleTimeString("es-AR")} · ${j.recibidas} lecturas · guardadas en ${j.ms} ms   `);
  } catch (e) { console.error("\nNo se pudo conectar con la API:", e.message); }
}
console.log(`Simulador enviando a ${url}${pico ? ` (pico en ${pico.est})` : ""}`);
enviar(); setInterval(enviar, 2000);
