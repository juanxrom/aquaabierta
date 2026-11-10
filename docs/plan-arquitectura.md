# AquaAbierta: plan de arquitectura (borrador)

> Borrador hecho con los defaults propuestos. Se ajusta cuando Juan confirme las respuestas.
> "El agua es de todos, la información también."

## 1. Qué pide el desafío y cómo lo cubrimos

| Requisito del desafío | Cómo lo resuelve AquaAbierta |
|---|---|
| Ingesta de telemetría simulada (pH, conductividad, caudal) | Simulador de sensores que publica lecturas cada pocos segundos por estación, con modo "inyectar anomalía" para la demo |
| Baja latencia, miles de registros en milisegundos, API abierta | API Fastify con ingesta por lotes (`POST /v1/lecturas/lote`), inserción masiva en TimescaleDB, caché de "último valor" en memoria, WebSocket para empujar cambios. Documentación OpenAPI pública y benchmark reproducible |
| Históricos anclados en un mecanismo verificable | Cada lote se hashea (SHA-256), se arma un árbol de Merkle y la raíz se ancla con OpenTimestamps (opcional: también en Sepolia). Cada lectura tiene su prueba de inclusión y un QR para verificarla |
| Panel con mapas y semáforos para ciudadanos | Mapa Leaflet con las estaciones en color verde, amarillo o rojo; ficha por estación con explicación en lenguaje simple ("¿Qué significa esto?") |
| Canal de ida y vuelta con respuestas formales | Reportes ciudadanos que se convierten en tickets con número, estado, responsable y plazo visibles; respuestas públicas de la empresa y la autoridad; bot de Telegram para consultar y reportar |

## 2. Componentes

```text
[Simulador de sensores] ──lotes──▶ [API Fastify] ──▶ [PostgreSQL + TimescaleDB]
[PWA monitor comunitario] ─muestras─▶     │                 │
[Bot Telegram] ◀──consultas/reportes──▶   │                 ├─ lecturas (hypertable)
                                          │                 ├─ muestras_comunitarias
                    WebSocket ◀───────────┤                 ├─ tickets + respuestas
[Web Next.js (mapa, semáforo, tickets)] ◀─┘                 └─ lotes_merkle + anclajes
                                          │
                       [Worker de integridad] ──▶ OpenTimestamps (Bitcoin)
                                                └▶ (opcional) Sepolia
```

- **web/**: Next.js + Tailwind, PWA offline (cola local de muestras con IndexedDB que se sincroniza al recuperar señal).
- **api/**: Fastify + TypeScript, validación con esquemas, OpenAPI en `/docs`.
- **worker/**: cierra lotes cada N segundos, calcula Merkle, ancla y actualiza estado ("pendiente" → "confirmado").
- **simulador/**: genera datos realistas por estación (variación diaria, ruido) y escenarios de anomalía.
- **bot/**: Telegram (comandos `/estado <lugar>`, `/reportar`, `/ticket <número>`).

## 3. Lógica clave

- **Semáforo**: umbrales configurables por parámetro y por estación (verde = normal, amarillo = atención, rojo = fuera de rango). Valores a confirmar con normativa argentina citada.
- **Discrepancias**: cuando una muestra comunitaria cae cerca (radio y ventana de tiempo) de un sensor y difiere más que la tolerancia, se marca "discrepancia" y queda visible en el mapa.
- **Correlación**: una anomalía de sensor busca reportes ciudadanos en la misma zona y ventana; si hay, abre o vincula un ticket automáticamente.
- **Tickets**: estados Recibido → En análisis → Respondido → Cerrado; plazo de respuesta visible con cuenta regresiva; historial público e inmutable (cada respuesta también se hashea).

## 4. Roles de demo

Ciudadano (sin login), Monitor comunitario, Empresa ("Minera Demo"), Autoridad ambiental.

## 5. Estaciones propuestas (a confirmar)

- Cuenca del río Jáchal: Jáchal, Tudcum, río Blanco.
- Cuenca del río San Juan: Calingasta, río de los Patos, dique Ullum.

Coordenadas a verificar sobre el mapa antes de cargarlas.

## 6. Historia de la demo (5 minutos)

1. Mapa en verde, datos llegando en vivo.
2. Se inyecta un pico de conductividad aguas abajo de "Minera Demo": la estación pasa a rojo y salta la alerta.
3. Una vecina reporta desde el celular (o por Telegram) agua turbia, con foto y ubicación.
4. El sistema vincula el reporte con la alerta y abre un ticket con plazo.
5. La empresa responde formalmente; la autoridad lo ve y lo cierra.
6. El ciudadano escanea el QR de la lectura y comprueba que el dato no fue alterado.
7. Cierre: benchmark de la API abierta (miles de lecturas por segundo).

## 7. Plan de trabajo (3 semanas, a ajustar)

- **Semana 1**: repo, base de datos, API de ingesta, simulador, mapa con semáforo.
- **Semana 2**: Merkle + anclaje + verificación por QR, tickets, PWA offline, discrepancias.
- **Semana 3**: bot de Telegram, textos simples, benchmark, despliegue, ensayo de la demo.
