"use client";

import { useCallback, useEffect, useRef } from "react";
import { identidadItemCarrito, claveItemCarrito, quitarProductosRetirados } from "../../../lib/catalogo/carrito-disponibilidad.mjs";

export default function useDisponibilidadCarrito({ tiendaId, carrito, cargado, abierto, suspendido, setCarrito }) {
  const actual = useRef(carrito);
  actual.current = carrito;
  const firma = [...new Set(carrito.map(claveItemCarrito))].sort().join(",");

  const aplicarRetirados = useCallback(retirados => {
    if (!Array.isArray(retirados) || !retirados.length) return false;
    const siguiente = quitarProductosRetirados(actual.current, retirados);
    if (siguiente === actual.current) return false;
    actual.current = siguiente;
    setCarrito(anterior => quitarProductosRetirados(anterior, retirados));
    return true;
  }, [setCarrito]);

  useEffect(() => {
    if (!cargado || !tiendaId || !firma || suspendido) return;
    let activo = true;
    let enCurso = false;
    let controlador;
    async function comprobar() {
      if (!activo || enCurso || document.visibilityState === "hidden") return;
      enCurso = true;
      controlador = new AbortController();
      const limite = setTimeout(() => controlador.abort(), 12000);
      try {
        const respuesta = await fetch("/api/carrito/disponibilidad", {
          method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
          signal: controlador.signal,
          body: JSON.stringify({ tienda_id: tiendaId, productos: actual.current.map(identidadItemCarrito) }),
        });
        const datos = await respuesta.json();
        if (activo && respuesta.ok && datos.ok) aplicarRetirados(datos.retirados);
      } catch {
        // Sin conexión conservamos el carrito y volvemos a revisar al regresar.
      } finally {
        clearTimeout(limite);
        enCurso = false;
      }
    }
    const inicio = setTimeout(comprobar, abierto ? 0 : 500);
    const intervalo = setInterval(comprobar, 30000);
    window.addEventListener("focus", comprobar);
    window.addEventListener("online", comprobar);
    document.addEventListener("visibilitychange", comprobar);
    return () => {
      activo = false;
      controlador?.abort();
      clearTimeout(inicio);
      clearInterval(intervalo);
      window.removeEventListener("focus", comprobar);
      window.removeEventListener("online", comprobar);
      document.removeEventListener("visibilitychange", comprobar);
    };
  }, [tiendaId, cargado, abierto, suspendido, firma, aplicarRetirados]);

  return { aplicarRetirados };
}
