# AquaAbierta

**El agua es de todos, la información también.**

Plataforma de monitoreo hídrico participativo y transparente para San Juan, Argentina. Desafío 1 de la hackatón minera de Ciclo Pilares.

## Boceto (versión 0)

Página única, sin servidor, con datos simulados en el navegador:

- **El agua hoy**: mapa esquemático con los puntos de control y semáforo (verde, amarillo, rojo) en lenguaje simple.
- **Avisar algo**: formulario para la comunidad (con foto y medición propia opcional). Cada aviso se convierte en un reclamo con número, responsable y plazo.
- **Reclamos**: seguimiento público. Se puede ver como vecino, empresa o autoridad ambiental. Los avisos se unen solos con las alertas del sensor de la misma cuenca.
- **Comprobar un dato**: sello digital por lotes (SHA-256 + árbol de Merkle encadenado). Muestra qué pasa si alguien altera un dato.
- **Datos abiertos**: API planeada, datos en vivo y tabla de umbrales del semáforo.
- **Demo**: la historia del pitch en 5 pasos y una prueba de velocidad con 10.000 mediciones.

### Cómo verlo

Abrí `index.html` en el navegador o activá GitHub Pages (Settings → Pages → rama `main`, carpeta `/`).

### Cómo editarlo

Se edita `app/aquaabierta.html` y después se corre `./build.sh`, que genera `index.html`.

## Próximos pasos (versión final)

Ver [docs/plan-arquitectura.md](docs/plan-arquitectura.md): API con Fastify y TimescaleDB, anclaje con OpenTimestamps, PWA offline, bot de Telegram y mapa real con Leaflet.

## Aclaraciones

- Todos los datos, la empresa "Minera Demo" y los reclamos son de prueba.
- Las ubicaciones de los puntos son aproximadas.
- Los umbrales marcados como provisorios hay que validarlos con la autoridad ambiental.
- Hecho con ayuda de inteligencia artificial y revisado por el equipo.
