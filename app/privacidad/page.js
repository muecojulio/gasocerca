import Link from "next/link";

export const metadata = {
  title: "Privacidad — GasoCerca",
  description: "Qué datos usa GasoCerca, para qué los necesita y qué servicios externos participan.",
};

export default function PrivacidadPage() {
  return (
    <main className="app-shell legal">
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="" width="42" height="42" />
          <div><h1>GasoCerca</h1><p>Transparencia en cada parada</p></div>
        </div>
        <Link className="ghost" href="/">Volver al mapa</Link>
      </header>

      <h1>Política de privacidad</h1>
      <p className="notice">Última actualización: 9 de octubre de 2026. Esta política describe el comportamiento de la versión publicada de GasoCerca; no sustituye una revisión legal.</p>

      <section className="card notice-card">
        <h2>Responsable y contacto</h2>
        <p>GasoCerca es el nombre de esta aplicación informativa. El repositorio no identifica a la persona o entidad que opera cada despliegue ni proporciona un correo o domicilio para solicitudes de privacidad. Quien publique la app debe completar aquí su identidad y un canal de contacto antes de ofrecerla públicamente; no se inventan esos datos en esta versión.</p>
      </section>

      <section className="card">
        <h2>Datos que se procesan</h2>
        <ul>
          <li><strong>Ubicación precisa:</strong> solo se solicita al tocar «Usar mi ubicación» y después de que el navegador pida permiso. Si eliges una ciudad, se usan las coordenadas del lugar que seleccionaste en vez del GPS.</li>
          <li><strong>Búsqueda de lugares:</strong> el texto de origen o destino se envía a GasoCerca y se reenvía a Nominatim/OpenStreetMap para obtener coordenadas. La caja de búsqueda conserva resultados únicamente en memoria mientras la página está abierta.</li>
          <li><strong>Ruta:</strong> si pides una ruta, las coordenadas de origen y destino se envían a OSRM público para calcular el trayecto. Los enlaces de Google Maps o Waze solo se abren cuando eliges expresamente «Cómo llegar» o una acción de ruta.</li>
          <li><strong>Solicitudes técnicas:</strong> el navegador y el proveedor de alojamiento pueden procesar dirección IP, hora, navegador y datos de conexión. Las coordenadas y búsquedas se envían en solicitudes a la API; los registros técnicos del hosting o de la red podrían incluir la URL solicitada. GasoCerca no controla sus plazos de conservación.</li>
        </ul>
        <p>La ubicación y las consultas se usan para prestar las funciones de búsqueda, comparación y mapa. No creamos perfiles de ubicación ni tenemos cuentas de usuario.</p>
      </section>

      <section className="card">
        <h2>Servicios externos y datos que reciben</h2>
        <ul>
          <li><strong>CNE:</strong> GasoCerca descarga el catálogo público de estaciones y precios. Esa descarga se hace desde el servidor de la app; el código no envía a la CNE tu ubicación de búsqueda.</li>
          <li><strong>Nominatim/OpenStreetMap:</strong> recibe el texto de búsqueda que escribes. La búsqueda se limita a México.</li>
          <li><strong>OSRM público:</strong> recibe las coordenadas de origen y destino al calcular una ruta.</li>
          <li><strong>Teselas del mapa de OpenStreetMap:</strong> al mostrar el mapa, el navegador solicita imágenes de las zonas visibles; el proveedor puede recibir la IP y las teselas solicitadas, que indican aproximadamente el área consultada.</li>
          <li><strong>Google Maps y Waze:</strong> se abren en otra pestaña solo tras una acción tuya y reciben las coordenadas necesarias para las indicaciones.</li>
          <li><strong>Alojamiento:</strong> el proveedor donde se publique GasoCerca puede tratar solicitudes y metadatos técnicos conforme a su propia política.</li>
        </ul>
        <p>Consulta también las políticas de privacidad y condiciones de cada proveedor. Los servicios externos pueden cambiar sus prácticas de tratamiento de datos sin que GasoCerca pueda controlarlo.</p>
      </section>

      <section className="card">
        <h2>Almacenamiento y conservación</h2>
        <ul>
          <li>La app no tiene una base de datos de cuentas ni guarda de forma persistente tus coordenadas, destinos o búsquedas.</li>
          <li>Las respuestas de estaciones y rutas incluyen información de ubicación; la API las entrega con directivas <code>private, no-store</code> para evitar su almacenamiento en cachés compartidas.</li>
          <li>El catálogo público de estaciones se mantiene temporalmente en la caché del servidor y se renueva aproximadamente cada 30 minutos; contiene datos públicos, no coordenadas de búsqueda.</li>
          <li>El service worker puede guardar páginas y archivos estáticos para que la interfaz abra sin conexión. No guarda respuestas de <code>/api</code>, búsquedas, ubicaciones ni rutas. Puedes borrar estos datos desde la configuración del navegador.</li>
          <li>El código QR de instalación se genera localmente en el dispositivo; la dirección de la app no se envía a un generador de QR externo.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Medición, permisos y tus opciones</h2>
        <p>Esta versión no incluye publicidad, analítica de terceros, rastreadores de redes sociales ni inicio de sesión. El código de la app no crea cookies publicitarias.</p>
        <ul>
          <li>Puedes rechazar el permiso de ubicación y buscar una ciudad manualmente.</li>
          <li>Puedes desactivar el permiso GPS, cerrar la app o borrar sus datos y caché desde el navegador.</li>
          <li>El mapa se puede usar con controles de zoom; si prefieres, consulta las listas sin abrirlo.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Seguridad y cambios</h2>
        <p>Las solicitudes de ubicación y rutas no se guardan en cachés compartidas. La app limita el tamaño de las búsquedas, valida coordenadas dentro de México y aplica una espera entre solicitudes al servicio público de geocodificación. Ninguna transmisión por Internet puede garantizarse como completamente libre de riesgos.</p>
        <p>Si se agregan cuentas, analítica, nuevas integraciones o almacenamiento persistente, esta política debe actualizarse antes de habilitar esas funciones. La fecha al inicio indica la última revisión del texto.</p>
      </section>

      <p className="legal-back"><Link className="ghost" href="/">← Volver a GasoCerca</Link></p>
    </main>
  );
}
