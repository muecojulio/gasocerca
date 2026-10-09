# GasoCerca

Aplicación para encontrar gasolineras en México y comparar gasolina Magna (tipo CNE `regular`) y Premium. Diésel no está disponible. La interfaz combina un mapa de estaciones, precios reportados a la CNE y herramientas de ruta.

## Funciones

- Origen por GPS (solo tras solicitar permiso) o búsqueda de ciudad.
- Estaciones cercanas y lista ordenada por precio.
- Destino con ruta por carretera; se conserva el destino y se destaca la estación más barata del camino.
- Mapa Leaflet con teselas de OpenStreetMap.
- Comparación de precios y estimación de ahorro para un tanque de 40 L.
- PWA instalable; el QR de instalación se genera localmente en el dispositivo.
- Política de privacidad en `/privacidad`.

## Datos e integraciones

No hay base SQL ni cuentas.

- Catálogo público CNE: caché temporal de servidor de 30 minutos e índice espacial de celdas; contiene datos públicos, no coordenadas de búsqueda.
- Nominatim/OpenStreetMap: búsqueda de lugares (máximo 120 caracteres y solicitudes espaciadas por instancia del servidor).
- OSRM público: cálculo de rutas, sin almacenar las solicitudes con coordenadas en la caché de Next.
- Teselas OpenStreetMap: se solicitan desde el navegador cuando el mapa está visible.
- Google Maps y Waze: solo se abren si la persona elige una acción de indicaciones.
- Leaflet 1.9.4: dependencia fijada y empaquetada localmente; no se carga JavaScript de un CDN.

No hay tipografías remotas, generador de QR externo, analítica, anuncios ni rastreadores. La Política de privacidad explica los datos que sí reciben los proveedores externos. El responsable legal y su canal de contacto deben completarse en esa página por quien opere el despliegue.

## Seguridad

- Los endpoints que transportan coordenadas o búsquedas responden `Cache-Control: private, no-store`; el service worker excluye `/api` y solo guarda páginas estáticas/archivos de la propia app.
- Las coordenadas se validan contra el área cubierta en México. La geocodificación limita tamaño de entrada, valida la respuesta externa, espacia solicitudes y tiene timeout; el cálculo de rutas limita a tres operaciones simultáneas por instancia.
- CSP sin dependencias de script/style externas; además de `nosniff`, política de permisos, control de referrer y protección contra framing. Producción añade HSTS.
- Dependencias revisadas con `npm audit`: **0 vulnerabilidades conocidas** al actualizar. Next.js se mantiene en la rama 15.5 y PostCSS se fija en 8.5.29, corregido mediante `overrides`; repetir la auditoría con cada actualización.

Esto es una revisión automatizada del repositorio, no una certificación ni una auditoría de infraestructura del proveedor de hosting.

## Runtime y desarrollo

Node.js `24.x` (Next.js 15). Instala dependencias reproducibles y ejecuta las pruebas:

```sh
npm ci
npm test
npm run build
```

Para desarrollo:

```sh
npm run dev
```

Decisiones de accesibilidad, gestos, pruebas opcionales de navegador y límites conocidos:
[`docs/interacciones.md`](docs/interacciones.md).

## PWA y caché

El service worker se registra solo en producción. Cachea páginas de la app y archivos estáticos propios; no intercepta solicitudes API, ni conserva geolocalización, búsquedas o rutas. El catálogo CNE se guarda temporalmente en el servidor porque es información pública y compartida.
