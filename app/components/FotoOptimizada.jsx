"use client";

import Image from "next/image";
import { useState } from "react";

const HOST_IMAGENES = "hxvujossrzoqqnxxskzb.supabase.co";

// Solo las imágenes públicas de nuestra cuenta de Supabase pasan por
// el optimizador de Next.js. Los enlaces externos siguen funcionando
// normalmente, sin bloquear Google Drive ni otros proveedores.
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
 * Fotografías de catálogo:
 * - Se intenta primero la miniatura WebP optimizada y adaptable de Next.js.
 * - Si falla el optimizador, se muestra directamente la foto original de Supabase.
 * - Las fuentes externas siempre conservan su URL original.
 * - Si también falla la foto original, se respeta el onError del componente padre.
 *
 * El archivo almacenado no se modifica; se conserva lazy loading y su tamaño CSS.
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

  // Guardar la URL que falló permite volver a probar el optimizador
  // automáticamente cuando cambie de fotografía, sin efectos ni parpadeos.
  const [urlOptimizacionFallida, setUrlOptimizacionFallida] = useState("");

  if (!origen) return null;

  const propiedades = {
    src: origen,
    alt,
    width,
    height,
    decoding,
    ...resto,
  };

  const usarOptimizador =
    esFotoOptimizable(origen) && urlOptimizacionFallida !== origen;

  if (usarOptimizador) {
    return (
      <Image
        {...propiedades}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? undefined : loading}
        onError={() => {
          // Evita mostrar un recuadro vacío si /_next/image está caído.
          setUrlOptimizacionFallida(origen);
        }}
      />
    );
  }

  return (
    <img
      {...propiedades}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : undefined}
      onError={onError}
    />
  );
}
