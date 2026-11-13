# AquaAbierta

**El agua es de todos, la información también.**

Plataforma de monitoreo hídrico participativo y transparente para San Juan, Argentina. Desafío 1 de la hackatón minera de Ciclo Pilares.

## La página

Una sola página (`index.html`), con el estilo de AquaAbierta (celeste y azul, letra redondeada) y pestañas arriba:

- **Mi agua**: para vecinos. Elegís tu departamento y localidad y te dice en palabras simples si podés usar el agua, de dónde viene y cómo avisar algo raro.
- **Mapa**: mapa 3D de la cordillera (relieve real, nieve, glaciares, minas, estaciones, pueblos y avisos), mapa 2D de cuencas y subsistemas.
- **Estaciones**: datos técnicos por subsistema, control contra después de la mina y empresa contra red independiente.
- **Satélite**: evidencia Sentinel-2 (color natural, NDWI y NDSI) en `img/sentinel/`.
- **Alertas**: alertas de toda la provincia y alertas técnicas registradas.
- **Reportes**: avisos de vecinos con número, responsable, plazo y respuesta pública.
- **Análisis**: laboratorios y profesionales suben sus análisis con informe firmado, huellas SHA-256 y revisión técnica.
- **WhatsApp**: simulación del bot, con la misma conversación que el bot real.
- **Datos abiertos**: cadena de integridad SHA-256, qué está medido y qué no, CSV, API e ingesta.
- **Minas y pueblos**: minas y proyectos (en producción o en proyecto), departamentos, localidades y fuentes.

### Cómo verlo

Publicada en GitHub Pages: https://juanxrom.github.io/aquaabierta/. También se puede abrir `index.html` directo en el navegador.

### Cómo editarlo

Se edita `index.html` directamente. Si cambia la conversación del bot (`bot-whatsapp/conversacion.js`), correr `python3 herramientas/copiar-bot.py` para copiarla en la página.

## Próximos pasos (versión final)

Ver [docs/plan-arquitectura.md](docs/plan-arquitectura.md): API con Fastify y TimescaleDB, anclaje con OpenTimestamps, PWA offline, bot de Telegram y mapa real con Leaflet.

## Aclaraciones

- Las mediciones, alertas y reclamos son de prueba. Las respuestas de empresas están firmadas como "Empresa operadora (simulación)". Los ríos, pueblos, minas y proyectos son reales.
- Las ubicaciones de los puntos son aproximadas.
- Los umbrales marcados como provisorios hay que validarlos con la autoridad ambiental.
- Hecho con ayuda de inteligencia artificial y revisado por el equipo.

## Otras partes del proyecto

- `api/`: API abierta (Fastify), publicada en Railway: https://aquaabierta-api-production.up.railway.app/docs
- `bot-whatsapp/`: bot de WhatsApp (API oficial de Meta) con respaldo opcional por Telegram.
- Guardado de avisos con Firebase: `firebase.json`, `.firebaserc` y `firestore.rules`. La configuración está en `window.AQUA_FIREBASE`, al principio del `<script>` de `index.html`.
