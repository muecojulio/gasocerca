# GasoCerca

App para encontrar gasolineras en México y comparar Regular, Premium y Diésel con datos de la CNE.

## Qué hace

- Origen por GPS o ciudad.
- Lista cercanas y baratas (el combustible elegido se ordena de más barato a más caro).
- Destino: calcula la ruta (OSRM) y marca la gasolinera más barata en el camino sin sustituir el destino.
- Mapa Leaflet + OpenStreetMap.
- PWA (instalar / QR).
- Política de privacidad en `/privacidad`.
- Sin funciones de voz.

## Datos e índice

No hay base SQL. El catálogo CNE vive en memoria del servidor.

- Caché de catálogo: 30 minutos (`lib/catalogo.js`).
- Índice espacial: grid de celdas ~0.05° para no recorrer todo el país en cada búsqueda.
- HTTP cache en `/api/estaciones` y `/api/ruta`.
- Service worker cachea UI, no `/api`.

## APIs públicas (sin key)

- CNE places/prices: `https://publicacionexterna.azurewebsites.net/publicaciones/`
- Nominatim: búsqueda de lugares
- OSRM: `https://router.project-osrm.org` (ruta)
- OSM tiles + Leaflet 1.9.4 (unpkg, repo perliedman/leaflet-routing-machine como referencia de enrutado)
- QR: api.qrserver.com

No se quitaron integraciones con key porque este proyecto no tenía keys.

## Runtime

Node.js `24.x` (`engines` en `package.json`). Next.js 15.

## Seguridad

Headers: nosniff, DENY frames, referrer strict, permissions-policy sin micrófono/cámara, CSP.

Ubicación solo con permiso del navegador. No hay cuentas.

## Local

```
npm install
npm run dev
```

## Interacciones y comprobaciones

Botones con estados, pestañas accesibles, búsqueda de origen/destino con teclado,
carriles nativos, carruseles responsive y acciones deslizables con alternativa visible.
Se respeta el movimiento reducido y se permite el zoom.

```
npm test
npm run build
```

Decisiones, componentes, pruebas opcionales de navegador y límites conocidos:
[`docs/interacciones.md`](docs/interacciones.md).

## Vercel

Importar el repo privado `gasocerca`. Framework Next.js. Sin env secrets.
