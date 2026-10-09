# Sistema de interacciones de GasoCerca

La interfaz ahora usa una identidad editorial cálida y colorida inspirada en carretera/estaciones, sin alterar el catálogo CNE, los cálculos de ahorro, el orden por precio ni los flujos de producto. Leaflet se empaqueta localmente y el QR se genera en el dispositivo para reducir dependencias externas; las APIs validan entradas y no cachean coordenadas.

## Piezas compartidas

| Pieza | Uso y comportamiento |
| --- | --- |
| `FeedbackButton` / `FeedbackMessage` | Ubicación, actualización de precios, ruta, instalación y copia. Estados normal, ocupado, éxito y error; texto/iconos, `disabled`, `aria-busy` y regiones vivas. El éxito del botón vuelve a su etiqueta habitual después de 2,6 s; el mensaje permanece. |
| `useApiRequest` | Comparte solicitudes idénticas en curso, cancela la anterior al cambiar los parámetros y descarta respuestas antiguas. GPS, instalación y portapapeles también tienen protección contra activaciones duplicadas. |
| `SectionTabs` / `TabPanels` | Un solo tablist responsive (inferior en móvil), selección con píldora móvil, relaciones `tab`/`tabpanel`, un único tab stop y flechas izquierda/derecha + Inicio/Fin. La selección queda visible y los paneles entran/salen en 220 ms con desplazamientos de 8 px. |
| `ScrollRail` | Combustible, radio, pestañas y carruseles: scroll nativo, snap de proximidad, barra solo visualmente oculta, fades y pista de desbordamiento medidos con ResizeObserver. Centrado de la selección y protección contra clics después de arrastrar. Los carruseles desbordados también reciben foco para scroll de teclado, incluido Safari. |
| `SearchCombobox` | Origen/destino etiquetados, lista acotada, anuncio de carga/resultados/selección/error, flechas arriba/abajo, Inicio/Fin, Enter, Escape y cierre al salir. Debounce de 600 ms, cancelación, caché acotada y búsqueda normalizada sin mayúsculas ni diacríticos. El scroll de la opción activa solo mueve el listbox. |
| `Disclosure` | Destino/ruta e instrucciones de instalación. `aria-expanded`, `aria-controls`, contenido cerrado `inert`/`aria-hidden` y transición de filas de CSS Grid, sin mediciones de altura frágiles. |
| `SwipeActions` / `StationCard` | Estaciones en lista ordenada. En móvil: acciones laterales limitadas al ancho del panel, botón visible para abrir/cerrar y Escape con retorno del foco. Las acciones cerradas no se anuncian ni reciben foco. En escritorio se muestran directamente Google Maps y Waze. |
| `CardCarousel` | Resumen de ruta y comparación: tarjetas con parte de la siguiente visible, scroll nativo y botones anterior/siguiente. A partir de 800 px se convierten en cuadrícula. |
| `StationMap` | Leaflet 1.9.4 empaquetado localmente, carga compartida, mensajes de error/reintento, foco recuperado al reintentar y zoom de 44 × 44 px. La rueda no atrapa el scroll de la página; arrastre/pinch y controles del mapa siguen disponibles. Los popups usan texto, no HTML procedente de los proveedores. |

Los chips son selecciones de combustible/radio con `aria-pressed`, no switches de encendido/apagado. No se añadió un switch artificial ni una nueva lógica de selección de tarjetas. El mejor precio y el combustible elegido llevan texto/check y borde, no solo color. Las estaciones mantienen su lista para no perder el orden de distancia/precio ni competir con el swipe de acciones; las tarjetas de resumen sí se benefician del carrusel.

## Reglas de gestos y movimiento

- Bloqueo de eje a partir de 10 px y relación horizontal/vertical superior a 1,2. Un gesto vertical se deja al navegador.
- Cambio de sección: al menos 48 px, o 20 px a 0,45 px/ms. No se envuelve de la última a la primera sección mediante swipe.
- Acciones: desplazamiento limitado al ancho real (144 px en el diseño actual), umbral del 42 % y gesto rápido de al menos 18 px a 0,45 px/ms.
- No se inician gestos sobre botones, enlaces, etiquetas/campos, selectores, roles interactivos, contenido editable, mapa o elementos `data-no-swipe`. Las secciones también excluyen carriles y tarjetas con sus propios gestos.
- Se respetan gestos desde los 20 px de cada borde del viewport y gestos multitáctiles. No hay `touch-action: pan-y` en un antecesor del mapa/carriles: impediría su movimiento horizontal aunque el handler lo excluyera.
- Solo se cancela un `touchmove` inequívocamente horizontal en el área que gestiona ese gesto. Un clic generado al terminar el arrastre se suprime; una nueva pulsación deliberada y los clics de teclado/tecnología de asistencia no.
- Tokens CSS: 160 ms para feedback, 200 ms para controles/desplegables y 220 ms para paneles. Hover solo con mouse fino; pulsación breve sin rebotes.
- `prefers-reduced-motion` elimina las animaciones decorativas/desplazamientos de paneles y cambia el scroll programático a inmediato. La manipulación directa de una tarjeta conserva su función, sin transición al asentarse.
- Se eliminó `maximumScale: 1`; no se impide el zoom. Inputs de al menos 16 px, foco contrastado, safe areas y espacio para la navegación inferior.

