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

## Cómo está armada la página (versión combinada, 13/11/2026)

- `index.html`: **Mi agua** (para vecinos, por departamento y localidad) y **Datos técnicos** (mapa 3D de la cordillera, mapa 2D de cuencas, subsistemas, evidencia satelital Sentinel-2 en `img/sentinel/`, alertas técnicas, revisión de avisos, CSV, integridad).
- `panel.html`: **Ríos y sensores** (mapa con los ríos reales que bajan de cada mina y 23 sensores), **Avisar algo**, **Reclamos**, **Comprobar un dato** (árbol de Merkle, OpenTimestamps y QR), **WhatsApp** (simulación del bot), **Análisis** de laboratorios y profesionales, **Datos** y **Demo** de 5 pasos. Se genera con `./build.sh` desde `app/aquaabierta.html`. Se conecta sola a la API publicada en Railway.
- Las dos páginas comparten el mismo menú, colores y tipografía.
- Guardado de avisos con Firebase (opcional): `firebase.json`, `.firebaserc` y `firestore.rules`. Para activarlo, completar `window.AQUA_FIREBASE` al principio del `<script>` de `index.html` con la configuración del proyecto de Firebase y seguir los pasos de las reglas.
