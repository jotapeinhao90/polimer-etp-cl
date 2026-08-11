import { sendMail } from "./smtp.js";

const CLIENT_EMAIL = "cbayas@polymer.cl";
const CC_EMAIL = "jpbayas@jpbmarketing.cl";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleLead(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const str = (v, max) => (v == null ? "" : String(v).trim().slice(0, max));
  const nombre = str(body.nombre, 120);
  const email = str(body.email, 160);
  const empresa = str(body.empresa, 120);
  const producto = str(body.producto, 1000);
  const anchoMm = str(body.ancho_mm, 20);
  const largoMm = str(body.largo_mm, 20);
  const micraje = str(body.micraje, 60);
  const volumenMensual = str(body.volumen_mensual, 60);
  const origen = str(body.origen || "widget", 60);

  const missing = [];
  if (!nombre) missing.push("nombre");
  if (!email || !EMAIL_RE.test(email)) missing.push("email");
  if (!empresa) missing.push("empresa");
  if (!producto) missing.push("producto");
  if (!anchoMm) missing.push("ancho_mm");
  if (!largoMm) missing.push("largo_mm");
  if (!micraje) missing.push("micraje");
  if (!volumenMensual) missing.push("volumen_mensual");
  if (missing.length) {
    return json({ ok: false, error: "Faltan campos obligatorios: " + missing.join(", ") }, 400);
  }

  await env.DB.prepare(
    `INSERT INTO leads (nombre, email, empresa, producto, ancho_mm, largo_mm, micraje, volumen_mensual, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(nombre, email, empresa, producto, anchoMm, largoMm, micraje, volumenMensual, origen).run();

  let mailSent = true;
  try {
    await sendMail(env, {
      to: CLIENT_EMAIL,
      cc: CC_EMAIL,
      subject: `Nueva cotización desde el sitio — ${nombre} (${empresa})`,
      text: [
        `Nombre: ${nombre}`,
        `Correo: ${email}`,
        `Empresa: ${empresa}`,
        `Qué necesita: ${producto}`,
        `Medidas (ancho x largo mm): ${anchoMm} x ${largoMm}`,
        `Micraje: ${micraje}`,
        `Cantidad mensual: ${volumenMensual}`,
        `Origen: ${origen}`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("sendMail failed:", err && err.message);
    mailSent = false;
  }

  return json({ ok: true, mailSent });
}

async function handleLeadsList(request, env) {
  const auth = request.headers.get("x-buzon-key") || new URL(request.url).searchParams.get("key");
  if (!auth || auth !== env.BUZON_PASSWORD) {
    return json({ ok: false, error: "No autorizado" }, 401);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, nombre, email, empresa, producto, ancho_mm, largo_mm, micraje, volumen_mensual, origen, created_at
     FROM leads ORDER BY id DESC LIMIT 500`
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
