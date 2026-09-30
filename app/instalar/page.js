"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function InstalarPage() {
  const [url, setUrl] = useState("");
  const [deferred, setDeferred] = useState(null);
  const [done, setDone] = useState("");

  useEffect(() => {
    setUrl(window.location.origin);
    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!deferred) {
      setDone("En iPhone usa Safari → Compartir → Agregar a pantalla de inicio. En Android abre el menú y elige Instalar app.");
      return;
    }
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDone(choice.outcome === "accepted" ? "Listo, ya quedó instalada." : "Cancelaste la instalación.");
    setDeferred(null);
  }

  const qr = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`
    : "";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="GasoCerca" />
          <div>
            <h1>Instalar GasoCerca</h1>
            <p>En cualquier teléfono o computadora</p>
          </div>
        </div>
        <Link className="ghost" href="/">
          Volver
        </Link>
      </header>

      <section className="install-card">
        <h2>Escanea el código QR</h2>
        <p className="notice">Abre la cámara del celular y entra a la app. Luego instálala en tu pantalla de inicio.</p>
        {qr && <img className="qr" src={qr} alt="Código QR de GasoCerca" />}
        <p>{url || "Cargando dirección…"}</p>
        <div className="actions" style={{ justifyContent: "center", marginTop: 16 }}>
          <button className="primary" onClick={install}>
            Instalar en este dispositivo
          </button>
          {url && (
            <button className="ghost" onClick={() => navigator.clipboard.writeText(url)}>
              Copiar enlace
            </button>
          )}
        </div>
        {done && <p className="notice">{done}</p>}
        <div className="steps">
          <p>1. Android: menú del navegador → Instalar aplicación.</p>
          <p>2. iPhone: Safari → botón Compartir → Agregar a pantalla de inicio.</p>
          <p>3. Computadora: en Chrome o Edge aparece Instalar GasoCerca cerca de la barra de dirección.</p>
        </div>
      </section>
    </main>
  );
}
