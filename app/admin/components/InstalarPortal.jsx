"use client";
import { useEffect, useState } from "react";

export default function InstalarPortal() {
  const [prompt, setPrompt] = useState(null);
  const [instalada, setInstalada] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  const [guia, setGuia] = useState("");
  useEffect(() => {
    const modo = matchMedia("(display-mode: standalone)");
    const comprobar = () =>
      setInstalada(modo.matches || navigator.standalone === true);
    comprobar();
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setGuia(
      ios
        ? "En Safari, toca Compartir y luego Agregar a inicio. Activa Abrir como app si aparece y toca Agregar."
        : /Android/i.test(navigator.userAgent)
          ? "En Chrome, abre el menú ⋮ y elige Instalar aplicación o Agregar a la pantalla principal."
          : "En Chrome o Edge, abre el menú del navegador y elige Instalar RA Mayoristas o Instalar página como aplicación. En Safari para Mac, usa Archivo y Agregar al Dock.",
    );
    function capturar(e) {
      e.preventDefault();
      setPrompt(e);
      setAyuda(false);
    }
    function instalada() {
      setInstalada(true);
      setPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", capturar);
    window.addEventListener("appinstalled", instalada);
    modo.addEventListener("change", comprobar);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/admin/portal-sw.js", { scope: "/admin" })
        .catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", capturar);
      window.removeEventListener("appinstalled", instalada);
      modo.removeEventListener("change", comprobar);
    };
  }, []);
  if (instalada) return null;
  async function instalar() {
    if (!prompt) {
      setAyuda((x) => !x);
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setAyuda(true);
    } finally {
      setPrompt(null);
    }
  }
  return (
    <div className="ca-install">
      <button
        className="ca-outline"
        type="button"
        onClick={instalar}
        aria-expanded={ayuda}
      >
        Instalar app
      </button>
      {ayuda && (
        <div role="status" className="ca-install-help">
          {guia}
        </div>
      )}
    </div>
  );
}
