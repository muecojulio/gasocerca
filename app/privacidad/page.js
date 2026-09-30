export const metadata = {
  title: "Privacidad — GasoCerca",
  description: "Política de privacidad de GasoCerca.",
};

export default function PrivacidadPage() {
  return (
    <main className="app-shell legal">
      <h1>Política de privacidad</h1>
      <p className="notice">Última actualización: 29 de septiembre de 2026. Borrador para revisión; no es asesoría legal.</p>
      <section className="card">
        <h2>Quiénes somos</h2>
        <p>GasoCerca es una app informativa de precios de combustible en México reportados a la CNE.</p>
      </section>
      <section className="card">
        <h2>Qué datos usamos</h2>
        <ul>
          <li>Ubicación del dispositivo, solo si la autorizas, para listar estaciones cercanas y armar una ruta.</li>
          <li>Texto de origen o destino que escribes, enviado a Nominatim (OpenStreetMap) para geocodificar.</li>
          <li>Coordenadas de origen y destino enviadas a OSRM público para trazar la ruta.</li>
        </ul>
        <p>No pedimos cuenta, correo, micrófono ni voz. No vendemos datos.</p>
      </section>
      <section className="card">
        <h2>Qué no guardamos</h2>
        <p>No hay base de datos de usuarios. El catálogo CNE y las respuestas de ruta se cachean en el servidor de forma anónima (minutos), sin identificarte.</p>
      </section>
      <section className="card">
        <h2>Servicios de terceros</h2>
        <ul>
          <li>CNE — places y prices públicos.</li>
          <li>OpenStreetMap / Nominatim — búsqueda de lugares.</li>
          <li>OSRM (router.project-osrm.org) — geometría de ruta.</li>
          <li>Teselas OSM y Leaflet (unpkg) — mapa.</li>
          <li>api.qrserver.com — QR de instalación.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Tus controles</h2>
        <p>Puedes negar el GPS y buscar solo por ciudad. Puedes borrar datos del sitio en el navegador. El service worker no cachea /api.</p>
      </section>
      <p><a className="ghost" href="/">Volver</a></p>
    </main>
  );
}