## Comprobaciones reproducibles

Node.js **24.x**, como en `package.json`.

```sh
npm ci
npm test
npm run build
```

`npm test`: 21 pruebas sin dependencias adicionales (`node:test`), incluidos los combustibles permitidos (Magna y Premium), validación de límites geográficos de México, normalización, filtros, ejes, umbrales/velocidad, límites de acciones, navegación de pestañas, desbordamiento y centrado.

### Regresiones de navegador (opcionales, herramientas aisladas)

En una terminal:

```sh
npm run dev -- --hostname 0.0.0.0 --port 3000
```

En otra, instalar herramientas fuera del repositorio (no cambian el lockfile ni las dependencias de la app):

```sh
QA_DIR=$(mktemp -d)
npm install --prefix "$QA_DIR" --no-package-lock \
  playwright@1.63.0 @axe-core/playwright@4.13.0
"$QA_DIR/node_modules/.bin/playwright" install chromium
NODE_PATH="$QA_DIR/node_modules" BASE_URL=http://127.0.0.1:3000 npm run test:browser
```

Si el sistema carece de librerías de Chromium, usar `playwright install-deps chromium` con los permisos adecuados. También se admite `CHROMIUM_EXECUTABLE=/ruta/a/chromium`. `QA_OUTPUT_DIR` permite elegir dónde guardar capturas; por defecto van al directorio temporal del sistema, nunca a Git.

`test:browser`: **25 comprobaciones** en Chromium, incluidas las opciones Magna/Premium, interacciones táctiles reales mediante CDP, teclado, estados de GPS/precios/ruta/instalación/copia, respuestas fuera de orden, reintentos, foco/inert, mapa, carruseles, movimiento reducido, texto al 200 % y anchos de 320/360/390/768/800/1280 px. Axe revisa etiquetas, semántica y contraste de la aplicación con las reglas WCAG A/AA 2.0/2.1 en los estados de lista, ruta, mapa, fallo del mapa, comparación móvil, movimiento reducido, instalación y privacidad.

Las APIs, permisos GPS, prompt de instalación, portapapeles y teselas OSM se simulan para resultados deterministas; **Leaflet 1.9.4 está empaquetado localmente** y el QR se genera en el dispositivo. Los mocks solo están en `tests/`, no en el producto. Estas pruebas no sustituyen una revisión con lectores de pantalla y dispositivos físicos.

## Límites y seguimiento

- La consulta real a Nominatim falló en el sandbox con un cierre de conexión TLS (`ECONNRESET`). La UI comunica el fallo y permite reintentar. Las respuestas CNE/OSRM y la disponibilidad de proveedores deben verificarse en el despliegue con acceso de red; las pruebas de interacción no certifican esas integraciones externas.
- La pausa de Nominatim y el límite de rutas viven en memoria por instancia. En despliegues con varias instancias, añade un limitador compartido en el gateway/egress para imponer máximos globales.
- Pendiente validación física en Safari/iOS y Android: pinch/zoom, teclado virtual, VoiceOver/TalkBack y el diálogo real de instalación/permisos. La auditoría automatizada no equivale a una certificación completa WCAG.
- `npm audit` reporta **0 vulnerabilidades conocidas** tras fijar Next.js en 15.5.27 y aplicar PostCSS 8.5.29 mediante `overrides`. Repite la auditoría con cada actualización; esto no sustituye una auditoría de infraestructura.
- Las respuestas de búsqueda, estación y ruta son `private, no-store`. El servidor valida el área de México; limita búsquedas a 120 caracteres, serializa solicitudes a Nominatim con al menos un segundo de intervalo por instancia y aplica timeout. Las rutas limitan la concurrencia a tres operaciones por instancia y usan `no-store` hacia OSRM.
- El service worker solo se registra en producción y usa `gasocerca-ui-v5`. Cachea navegación y archivos estáticos propios mediante allowlist, y excluye solicitudes con query, `/api`, otras rutas y métodos distintos de GET.
- La CSP permite el preview embebido y `unsafe-eval` únicamente en desarrollo; producción mantiene `X-Frame-Options: DENY`, `frame-ancestors 'none'` y no añade `unsafe-eval`. El script y la hoja de Leaflet ya son locales; no se permiten CDN de scripts/estilos.
- La página de privacidad explica el uso de GPS, búsquedas, rutas, teselas y registros del alojamiento. La persona que publique la app debe añadir en esa política su identidad legal y un canal de contacto.
