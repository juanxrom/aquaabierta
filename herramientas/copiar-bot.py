"""Copia bot-whatsapp/conversacion.js dentro de index.html (entre /*BOT-INICIO*/ y /*BOT-FIN*/).
Uso: python3 herramientas/copiar-bot.py  (desde la carpeta del proyecto)
En la página los códigos de ejemplo cambian a los de la simulación (RA-2026-0041 y B-12-JB4)."""
import pathlib
raiz = pathlib.Path(__file__).resolve().parent.parent
bot = (raiz / "bot-whatsapp" / "conversacion.js").read_text(encoding="utf-8")
bot = bot.replace("Por ejemplo: *AQ-0001*", "Por ejemplo: *RA-2026-0041*").replace("Por ejemplo: *L-000123*", "Por ejemplo: *B-12-JB4*")
pag = raiz / "index.html"
s = pag.read_text(encoding="utf-8")
a = s.index("/*BOT-INICIO*/\n") + len("/*BOT-INICIO*/\n")
b = s.index("/*BOT-FIN*/")
pag.write_text(s[:a] + bot + "\n" + s[b:], encoding="utf-8")
print("Listo: conversación del bot copiada en index.html")
