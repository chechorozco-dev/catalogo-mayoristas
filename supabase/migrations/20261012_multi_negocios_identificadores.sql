-- Índices únicos por negocio: cada local puede repetir referencias, teléfonos,
-- nombres de rutas y consecutivos de otras empresas sin mezclar sus registros.
-- Ejecutar solo después de crear la columna negocio_id (multi_negocios_base).
ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_referencia_key;
ALTER TABLE public.productos DROP CONSTRAINT IF EXISTS productos_referencia_unique;
ALTER TABLE public.productos ADD CONSTRAINT productos_negocio_referencia_key UNIQUE (negocio_id, referencia);

ALTER TABLE public.clientes_autorizados DROP CONSTRAINT IF EXISTS clientes_autorizados_telefono_key;
ALTER TABLE public.clientes_autorizados ADD CONSTRAINT clientes_negocio_telefono_key UNIQUE (negocio_id, telefono);

ALTER TABLE public.tiendas DROP CONSTRAINT IF EXISTS tiendas_slug_key;
ALTER TABLE public.tiendas ADD CONSTRAINT tiendas_negocio_slug_key UNIQUE (negocio_id, slug);

ALTER TABLE public.pedidos DROP CONSTRAINT IF EXISTS pedidos_numero_pedido_unique;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_negocio_numero_pedido_key UNIQUE (negocio_id, numero_pedido);

-- Tienda principal vacía del local de prueba, sin copiar clientes o fotografías.
INSERT INTO public.tiendas (negocio_id, nombre_tienda, slug, tipo_tienda, activa, mensaje_portada)
SELECT n.id, 'Local 2 (prueba)', 'local-2', 'RA', true, 'Catálogo mayorista en preparación'
FROM public.negocios n WHERE n.slug = 'local-2'
ON CONFLICT (negocio_id, slug) DO NOTHING;
