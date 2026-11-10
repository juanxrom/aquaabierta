# Bot de WhatsApp de AquaAbierta

Permite a cualquier vecino, desde WhatsApp:

1. Ver cómo está el agua (o mandar su ubicación y recibir el punto más cercano).
2. Avisar algo raro, con foto y ubicación. Se crea un reclamo con número y plazo.
3. Seguir su reclamo.
4. Comprobar que un dato es real.

## Probarlo sin WhatsApp

```bash
node prueba.js
```

## Ponerlo en marcha con WhatsApp (API oficial de Meta)

1. Entrá a https://developers.facebook.com, creá una app de tipo **Business** y agregá el producto **WhatsApp**.
2. En **WhatsApp → API Setup** Meta te da un número de prueba gratis, el **Phone number ID** y un **token** temporal. Agregá tu celular como destinatario de prueba.
3. Publicá este servidor (por ejemplo en Render, junto a la API) con estas variables:

| Variable | Qué es |
|---|---|
| `WHATSAPP_TOKEN` | Token de acceso de Meta |
| `WHATSAPP_PHONE_ID` | Phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | Una palabra secreta que inventás vos |
| `WHATSAPP_APP_SECRET` | App secret (Configuración → Básica) |
| `AQUA_API_URL` | Dirección de la API de AquaAbierta |

4. En **WhatsApp → Configuration → Webhook** poné `https://TU-SERVIDOR/webhook`, la misma palabra secreta, y suscribite al campo **messages**.
5. Escribile "hola" al número de prueba.

Para usar un número propio y escribirle a cualquier persona, Meta pide verificar la empresa. Para la demo alcanza con el número de prueba.

```bash
WHATSAPP_TOKEN=... WHATSAPP_PHONE_ID=... WHATSAPP_VERIFY_TOKEN=... AQUA_API_URL=http://localhost:3000 node servidor.js
```
