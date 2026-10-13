-- Corrige el trigger de separación: referencias a NEW.variante_id solo para precios_tienda.
-- El guard anterior se intentaba evaluar también sobre tablas sin dicha columna,
-- y bloqueaba INSERT/UPDATE válidos en clientes_autorizados, anuncios y carritos.
CREATE OR REPLACE FUNCTION public.validar_negocio_relacionado()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  dueno uuid;
  producto_dueno uuid;
  variante_dueno uuid;
BEGIN
  IF TG_TABLE_NAME = 'tienda_productos' OR TG_TABLE_NAME = 'precios_tienda' THEN
    SELECT negocio_id INTO dueno FROM public.tiendas WHERE id = NEW.tienda_id;
    IF dueno IS DISTINCT FROM NEW.negocio_id THEN
      RAISE EXCEPTION 'La tienda no pertenece al negocio indicado';
    END IF;
    SELECT negocio_id INTO producto_dueno FROM public.productos WHERE id = NEW.producto_id;
    IF producto_dueno IS DISTINCT FROM NEW.negocio_id THEN
      RAISE EXCEPTION 'El producto no pertenece al negocio indicado';
    END IF;
    IF TG_TABLE_NAME = 'precios_tienda' THEN
      IF NEW.variante_id IS NOT NULL THEN
        SELECT negocio_id INTO variante_dueno FROM public.producto_variantes WHERE id = NEW.variante_id;
        IF variante_dueno IS DISTINCT FROM NEW.negocio_id THEN
          RAISE EXCEPTION 'La variante no pertenece al negocio indicado';
        END IF;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME IN ('anuncios_tienda', 'carritos_web', 'clientes_autorizados') THEN
    IF NEW.tienda_id IS NOT NULL THEN
      SELECT negocio_id INTO dueno FROM public.tiendas WHERE id = NEW.tienda_id;
      IF dueno IS DISTINCT FROM NEW.negocio_id THEN
        RAISE EXCEPTION 'La tienda no pertenece al negocio indicado';
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME IN ('producto_variantes', 'variantes_producto') THEN
    SELECT negocio_id INTO producto_dueno FROM public.productos WHERE id = NEW.producto_id;
    IF producto_dueno IS DISTINCT FROM NEW.negocio_id THEN
      RAISE EXCEPTION 'El producto no pertenece al negocio indicado';
    END IF;
  END IF;
  RETURN NEW;
END $$;