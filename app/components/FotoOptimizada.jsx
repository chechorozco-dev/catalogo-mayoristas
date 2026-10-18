"use client";

import Image from "next/image";
import { useState } from "react";
import { urlFotoParaVista } from "../../lib/catalogo/fotos-web.mjs";

const HOST_IMAGENES = "hxvujossrzoqqnxxskzb.supabase.co";

function esFotoOptimizable(src) {
  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" &&
      url.hostname === HOST_IMAGENES &&
      url.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}

/**
 * Supabase: miniaturas cacheadas en Next/Image.
 * Google Drive: pedir w192/w384/w640 para miniaturas, w1200 en ampliación.
 * Fallback controlado: si la miniatura falla, intentar URL original.
 * En todos los casos evitamos imágenes rotas invisibles.
 */
export default function FotoOptimizada({
  src,
  alt = "",
  width = 640,
  height = 640,
  sizes = "100vw",
  quality = 85,
  priority = false,
  loading = "lazy",
  decoding = "async",
  onError,
  ...resto
}) {
  const origen = String(src || "").trim();
  const miniatura = urlFotoParaVista(origen, width);
  const [falloOptimizador, setFalloOptimizador] = useState("");
  const [falloMiniatura, setFalloMiniatura] = useState("");
  const [falloDefinitivo, setFalloDefinitivo] = useState("");

  if (!miniatura || falloDefinitivo === origen) {
    if (!origen) return null;
    return (
      <span
        className={resto.className || ""}
        role="img"
        aria-label={alt || "Fotografía no disponible"}
        onClick={resto.onClick}
        style={{
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: "10px",
          fontSize: "12px",
          color: "#858585",
          background: "#f6f6f6",
          ...resto.style,
        }}
      >
        Foto no disponible
      </span>
    );
  }

  const srcActual = falloMiniatura === origen ? origen : miniatura;
  const propiedades = { src: srcActual, alt, width, height, decoding, ...resto };
  const usarOptimizador = esFotoOptimizable(origen) && falloOptimizador !== origen;

  if (usarOptimizador) {
    return (
      <Image
        {...propiedades}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? undefined : loading}
        onError={() => {
          // La imagen original puede funcionar aunque el proxy falle.
          setFalloOptimizador(origen);
        }}
      />
    );
  }

  return (
    <img
      {...propiedades}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : undefined}
      onError={(evento) => {
        if (srcActual !== origen) {
          setFalloMiniatura(origen);
          return;
        }
        setFalloDefinitivo(origen);
        onError?.(evento);
      }}
    />
  );
}
