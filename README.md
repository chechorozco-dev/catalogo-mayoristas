# Mi Catálogo VIP — RA Accesorios

Catálogo mayorista y tiendas de revendedores desarrollado con **Next.js 15**, **Supabase** y **Vercel**.

## Dónde está cada cosa

| Ruta | Responsabilidad |
| --- | --- |
| `app/[slug]/page.js` | Prepara desde el servidor el catálogo público de cada tienda. Aplica visibilidad, `SOLO_RA`, publicación y precios. |
| `app/[slug]/TiendaCliente.js` | Interfaz de la tienda, filtros, carrito y compra. No debe contener consultas con claves secretas. |
| `app/[slug]/components/GaleriaProducto.jsx` | Galería de imágenes al abrir una joya. |
| `app/admin/productos/page.js` | Interfaz del catálogo privado de revendedores. |
| `app/admin/productos/components/GaleriasProducto.jsx` | Galería y visor del catálogo privado. |
| `app/admin/productos/components/EditorPrecios.jsx` | Editor de precios personalizados; conserva la API `/api/precios-tienda`. |
| `app/admin/productos/components/CarritoPedido.jsx` | Carrito del catálogo privado y envío de pedidos. |
| `app/admin-maestro/` | Administrador maestro, productos, tiendas y carritos. |
| `app/api/` | API y permisos; las claves de Supabase se usan exclusivamente en el servidor. |
| `app/components/FotoOptimizada.jsx` | Imágenes optimizadas, con compatibilidad para enlaces externos. |
| `lib/catalogo/formatos.mjs` | Textos, teléfonos colombianos, moneda y contraste de colores. |
| `lib/catalogo/categorias.mjs` | Categorías y tipos de joyería. |
| `lib/catalogo/publicacion.mjs` | Reglas de espera de 24 horas para productos nuevos. |
| `lib/supabasePagination.js` | Consultas del servidor por bloques, evitando el límite típico de 1.000 filas. |
| `tests/catalogo.test.mjs` | Pruebas unitarias de las reglas comerciales y funciones reutilizables. |

## Desarrollo local

```bash
npm install
npm run dev
```

Para comprobar las reglas después de cambiar el código:

```bash
npm test
```

Las pruebas usan el ejecutor nativo de **Node.js 24**; no necesitan Supabase ni secretos. El flujo `.github/workflows/validar-catalogo.yml` ejecuta `npm test` cuando hay cambios en `main` o en una solicitud de integración.

El despliegue y la compilación completa los valida Vercel con la configuración de producción existente. Las pruebas unitarias **no sustituyen** comprobar navegación, compras y fotografías en un navegador real.

## Reglas que no deben romperse

1. **`SOLO_RA`**: un producto marcado como exclusivo se muestra en la tienda RA, pero no se envía a los catálogos ni a la administración de revendedores.
2. **Publicación**: los productos nuevos esperan 24 horas en los catálogos de revendedores, salvo productos anteriores a la creación de la tienda o publicaciones anticipadas. RA no espera.
3. **Precios**: cada tienda mantiene sus precios personalizados. El precio de costo solo debe llegar a superficies autorizadas.
4. **Variantes**: las referencias, fotos, tamaños y precios de las opciones deben conservarse.
5. **Carritos**: el catálogo principal y los revendedores tienen procesos de compra diferentes; no deben mezclarse.
6. **Envío gratis en RA**: solo si la mercancía supera COP $400.000 y la tarifa normal de la ciudad es inferior a COP $18.000; el descuento por transferencia se calcula sobre los productos.
7. **Seguridad**: comprobar autenticación y autorización en las rutas del servidor. Nunca poner `SUPABASE_SECRET_KEY`, contraseñas o webhooks privados en el navegador ni en este repositorio.

## Criterios de mantenimiento

- Mantener la lógica **pura** (formato, filtros, reglas) en `lib/catalogo/`, con pruebas.
- Mantener los componentes visuales en carpetas `components/`, usando importaciones claras.
- Evitar copiar y pegar funciones entre el catálogo público y el privado.
- Al editar componentes grandes, realizar cambios pequeños y revisar el despliegue de Vercel.
- No modificar el diseño de joyas ni las imágenes originales como parte de una reorganización de código.

> Esta reorganización extrajo funciones y componentes existentes sin cambiar las políticas ni la base de datos. Todavía quedan componentes extensos, especialmente `TiendaCliente.js` y sus estilos; conviene dividirlos por etapas para reducir riesgos.


## Integración interna con RA WhatsApp Lab

La API `/api/integraciones/ra-whatsapp-productos` devuelve exclusivamente
información de productos visibles en la tienda RA `mayoristas-ra`, con
búsqueda por referencia/nombre y variantes activas. Incluye los marcados
`SOLO_RA`, pero no incluye artículos ocultados manualmente en RA.

Esta API es privada: requiere el encabezado
`x-ra-lab-catalog-secret` con la variable
`RA_LAB_CATALOG_SHARED_SECRET`, almacenada como `sensitive` en Vercel
en ambos proyectos. Ninguna clave de servicio debe llegar al cliente.
La descarga de imágenes se realiza por ID/slot contra una lista restringida
de proveedores HTTPS, verificando el origen y tamaño del archivo.
No crea pedidos, WhatsApps ni cambia visibilidad en las tiendas de clientes.


## Integración con productos históricos RA para cotizaciones (2026-10)

La base de datos compartida conserva una **tabla maestra privada** adicional,
`ra_productos_principal`, y la tabla `ra_producto_variantes_principal`.
Los triggers de Supabase insertan o actualizan automáticamente un producto
cuando la página lo crea/actualiza, ya sea desde el webhook o el administrador.

**Borrar un producto del catálogo público NO lo elimina del maestro privado.**
Queda como retirado (`en_catalogo_web=false`) con sus datos históricos.

La columna `costo` de `public.productos` equivale al **precio de venta
mayorista**. La adquisición de RA se guarda en una columna distinta,
`ra_productos_principal.costo_compra`.

El endpoint existente `POST /api/automation/producto` acepta opcionalmente
`costo_compra`, `COSTO_COMPRA` o `COSTO_REAL` en el body autenticado del
webhook; nunca agrega esta información a `public.productos`. Si no envías
el campo, el costo real queda vacío (no se adivina a partir del mayorista).

Ejemplo de campo para AÑADIR al JSON de tu webhook actual, **solo si
tu hoja AppSheet tiene ese dato**:

```json
{ "costo_compra": "<<[NOMBRE_REAL_DE_TU_COLUMNA_DE_COSTO]>>" }
```

No reemplaces ni modifiques tus campos ya configurados de autenticación,
referencia, precios y fotografías para agregar este campo. La migración
del maestro se instala aparte en el proyecto de WhatsApp Lab.
