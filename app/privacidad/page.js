import Link from "next/link";
import PrivacyContent from "../components/PrivacyContent";

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

      <div className="legal-content">
        <h1>Política de privacidad</h1>
        <PrivacyContent />
        <p className="legal-back"><Link className="ghost" href="/">← Volver a GasoCerca</Link></p>
      </div>
    </main>
  );
}
