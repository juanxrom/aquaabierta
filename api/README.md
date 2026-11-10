# API abierta de AquaAbierta

Recibe las lecturas de los sensores, las guarda, las sella por lotes (árbol de Merkle + OpenTimestamps) y las publica para que cualquiera las use.

## Correrla

```bash
cd api
npm install
npm start                 # API en http://localhost:3000, documentación en /docs
npm run simulador         # sensores simulados mandando datos cada 2 s
node src/simulador.js http://localhost:3000 --pico taguas-abajo   # simular un pico de sales
npm run velocidad         # prueba de velocidad
npm test
```

## Qué ofrece

| Pedido | Qué hace |
|---|---|
| `GET /v1/estaciones` | Puntos de control con su color de semáforo y última lectura |
| `GET /v1/lecturas?estacion=&desde=&hasta=&limite=` | Historial de lecturas |
| `POST /v1/lecturas/lote` | Carga de hasta 50.000 lecturas por pedido |
| `GET /v1/verificar/{codigo}` | Prueba de que una lectura no fue alterada |
| `GET /v1/lotes` · `GET /v1/lotes/{n}/ots` | Sellos de cada lote y su comprobante de OpenTimestamps |
| `GET/POST /v1/reclamos` · `POST /v1/reclamos/{id}/respuestas` | Reclamos y respuestas formales (empresa y autoridad con clave) |
| `GET/POST /v1/analisis` | Análisis de laboratorios con huella de sus documentos |
| `WS /v1/tiempo-real` | Datos y alertas en vivo |

## Velocidad medida

En un contenedor de desarrollo (Node 22, SQLite en memoria), enviando 100 pedidos de 1.000 lecturas con 10 en paralelo:

- **≈ 115.000 lecturas por segundo** de punta a punta.
- **≈ 5 ms** para validar y guardar 1.000 lecturas (mediana).
- **≈ 0,3 s** para sellar 100.000 lecturas en un solo lote.

Se repite con `npm run velocidad`.

## Cómo funciona el sellado

1. Cada lectura se convierte en una huella SHA-256 (hoja).
2. Cada 10 segundos las hojas nuevas forman un árbol de Merkle y su raíz se encadena con el sello anterior.
3. El sello se envía a los calendarios públicos de OpenTimestamps, que lo anclan en Bitcoin. El comprobante `.ots` se descarga y se puede verificar en https://opentimestamps.org.
4. `GET /v1/verificar/{codigo}` devuelve el camino de la hoja a la raíz para que cualquiera lo recalcule.
