import Image from "next/image";

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
 * Fotografías de catálogo.
 * - Miniatura: el navegador elige el tamaño según `sizes`.
 * - Imagen principal: se solicita una versión mayor al abrir el producto.
 * - Fuentes externas: conserva el enlace original como antes.
 *
 * No recorta, altera el diseño ni modifica el archivo original.
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
  ...resto
}) {
  const origen = String(src || "").trim();
  if (!origen) return null;

  const propiedades = {
    src: origen,
    alt,
    width,
    height,
    decoding,
    ...resto,
  };

  if (esFotoOptimizable(origen)) {
    return (
      <Image
        {...propiedades}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? undefined : loading}
      />
    );
  }

  return (
    <img
      {...propiedades}
      loading={priority ? "eager" : loading}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
