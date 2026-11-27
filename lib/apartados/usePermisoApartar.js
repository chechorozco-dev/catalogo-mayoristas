"use client";

import { useEffect, useState } from "react";

export function vigilarVisible(consultar, demora = 0, frecuencia = 30000) {
  const ctrl = new AbortController();
  let ocupado = false;
  async function actualizar() {
    if (document.hidden || ocupado || ctrl.signal.aborted) return;
    ocupado = true;
    try {
      await consultar(ctrl.signal);
    } finally {
      ocupado = false;
    }
  }
  const inicial = demora == null ? null : setTimeout(actualizar, demora);
  const intervalo = setInterval(actualizar, frecuencia);
  window.addEventListener("focus", actualizar);
  document.addEventListener("visibilitychange", actualizar);
  return () => {
    ctrl.abort();
    clearTimeout(inicial);
    clearInterval(intervalo);
    window.removeEventListener("focus", actualizar);
    document.removeEventListener("visibilitychange", actualizar);
  };
}

export function usePermisoApartar(cliente) {
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    setEstado(null);
    if (!cliente) return;
    return vigilarVisible(async (signal) => {
      let permitido = false;
      try {
        const r = await fetch("/api/apartados?modo=permiso", {
          cache: "no-store",
          signal,
        });
        permitido = r.ok && (await r.json()).puede_apartar === true;
      } catch {
        // Show the action only after an affirmative response for this account.
      }
      if (!signal.aborted) setEstado({ cliente, permitido });
    });
  }, [cliente]);
  return Boolean(cliente && estado?.cliente === cliente && estado.permitido);
}
