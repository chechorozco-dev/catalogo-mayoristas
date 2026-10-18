"use client";

import { useEffect } from "react";
import FotoOptimizada from "../../components/FotoOptimizada";
import { fotosProducto } from "../../../lib/catalogo/pdf-layout.mjs";

export default function GaleriaProducto({
  producto,
  indiceFoto,
  setIndiceFoto,
}) {
  const fotos = fotosProducto(producto);

  useEffect(() => {
    if (indiceFoto >= fotos.length) {
      setIndiceFoto(0);
    }
  }, [
    producto?.foto_url,
    producto?.foto_url_2,
    indiceFoto,
    fotos.length,
    setIndiceFoto,
  ]);

  if (!fotos.length) {
    return (
      <div className="galeria-producto">
        <div className="sin-imagen">
          Sin imagen
        </div>
      </div>
    );
  }

  function anterior() {
    setIndiceFoto((actual) =>
      actual === 0
        ? fotos.length - 1
        : actual - 1
    );
  }

  function siguiente() {
    setIndiceFoto((actual) =>
      actual === fotos.length - 1
        ? 0
        : actual + 1
    );
  }

  return (
    <div className="galeria-producto">
      <FotoOptimizada
          width={1400} height={1400} sizes="(max-width: 768px) 100vw, 800px" quality={85} loading="eager"
        src={fotos[indiceFoto] || fotos[0]}
        alt={producto.nombre}
      />

      {fotos.length > 1 && (
        <>
          <button
            className="galeria-flecha izquierda"
            onClick={anterior}
          >
            ‹
          </button>

          <button
            className="galeria-flecha derecha"
            onClick={siguiente}
          >
            ›
          </button>

          <div className="galeria-puntos">
            {fotos.map((_, index) => (
              <span
                key={index}
                className={`galeria-punto ${
                  index === indiceFoto
                    ? "activo"
                    : ""
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
