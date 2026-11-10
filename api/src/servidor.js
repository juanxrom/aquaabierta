const { crearApp } = require("./app");
const app = crearApp({ logger: { level: "info" } });
const port = Number(process.env.PORT) || 3000;
app.listen({ port, host: "0.0.0.0" }).then(() => console.log(`API de AquaAbierta en http://localhost:${port} (documentación en /docs)`));
