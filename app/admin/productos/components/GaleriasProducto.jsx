"use client";

import { useEffect, useState } from "react";
import FotoOptimizada from "../../../components/FotoOptimizada";

export function GaleriaProducto({
  producto,
  abrirImagen,
  onAgregar,
  agregado = false,
  tieneVariantes = false,
}) {
  const imagenes = [
    producto.foto_url,
    producto.foto_url_2,
  ].filter(
    (url, index, array) =>
      url &&
      String(url).trim() !== "" &&
      array.indexOf(url) === index
  );

  const [indice, setIndice] = useState(0);
  const [imagenesConError, setImagenesConError] = useState({});

  useEffect(() => {
    setIndice(0);
    setImagenesConError({});
  }, [
    producto.id,
    producto.variante_id,
    producto.foto_url,
    producto.foto_url_2,
  ]);

  // Solo dejamos disponibles las fotos que realmente cargaron.
  const imagenesValidas = imagenes.filter(
    (_, i) => !imagenesConError[i]
  );

  // Evita quedar apuntando a una segunda foto que falló.
  useEffect(() => {
    if (
      imagenesValidas.length > 0 &&
      indice >= imagenesValidas.length
    ) {
      setIndice(0);
    }
  }, [imagenesValidas.length, indice]);

  function manejarAgregar(e) {
    e.preventDefault();
    e.stopPropagation();

    const contenedor = e.currentTarget.closest(
      ".product-image-container"
    );

    const imagen =
      contenedor?.querySelector(".product-image");

    onAgregar?.({
      elementoImagen: imagen,
      boton: e.currentTarget,
    });
  }

  function marcarError(indiceOriginal) {
    setImagenesConError((actual) => ({
      ...actual,
      [indiceOriginal]: true,
    }));

    setIndice(0);
  }

  if (!imagenesValidas.length) {
    return (
      <div className="galeria-producto-completa">
        <div className="product-image-container">
          <div className="no-image">Sin imagen</div>

          {onAgregar && (
            <button
              type="button"
              className={
                agregado
                  ? "image-cart-button image-cart-added"
                  : "image-cart-button"
              }
              onClick={manejarAgregar}
              title={
                tieneVariantes
                  ? "Ver variantes"
                  : "Agregar al pedido"
              }
            >
              {agregado ? "✓" : "🛒"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const imagenActual =
    imagenesValidas[indice] || imagenesValidas[0];

  function anterior(e) {
    e.preventDefault();
    e.stopPropagation();

    setIndice((actual) =>
      actual === 0
        ? imagenesValidas.length - 1
        : actual - 1
    );
  }

  function siguiente(e) {
    e.preventDefault();
    e.stopPropagation();

    setIndice((actual) =>
      actual === imagenesValidas.length - 1
        ? 0
        : actual + 1
    );
  }

  return (
    <div className="galeria-producto-completa">

      {/* FOTO GRANDE */}
      <div
        className="product-image-container"
        onClick={() =>
          abrirImagen(
            imagenesValidas,
            indice,
            producto.nombre
          )
        }
      >
        <FotoOptimizada
         width={640} height={640} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" quality={85} loading="lazy"
          src={imagenActual}
          alt={producto.nombre}
          className="product-image"
          onError={() => {
            const indiceOriginal =
              imagenes.indexOf(imagenActual);

            if (indiceOriginal >= 0) {
              marcarError(indiceOriginal);
            }
          }}
        />

        {/* FLECHAS: SOLO SI HAY MÁS DE UNA FOTO */}
        {imagenesValidas.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow gallery-left"
              onClick={anterior}
              aria-label="Foto anterior"
            >
              ‹
            </button>

            <button
              type="button"
              className="gallery-arrow gallery-right"
              onClick={siguiente}
              aria-label="Foto siguiente"
            >
              ›
            </button>

            <div className="photo-count">
              {indice + 1}/{imagenesValidas.length}
            </div>
          </>
        )}

        {/* BOTÓN CARRITO */}
        {onAgregar && (
          <button
            type="button"
            className={
              agregado
                ? "image-cart-button image-cart-added"
                : "image-cart-button"
            }
            onClick={manejarAgregar}
            title={
              tieneVariantes
                ? "Ver variantes"
                : "Agregar al pedido"
            }
          >
            {agregado ? "✓" : "🛒"}
          </button>
        )}
      </div>

      {/* MINIATURAS */}
      <div className="miniaturas-galeria">
        {imagenesValidas.map((foto, i) => (
          <button
            key={`${producto.id}-${producto.variante_id || "p"}-${i}`}
            type="button"
            className={
              i === indice
                ? "miniatura-galeria miniatura-activa"
                : "miniatura-galeria"
            }
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIndice(i);
            }}
            aria-label={`Ver foto ${i + 1}`}
          >
            <FotoOptimizada
         width={96} height={96} sizes="56px" quality={80} loading="lazy"
              src={foto}
              alt={`${producto.nombre} - foto ${i + 1}`}
              loading="lazy"
              onError={() => {
                const indiceOriginal =
                  imagenes.indexOf(foto);

                if (indiceOriginal >= 0) {
                  marcarError(indiceOriginal);
                }
              }}
            />

            {i === indice && (
              <span className="miniatura-check">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
/* =========================================================
   VISOR
========================================================= */

export function VisorImagen({
  visor,
  cerrar,
  anterior,
  siguiente,
}) {
  if (!visor) return null;

  return (
    <div className="viewer" onClick={cerrar}>
      <button
        type="button"
        className="viewer-close"
        onClick={cerrar}
      >
        ✕
      </button>

      <div
        className="viewer-content"
        onClick={(e) => e.stopPropagation()}
      >
        <FotoOptimizada
         width={1600} height={1600} sizes="100vw" quality={85} loading="eager"
          src={visor.imagenes[visor.indice]}
          alt={visor.nombre}
          className="viewer-image"
        />

        {visor.imagenes.length > 1 && (
          <>
            <button
              type="button"
              className="viewer-arrow viewer-left"
              onClick={anterior}
            >
              ‹
            </button>

            <button
              type="button"
              className="viewer-arrow viewer-right"
              onClick={siguiente}
            >
              ›
            </button>

            <div className="viewer-count">
              {visor.indice + 1} /{" "}
              {visor.imagenes.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
