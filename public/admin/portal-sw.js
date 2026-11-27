// The portal always reads current availability. Never store customer or order responses.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const path = new URL(event.request.url).pathname;
  if (path !== "/admin" && !path.startsWith("/admin/")) return;
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RA Mayoristas</title><main style="font:17px system-ui;max-width:28em;margin:15vh auto;padding:1.5rem"><h1>Sin conexión</h1><p>Conéctate a internet para consultar tu apartado y confirmar productos.</p><a href="/admin">Volver a intentar</a></main></html>',
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        ),
    ),
  );
});
