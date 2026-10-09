import Link from "next/link";
import InstallPanel from "../components/InstallPanel";

export const metadata = {
  title: "Instalar GasoCerca — QR",
  description: "Instala GasoCerca en tu dispositivo o escanea el código QR para abrir la app.",
};

export default function InstalarPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="" width="42" height="42" />
          <div><h1>Instalar GasoCerca</h1><p>En cualquier teléfono o computadora</p></div>
        </div>
        <Link className="ghost" href="/">Volver</Link>
      </header>
      <InstallPanel />
    </main>
  );
}
