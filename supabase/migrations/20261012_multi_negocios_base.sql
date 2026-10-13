-- Fundamentos no destructivos para alojar varios locales en un Supabase.
-- No copia productos ni clientes. Todas las filas existentes siguen siendo de RA.
-- IMPORTANTE: las consultas en Next.js deben filtrar por negocio_id antes de habilitar el Local 2.
CREATE TABLE IF NOT EXISTS public.negocios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;
INSERT INTO public.negocios (slug, nombre)
VALUES ('ra-accesorios', 'RA Accesorios'), ('local-2', 'Local 2 (prueba)')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.negocio_ra_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT id FROM public.negocios WHERE slug = 'ra-accesorios' LIMIT 1 $$;

-- Se conserva el negocio RA como predeterminado mientras su aplicación actual
-- sigue en producción; el Local 2 DEBE escribir y filtrar explícitamente su ID.
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.tiendas ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.tienda_productos ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.clientes_autorizados ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.codigos_acceso ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.variantes_producto ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.producto_variantes ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.precios_tienda ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.anuncios_tienda ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);
ALTER TABLE public.carritos_web ADD COLUMN IF NOT EXISTS negocio_id uuid NOT NULL DEFAULT public.negocio_ra_id() REFERENCES public.negocios(id);

CREATE INDEX IF NOT EXISTS idx_productos_negocio_activo ON public.productos(negocio_id, activo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tiendas_negocio_slug ON public.tiendas(negocio_id, slug);
CREATE INDEX IF NOT EXISTS idx_clientes_negocio_telefono ON public.clientes_autorizados(negocio_id, telefono);
CREATE INDEX IF NOT EXISTS idx_codigos_negocio_telefono ON public.codigos_acceso(negocio_id, telefono);
CREATE INDEX IF NOT EXISTS idx_carritos_negocio_fecha ON public.carritos_web(negocio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_negocio_fecha ON public.pedidos(negocio_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_precios_negocio_tienda ON public.precios_tienda(negocio_id, tienda_id);
CREATE INDEX IF NOT EXISTS idx_tienda_productos_negocio_tienda ON public.tienda_productos(negocio_id, tienda_id);
CREATE INDEX IF NOT EXISTS idx_variantes_negocio_producto ON public.producto_variantes(negocio_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_var_prod_negocio_producto ON public.variantes_producto(negocio_id, producto_id);

-- Barrera adicional contra la unión accidental entre entidades de locales diferentes.
CREATE OR REPLACE FUNCTION public.validar_negocio_relacionado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dueño uuid; destino uuid;
BEGIN
  IF TG_TABLE_NAME IN ('tienda_productos', 'precios_tienda', 'anuncios_tienda', 'carritos_web', 'clientes_autorizados') THEN
    IF NEW.tienda_id IS NOT NULL THEN
      SELECT negocio_id INTO dueño FROM public.tiendas WHERE id = NEW.tienda_id;
      IF dueño IS DISTINCT FROM NEW.negocio_id THEN
        RAISE EXCEPTION 'La tienda no pertenece al negocio indicado';
      END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME IN ('tienda_productos', 'precios_tienda', 'producto_variantes', 'variantes_producto') THEN
    SELECT negocio_id INTO destino FROM public.productos WHERE id = NEW.producto_id;
    IF destino IS DISTINCT FROM NEW.negocio_id THEN
      RAISE EXCEPTION 'El producto no pertenece al negocio indicado';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'precios_tienda' AND NEW.variante_id IS NOT NULL THEN
    SELECT negocio_id INTO destino FROM public.producto_variantes WHERE id = NEW.variante_id;
    IF destino IS DISTINCT FROM NEW.negocio_id THEN
      RAISE EXCEPTION 'La variante no pertenece al negocio indicado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DO $$
DECLARE tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['tienda_productos','precios_tienda','anuncios_tienda','carritos_web',
                                'clientes_autorizados','producto_variantes','variantes_producto']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_validar_negocio ON public.%I', tabla);
    EXECUTE format('CREATE TRIGGER trg_validar_negocio BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_negocio_relacionado()', tabla);
  END LOOP;
END $$;
