-- Opciones de moneda para los precios de venta de cada tienda.
-- Migración aditiva aplicada en la base remota el 2026-10-23.
-- El costo mayorista y los precios originales de RA siguen en COP.
-- No convierte ni altera registros de precios ya guardados.
ALTER TABLE public.tiendas
  ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT 'COP'
  CHECK (moneda IN ('COP', 'USD'));

COMMENT ON COLUMN public.tiendas.moneda IS
  'Moneda para precios personalizados de venta al público; no convierte importes ni costos mayoristas.';
