import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const runtime = "nodejs";

function verificarToken(token, secreto) {
  try {
    if (!token || !secreto) return null;

    const partes = token.split(".");
    if (partes.length !== 2) return null;

    const [payload, firmaRecibida] = partes;

    const firmaCorrecta = crypto
      .createHmac("sha256", secreto)
      .update(payload)
      .digest("base64url");

    const bufferRecibido = Buffer.from(firmaRecibida);
    const bufferCorrecto = Buffer.from(firmaCorrecta);

    if (bufferRecibido.length !== bufferCorrecto.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(bufferRecibido, bufferCorrecto)) {
      return null;
    }

    const datos = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    const ahora = Math.floor(Date.now() / 1000);

    if (!datos.exp || datos.exp <= ahora) {
      return null;
    }

    return datos;
  } catch (error) {
    console.error("Error verificando token:", error);
    return null;
  }
}

function textoONull(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

function numeroONull(valor) {
  if (valor === "" || valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

async function obtenerMaestro() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const authSessionSecret = process.env.AUTH_SESSION_SECRET;

  if (!supabaseUrl || !supabaseSecretKey || !authSessionSecret) {
    return {
      ok: false,
      status: 500,
      mensaje: "Faltan variables de configuración.",
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("ra_session")?.value;

  const sesion = verificarToken(token, authSessionSecret);

  if (!sesion?.cliente_id) {
    return {
      ok: false,
      status: 401,
      mensaje: "Sesión no válida.",
    };
  }

  const headersSupabase = {
    apikey: supabaseSecretKey,
    "Content-Type": "application/json",
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/clientes_autorizados` +
      `?id=eq.${encodeURIComponent(sesion.cliente_id)}` +
      `&activo=eq.true&select=id,nombre,telefono,rol`,
    {
      method: "GET",
      headers: headersSupabase,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detalle = await response.text();

    console.error("Error comprobando maestro:", detalle);

    return {
      ok: false,
      status: 500,
      mensaje: "No pudimos comprobar tus permisos.",
    };
  }

  const clientes = await response.json();
  const cliente = clientes?.[0];

  if (!cliente || cliente.rol !== "MAESTRO") {
    return {
      ok: false,
      status: 403,
      mensaje: "No tienes permiso para administrar productos.",
    };
  }

  return {
    ok: true,
    cliente,
    supabaseUrl,
    supabaseSecretKey,
    headersSupabase,
  };
}

/* =====================================================
   GET
   LISTAR PRODUCTOS
===================================================== */

export async function GET() {
  try {
    const acceso = await obtenerMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        { status: acceso.status }
      );
    }

    const { supabaseUrl, headersSupabase } = acceso;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/productos` +
        `?select=id,referencia,nombre,categoria,descripcion,foto_url,foto_url_2,costo,precio_detal,precio_minimo,infoimagen,activo,origen,tiene_variantes,created_at` +
        `&order=created_at.desc`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detalle = await response.text();

      console.error("Error cargando productos:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "No pudimos cargar los productos.",
          detalle,
        },
        { status: 500 }
      );
    }

    const productos = await response.json();

    return NextResponse.json({
      ok: true,
      productos,
    });
  } catch (error) {
    console.error("Error listando productos:", error);

    return NextResponse.json(
      {
        ok: false,
        mensaje: "Ocurrió un error cargando los productos.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST
   CREAR PRODUCTO
===================================================== */

export async function POST(request) {
  try {
    const acceso = await obtenerMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        { status: acceso.status }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    const body = await request.json();

    const referencia = String(body.referencia || "").trim();
    const nombre = String(body.nombre || "").trim();

    if (!referencia) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "La referencia es obligatoria.",
        },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "El nombre del producto es obligatorio.",
        },
        { status: 400 }
      );
    }

    const precioDetal = numeroONull(body.precio_detal);

    if (precioDetal === null || precioDetal < 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "El precio sugerido no es válido.",
        },
        { status: 400 }
      );
    }

    const duplicadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos` +
        `?referencia=eq.${encodeURIComponent(referencia)}` +
        `&select=id,referencia&limit=1`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!duplicadoResponse.ok) {
      const detalle = await duplicadoResponse.text();

      console.error("Error revisando referencia:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "No pudimos comprobar la referencia.",
        },
        { status: 500 }
      );
    }

    const duplicados = await duplicadoResponse.json();

    if (Array.isArray(duplicados) && duplicados.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Ya existe un producto con esa referencia.",
        },
        { status: 409 }
      );
    }

    const nuevoProducto = {
      referencia,
      nombre,
      categoria: textoONull(body.categoria),
      descripcion: textoONull(body.descripcion),
      foto_url: textoONull(body.foto_url),
      foto_url_2: textoONull(body.foto_url_2),
      costo: numeroONull(body.costo),
      precio_detal: precioDetal,
      precio_minimo: numeroONull(body.precio_minimo),
      infoimagen: textoONull(body.infoimagen),
      activo: body.activo !== false,
      origen: "PANEL_MAESTRO",
      tiene_variantes: false,
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/productos`,
      {
        method: "POST",
        headers: {
          ...headersSupabase,
          Prefer: "return=representation",
        },
        body: JSON.stringify(nuevoProducto),
      }
    );

    if (!response.ok) {
      const detalle = await response.text();

      console.error("Error creando producto:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "Supabase no pudo crear el producto.",
          detalle,
        },
        { status: 500 }
      );
    }

    const productos = await response.json();

    return NextResponse.json({
      ok: true,
      mensaje: "Producto creado correctamente.",
      producto: productos?.[0] || null,
    });
  } catch (error) {
    console.error("Error creando producto:", error);

    return NextResponse.json(
      {
        ok: false,
        mensaje: "Ocurrió un error creando el producto.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   PATCH
   EDITAR PRODUCTO
===================================================== */

export async function PATCH(request) {
  try {
    const acceso = await obtenerMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        { status: acceso.status }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    const body = await request.json();

    const id = body.id;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Falta el ID del producto.",
        },
        { status: 400 }
      );
    }

    const referencia = String(body.referencia || "").trim();
    const nombre = String(body.nombre || "").trim();

    if (!referencia || !nombre) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Referencia y nombre son obligatorios.",
        },
        { status: 400 }
      );
    }

    const precioDetal = numeroONull(body.precio_detal);

    if (precioDetal === null || precioDetal < 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "El precio sugerido no es válido.",
        },
        { status: 400 }
      );
    }

    // Revisar que la referencia no pertenezca
    // a OTRO producto.
    const duplicadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/productos` +
        `?referencia=eq.${encodeURIComponent(referencia)}` +
        `&id=neq.${encodeURIComponent(id)}` +
        `&select=id&limit=1`,
      {
        method: "GET",
        headers: headersSupabase,
        cache: "no-store",
      }
    );

    if (!duplicadoResponse.ok) {
      const detalle = await duplicadoResponse.text();

      console.error("Error comprobando referencia:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "No pudimos comprobar la referencia.",
        },
        { status: 500 }
      );
    }

    const duplicados = await duplicadoResponse.json();

    if (duplicados.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Ya existe otro producto con esa referencia.",
        },
        { status: 409 }
      );
    }

    const cambios = {
      referencia,
      nombre,
      categoria: textoONull(body.categoria),
      descripcion: textoONull(body.descripcion),
      foto_url: textoONull(body.foto_url),
      foto_url_2: textoONull(body.foto_url_2),
      costo: numeroONull(body.costo),
      precio_detal: precioDetal,
      precio_minimo: numeroONull(body.precio_minimo),
      infoimagen: textoONull(body.infoimagen),
      activo: body.activo !== false,
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/productos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: {
          ...headersSupabase,
          Prefer: "return=representation",
        },
        body: JSON.stringify(cambios),
      }
    );

    if (!response.ok) {
      const detalle = await response.text();

      console.error("Error editando producto:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "No pudimos editar el producto.",
          detalle,
        },
        { status: 500 }
      );
    }

    const productos = await response.json();

    return NextResponse.json({
      ok: true,
      mensaje: "Producto actualizado correctamente.",
      producto: productos?.[0] || null,
    });
  } catch (error) {
    console.error("Error actualizando producto:", error);

    return NextResponse.json(
      {
        ok: false,
        mensaje: "Ocurrió un error actualizando el producto.",
      },
      { status: 500 }
    );
  }
}

/* =====================================================
   DELETE
   ELIMINAR PRODUCTO
===================================================== */

export async function DELETE(request) {
  try {
    const acceso = await obtenerMaestro();

    if (!acceso.ok) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: acceso.mensaje,
        },
        { status: acceso.status }
      );
    }

    const {
      supabaseUrl,
      headersSupabase,
    } = acceso;

    const body = await request.json();

    const id = body.id;

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "Falta el ID del producto.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/productos?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          ...headersSupabase,
          Prefer: "return=representation",
        },
      }
    );

    if (!response.ok) {
      const detalle = await response.text();

      console.error("Error eliminando producto:", detalle);

      return NextResponse.json(
        {
          ok: false,
          mensaje: "No pudimos eliminar el producto.",
          detalle,
        },
        { status: 500 }
      );
    }

    const eliminados = await response.json();

    if (!eliminados.length) {
      return NextResponse.json(
        {
          ok: false,
          mensaje: "El producto no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Producto eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error eliminando producto:", error);

    return NextResponse.json(
      {
        ok: false,
        mensaje: "Ocurrió un error eliminando el producto.",
      },
      { status: 500 }
    );
  }
}
