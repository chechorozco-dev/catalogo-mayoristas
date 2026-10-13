-- Solo preparar el mecanismo de contraseñas para locales secundarios.
-- RA ACCESORIOS continúa con sus códigos WhatsApp.
CREATE TABLE IF NOT EXISTS public.credenciales_acceso (
  cliente_id uuid PRIMARY KEY REFERENCES public.clientes_autorizados(id) ON DELETE CASCADE,
  negocio_id uuid NOT NULL REFERENCES public.negocios(id),
  password_hash text NOT NULL,
  estado text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ACTIVO','SUSPENDIDO')),
  requiere_cambio boolean NOT NULL DEFAULT false,
  intentos_fallidos integer NOT NULL DEFAULT 0,
  bloqueado_hasta timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, cliente_id)
);
CREATE INDEX IF NOT EXISTS credenciales_acceso_estado_idx ON public.credenciales_acceso(negocio_id, estado);
ALTER TABLE public.credenciales_acceso ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.credenciales_acceso FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credenciales_acceso TO service_role;

CREATE OR REPLACE FUNCTION public.validar_cliente_credencial()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE propietario uuid;
BEGIN
 SELECT negocio_id INTO propietario FROM public.clientes_autorizados WHERE id=NEW.cliente_id;
 IF propietario IS DISTINCT FROM NEW.negocio_id THEN
  RAISE EXCEPTION 'Credencial asociada a un cliente de otro negocio';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validar_cliente_credencial_trg ON public.credenciales_acceso;
CREATE TRIGGER validar_cliente_credencial_trg BEFORE INSERT OR UPDATE ON public.credenciales_acceso
FOR EACH ROW EXECUTE FUNCTION public.validar_cliente_credencial();