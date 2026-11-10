// Árbol de Merkle con SHA-256. Cada lectura es una "hoja"; la raíz resume todo el lote.
const crypto = require("node:crypto");

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Forma canónica de una lectura: siempre los mismos campos en el mismo orden.
const canon = (r) => JSON.stringify({ id: r.codigo, est: r.est, t: r.t, ph: r.ph, ce: r.ce, q: r.q });

function niveles(hojas) {
  const lv = [hojas];
  let cur = hojas;
  while (cur.length > 1) {
    const sig = [];
    for (let i = 0; i < cur.length; i += 2) sig.push(sha(cur[i] + (cur[i + 1] ?? cur[i])));
    lv.push(sig);
    cur = sig;
  }
  return lv;
}

function prueba(lv, idx) {
  const p = [];
  for (let l = 0; l < lv.length - 1; l++) {
    const der = idx % 2 === 1;
    p.push({ hermano: der ? lv[l][idx - 1] : lv[l][idx + 1] ?? lv[l][idx], lado: der ? "izq" : "der" });
    idx = Math.floor(idx / 2);
  }
  return p;
}

function recorrer(hoja, p) {
  let h = hoja;
  for (const s of p) h = s.lado === "izq" ? sha(s.hermano + h) : sha(h + s.hermano);
  return h;
}

module.exports = { sha, canon, niveles, prueba, recorrer };
