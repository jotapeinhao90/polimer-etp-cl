const CLIENT_EMAIL = "ventas@polimer-etp.cl";
const WHATSAPP_NUMBER = "56933643058";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handleLead(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const nombre = (body.nombre || "").toString().trim().slice(0, 120);
  const empresa = (body.empresa || "").toString().trim().slice(0, 120);
  const producto = (body.producto || "").toString().trim().slice(0, 1000);
  const telefono = (body.telefono || "").toString().trim().slice(0, 40);
  const origen = (body.origen || "widget").toString().trim().slice(0, 60);

  if (!nombre || !producto) {
    return json({ ok: false, error: "Falta nombre o producto" }, 400);
  }

  await env.DB.prepare(
    "INSERT INTO leads (nombre, empresa, telefono, producto, origen) VALUES (?, ?, ?, ?, ?)"
  ).bind(nombre, empresa, telefono, producto, origen).run();

  try {
    await fetch(`https://formsubmit.co/ajax/${CLIENT_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: `Nuevo contacto por WhatsApp — ${nombre}${empresa ? " (" + empresa + ")" : ""}`,
        Nombre: nombre,
        Empresa: empresa || "-",
        Teléfono: telefono || "-",
        Producto: producto,
        Origen: origen,
      }),
    });
  } catch (e) {
    // El lead ya quedó guardado en D1; el mail es best-effort.
  }

  const waText = `Hola, soy ${nombre}${empresa ? " de " + empresa : ""}. ${producto}`;
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`;

  return json({ ok: true, whatsapp: waLink });
}

async function handleLeadsList(request, env) {
  const auth = request.headers.get("x-buzon-key") || new URL(request.url).searchParams.get("key");
  if (!auth || auth !== env.BUZON_PASSWORD) {
    return json({ ok: false, error: "No autorizado" }, 401);
  }
  const { results } = await env.DB.prepare(
    "SELECT id, nombre, empresa, telefono, producto, origen, created_at FROM leads ORDER BY id DESC LIMIT 500"
  ).all();
  return json({ ok: true, leads: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }
    if (url.pathname === "/api/leads" && request.method === "GET") {
      return handleLeadsList(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
