# Cómo se generó `red_sanjuan.json`

1. Se bajaron los ríos de la provincia de OpenStreetMap con la API Overpass (`waterway=river|stream` en el recuadro de San Juan).
2. Se armó un grafo de la red y, desde cada mina, se siguió el camino río abajo hasta el río Jáchal, el Dique de Ullum o el río Bermejo.
3. `generar.py` ubica los sensores: uno de control aguas arriba, uno ~8 km aguas abajo, uno al entrar a cada río más grande y uno en cada pueblo.
4. `post.py` saca sensores duplicados o fuera de la zona útil y recorta los tramos.

Los valores base (pH, sales, caudal) son simulados. Las ubicaciones de minas tienen la fuente en cada registro.
