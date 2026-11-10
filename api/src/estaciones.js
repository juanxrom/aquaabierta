// Puntos de control. Se generan desde el mapa (ver scripts del proyecto) y se cargan acá.
// base: valores habituales simulados de cada punto (pH, conductividad µS/cm, caudal m³/s).
const fs = require("node:fs");
const path = require("node:path");
const archivo = path.join(__dirname, "..", "..", "datos", "estaciones.json");
module.exports = JSON.parse(fs.readFileSync(archivo, "utf8"));
