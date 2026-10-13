-- Cantidad enviada desde AppSheet; campo informativo de inventario.
-- Los productos RA existentes quedan con cant=NULL; no altera las ventas ni el catálogo.
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS cant integer;
ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_cant_no_negativo;
ALTER TABLE public.productos ADD CONSTRAINT productos_cant_no_negativo CHECK (cant IS NULL OR cant >= 0);
