"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import Disclosure from "./interactions/Disclosure";
import FeedbackButton, { FeedbackMessage } from "./interactions/FeedbackButton";

export default function InstallPanel() {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const [deferred, setDeferred] = useState(null);
  const [installStatus, setInstallStatus] = useState("idle");
  const [copyStatus, setCopyStatus] = useState("idle");
  const [done, setDone] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copyFallback, setCopyFallback] = useState(false);
  const installing = useRef(false);
  const copying = useRef(false);
  const linkField = useRef(null);

  useEffect(() => {
    setUrl(window.location.origin);
    const onPrompt = (event) => {
      event.preventDefault();
      setDeferred(event);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstallStatus("success");
      setDone("Listo, GasoCerca está instalada.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!url) return;
    let active = true;
    setQr("");
    setQrError(false);
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 240,
      color: { dark: "#153846", light: "#ffffff" },
    }).then((dataUrl) => {
      if (active) setQr(dataUrl);
    }).catch(() => {
      if (active) setQrError(true);
    });
    return () => { active = false; };
  }, [url]);

  async function install() {
    if (installing.current) return;
    if (!deferred) {
      setInstallStatus("idle");
      setDone("En iPhone usa Safari → Compartir → Agregar a pantalla de inicio. En Android abre el menú y elige Instalar app.");
      return;
    }
    installing.current = true;
    setInstallStatus("loading");
    setDone("");
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setInstallStatus(choice.outcome === "accepted" ? "success" : "idle");
      setDone(choice.outcome === "accepted" ? "Instalación aceptada. GasoCerca estará disponible en tu pantalla de inicio." : "Cancelaste la instalación. Puedes volver a intentarlo desde el menú del navegador.");
    } catch {
      setInstallStatus("error");
      setDone("No se pudo abrir la instalación. Prueba desde el menú del navegador o sigue las instrucciones de abajo.");
    } finally {
      setDeferred(null);
      installing.current = false;
    }
  }

  async function copyLink() {
    if (!url || copying.current) return;
    copying.current = true;
    setCopyStatus("loading");
    setCopyMessage("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopyStatus("success");
      setCopyMessage("Enlace copiado. Ya puedes compartir GasoCerca.");
      setCopyFallback(false);
    } catch {
      setCopyStatus("error");
      setCopyMessage("No se pudo copiar automáticamente. Selecciona y copia el enlace de abajo.");
      setCopyFallback(true);
    } finally {
      copying.current = false;
    }
  }

  return (
    <section className="install-card" aria-labelledby="install-title">
      <h2 id="install-title">Escanea el código QR</h2>
      <p className="notice">Abre la cámara del celular y entra a la app. Luego instálala en tu pantalla de inicio.</p>
      {qr ? <img className="qr" src={qr} alt="Código QR de GasoCerca" width="240" height="240" /> : <p className="qr-placeholder" role={qrError ? "alert" : "status"}>{qrError ? "No se pudo generar el código QR en este dispositivo." : "Preparando tu código QR…"}</p>}
      <p className="app-url">{url || "Cargando dirección…"}</p>
      <div className="actions install-actions">
        <FeedbackButton className="primary" status={installStatus} onClick={install} loadingLabel="Abriendo instalación…" successLabel="Instalación aceptada" errorLabel="Reintentar instalación">Instalar en este dispositivo</FeedbackButton>
        {url && <FeedbackButton status={copyStatus} onClick={copyLink} loadingLabel="Copiando enlace…" successLabel="Enlace copiado" errorLabel="Volver a copiar">Copiar enlace</FeedbackButton>}
      </div>
      <FeedbackMessage tone={installStatus === "error" ? "error" : installStatus === "success" ? "success" : "status"}>{done}</FeedbackMessage>
      <FeedbackMessage tone={copyStatus === "error" ? "error" : copyStatus === "success" ? "success" : "status"}>{copyMessage}</FeedbackMessage>
      {copyFallback && <div className="copy-fallback">
        <label htmlFor="copy-link">Enlace para copiar manualmente</label>
        <input ref={linkField} id="copy-link" value={url} readOnly onFocus={(event) => event.target.select()} />
        <button type="button" className="ghost" onClick={() => { linkField.current?.focus(); linkField.current?.select(); }}>Seleccionar enlace</button>
      </div>}
      <Disclosure title="Cómo instalar según tu dispositivo" className="install-instructions">
        <div className="steps">
          <p>1. Android: menú del navegador → Instalar aplicación.</p>
          <p>2. iPhone: Safari → botón Compartir → Agregar a pantalla de inicio.</p>
          <p>3. Computadora: en Chrome o Edge aparece Instalar GasoCerca cerca de la barra de dirección.</p>
        </div>
      </Disclosure>
    </section>
  );
}
