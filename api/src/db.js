const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

function abrir(archivo = process.env.AQUA_DB || path.join(__dirname, "..", "data", "aqua.db")) {
  if (archivo !== ":memory:") fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = new Database(archivo);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS lecturas (
      n INTEGER PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, est TEXT NOT NULL, t TEXT NOT NULL,
      ph REAL, ce REAL, q REAL, hoja TEXT NOT NULL, lote INTEGER, idx INTEGER);
    CREATE INDEX IF NOT EXISTS lect_est_t ON lecturas(est, t);
    CREATE INDEX IF NOT EXISTS lect_sin_lote ON lecturas(lote) WHERE lote IS NULL;
    CREATE TABLE IF NOT EXISTS lotes (
      n INTEGER PRIMARY KEY, raiz TEXT NOT NULL, previo TEXT NOT NULL, sello TEXT NOT NULL,
      t TEXT NOT NULL, cant INTEGER NOT NULL, ots BLOB, ots_estado TEXT NOT NULL DEFAULT 'pendiente');
    CREATE TABLE IF NOT EXISTS reclamos (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS analisis (id TEXT PRIMARY KEY, doc TEXT NOT NULL);
  `);
  return db;
}
module.exports = { abrir };
