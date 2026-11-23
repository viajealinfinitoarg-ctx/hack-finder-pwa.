// Webhook de Tiendup → acceso premium en Hack Finder.
//
// Corre solo en Vercel. No forma parte de la pantalla que ve el usuario.
// Para revertir este archivo: restaurar la versión anterior en git
// (`git checkout HEAD~1 -- api/tiendup-webhook.js` o revertir el commit).
//
// Variables de entorno (Vercel, nunca en el código):
//   SUPABASE_URL               https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  clave secreta de Supabase
//   TIENDUP_WEBHOOK_SECRET     firma secreta del webhook (detalle en Tiendup)
//
// Si falta cualquiera de las tres, no se otorga acceso.
// La firma llega en el header x-tiendup-signature. No va en la URL.
// Solo orders.payment_paid (pago confirmado) crea o actualiza al comprador.
// Nunca se toma "el primer usuario" de una lista.

const crypto = require("crypto");

const MAX_BODY = 256 * 1024;
const PAGINA = 200;
const MAX_PAGINAS = 5;
const EVENTO_PAGO = "orders.payment_paid";
const EVENTO_CREACION = "orders.creation";
const ESTADOS_PAGADOS = new Set([
  "paid",
  "approved",
  "confirmed",
  "accredited",
  "success",
  "succeeded",
  "completed",
  "successful",
  "pagado",
  "aprobado",
  "confirmado",
  "acreditado",
]);

function registrar(resultado, extra) {
  const linea = { origen: "tiendup-webhook", resultado };
  if (extra && typeof extra.evento === "string") linea.evento = extra.evento.slice(0, 80);
  if (extra && Array.isArray(extra.faltan)) linea.faltan = extra.faltan;
  if (extra && Array.isArray(extra.claves)) linea.claves = extra.claves.slice(0, 40);
  console.log(JSON.stringify(linea));
}

function compararSeguro(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length === 0 || ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function headerUnico(valor) {
  if (Array.isArray(valor)) {
    if (valor.length !== 1) return "";
    valor = valor[0];
  }
  if (typeof valor !== "string") return "";
  const limpio = valor.trim();
  return limpio.length > 512 ? "" : limpio;
}

function firmaValida(header, secreto, raw) {
  const recibido = headerUnico(header);
  if (!recibido || !secreto) return false;
  if (compararSeguro(recibido, secreto)) return true;
  if (!raw) return false;
  const hex = crypto.createHmac("sha256", secreto).update(raw).digest("hex");
  const b64 = crypto.createHmac("sha256", secreto).update(raw).digest("base64");
  return [hex, hex.toUpperCase(), b64, `sha256=${hex}`, `sha256=${hex.toUpperCase()}`, `sha256=${b64}`].some((candidato) =>
    compararSeguro(recibido, candidato)
  );
}

function normalizarEmail(valor) {
  if (typeof valor !== "string") return null;
  const email = valor.trim().toLowerCase();
  if (!email || email.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function esEmailReservado(email) {
  const dominio = email.split("@")[1] || "";
  return (
    dominio === "example.com" ||
    dominio === "example.org" ||
    dominio === "example.net" ||
    dominio.endsWith(".example") ||
    dominio.endsWith(".test") ||
    dominio.endsWith(".invalid") ||
    dominio === "localhost"
  );
}

function extraerEmail(body) {
  const candidatos = [
    body?.customer_email,
    body?.customer?.email,
    body?.data?.customer_email,
    body?.data?.customer?.email,
    body?.order?.customer_email,
    body?.order?.customer?.email,
    body?.data?.order?.customer?.email,
    body?.payload?.customer_email,
    body?.payload?.customer?.email,
    body?.buyer?.email,
    body?.data?.buyer?.email,
    body?.data?.email,
    body?.email,
  ];
  for (const candidato of candidatos) {
    const email = normalizarEmail(candidato);
    if (email) return email;
  }
  return null;
}

function extraerEvento(headers, body) {
  const candidatos = [
    headers["x-tiendup-event"],
    headers["x-tiendup-topic"],
    body?.event,
    body?.event_name,
    body?.event_type,
    body?.topic,
    body?.webhook_event,
    body?.meta?.event,
  ];
  for (const candidato of candidatos) {
    if (typeof candidato === "string" && candidato.trim()) return candidato.trim();
  }
  return "";
}

function extraerEstadoPago(body) {
  const candidatos = [
    body?.payment_status,
    body?.data?.payment_status,
    body?.order?.payment_status,
    body?.data?.order?.payment_status,
    body?.payload?.payment_status,
  ];
  for (const candidato of candidatos) {
    if (typeof candidato === "string" && candidato.trim()) return candidato.trim().toLowerCase();
  }
  return "";
}

function esPrueba(headers, body, evento) {
  const marca = headerUnico(headers["x-tiendup-test"] || headers["x-tiendup-delivery"]).toLowerCase();
  if (marca === "true" || marca === "1" || marca === "test") return true;
  if (body?.test === true || body?.is_test === true || body?.prueba === true) return true;
  const nombre = evento.toLowerCase();
  return nombre === "test" || nombre.endsWith(".test");
}

function esPagoConfirmado(evento, body) {
  if (evento === EVENTO_CREACION) return false;
  const estado = extraerEstadoPago(body);
  if (evento === EVENTO_PAGO) return !estado || ESTADOS_PAGADOS.has(estado);
  if (evento) return false;
  return Boolean(estado) && ESTADOS_PAGADOS.has(estado);
}

function esUuid(valor) {
  return typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function clavesDe(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  const claves = Object.keys(body);
  for (const nombre of ["customer", "data", "order", "buyer", "payload", "meta"]) {
    const hijo = body[nombre];
    if (!hijo || typeof hijo !== "object" || Array.isArray(hijo)) continue;
    for (const clave of Object.keys(hijo)) claves.push(`${nombre}.${clave}`);
    if (hijo.customer && typeof hijo.customer === "object" && !Array.isArray(hijo.customer)) {
      for (const clave of Object.keys(hijo.customer)) claves.push(`${nombre}.customer.${clave}`);
    }
  }
  return claves.slice(0, 40);
}

async function leerCuerpo(req) {
  if (Buffer.isBuffer(req.body)) return { raw: req.body, parsed: null };
  if (typeof req.body === "string") return { raw: Buffer.from(req.body), parsed: null };
  if (req.body && typeof req.body === "object") return { raw: null, parsed: req.body };

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY) {
      const error = new Error("body_too_large");
      error.code = "body_too_large";
      throw error;
    }
    chunks.push(buffer);
  }
  return { raw: Buffer.concat(chunks), parsed: null };
}

function headersSupabase(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: "application/json",
  };
}

async function buscarUsuarioExacto(base, serviceKey, email) {
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina += 1) {
    const url = new URL("/auth/v1/admin/users", base);
    url.searchParams.set("filter", email);
    url.searchParams.set("page", String(pagina));
    url.searchParams.set("per_page", String(PAGINA));
    const respuesta = await fetch(url, {
      headers: headersSupabase(serviceKey),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!respuesta.ok) return { error: "lookup_failed" };
    const data = await respuesta.json().catch(() => null);
    const usuarios = Array.isArray(data?.users) ? data.users : null;
    if (!usuarios) return { error: "lookup_failed" };
    const exactos = usuarios.filter((usuario) => normalizarEmail(usuario?.email) === email && esUuid(usuario?.id));
    if (exactos.length > 1) return { error: "ambiguous" };
    if (exactos.length === 1) return { user: { id: exactos[0].id, email } };
    if (usuarios.length < PAGINA) return { user: null };
  }
  return { error: "lookup_incomplete" };
}

async function crearUsuario(base, serviceKey, email) {
  const respuesta = await fetch(new URL("/auth/v1/admin/users", base), {
    method: "POST",
    headers: { ...headersSupabase(serviceKey), "Content-Type": "application/json" },
    body: JSON.stringify({ email, email_confirm: true }),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  const data = await respuesta.json().catch(() => null);
  const usuario = data?.user && typeof data.user === "object" ? data.user : data;
  if (respuesta.ok && normalizarEmail(usuario?.email) === email && esUuid(usuario?.id)) {
    return { user: { id: usuario.id, email } };
  }
  const codigo = `${data?.error_code || ""} ${data?.code || ""} ${data?.msg || ""}`;
  if (respuesta.status === 422 || /email_exists|already been registered/i.test(codigo)) {
    return { yaExiste: true };
  }
  return { error: "create_failed" };
}

async function resolverUsuario(base, serviceKey, email) {
  const busqueda = await buscarUsuarioExacto(base, serviceKey, email);
  if (busqueda.error || busqueda.user) return busqueda;
  const creado = await crearUsuario(base, serviceKey, email);
  if (creado.user || !creado.yaExiste) return creado;
  const otra = await buscarUsuarioExacto(base, serviceKey, email);
  if (otra.user) return otra;
  return { error: "lookup_failed" };
}

async function otorgarAcceso(base, serviceKey, email, userId) {
  const leer = new URL("/rest/v1/profiles", base);
  leer.searchParams.set("id", `eq.${userId}`);
  leer.searchParams.set("select", "id,email,role");
  const perfilRes = await fetch(leer, {
    headers: headersSupabase(serviceKey),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!perfilRes.ok) return { error: "profile_read_failed" };
  const filas = await perfilRes.json().catch(() => null);
  if (!Array.isArray(filas) || filas.length > 1) return { error: "profile_read_failed" };
  const actual = filas[0] || null;
  if (actual && actual.id !== userId) return { error: "profile_mismatch" };
  const emailActual = actual ? normalizarEmail(actual.email) : null;
  if (emailActual && emailActual !== email) return { error: "profile_mismatch" };

  const rol = actual?.role === "admin" ? "admin" : "premium";
  const guardar = await fetch(new URL("/rest/v1/profiles?on_conflict=id", base), {
    method: "POST",
    headers: {
      ...headersSupabase(serviceKey),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({
      id: userId,
      email,
      role: rol,
      origen_acceso: "compra",
      purchased_at: new Date().toISOString(),
      premium_expira_en: null,
      has_access: true,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });
  if (!guardar.ok) return { error: "upsert_failed" };
  const guardado = await guardar.json().catch(() => null);
  let fila = Array.isArray(guardado) ? guardado[0] : null;
  if (!fila) {
    const verificar = await fetch(leer, {
      headers: headersSupabase(serviceKey),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!verificar.ok) return { error: "upsert_failed" };
    const otraVez = await verificar.json().catch(() => null);
    fila = Array.isArray(otraVez) ? otraVez[0] : null;
  }
  if (!fila || fila.id !== userId || normalizarEmail(fila.email) !== email || fila.role !== rol) {
    return { error: "upsert_mismatch" };
  }
  return { ok: true, rol };
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const secreto = (process.env.TIENDUP_WEBHOOK_SECRET || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim();
  const faltan = [];
  if (!secreto) faltan.push("TIENDUP_WEBHOOK_SECRET");
  if (!serviceKey) faltan.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl) faltan.push("SUPABASE_URL");
  let base;
  try {
    base = new URL(supabaseUrl);
  } catch {
    base = null;
  }
  if (!base || base.protocol !== "https:" || base.username || base.password) {
    if (!faltan.includes("SUPABASE_URL")) faltan.push("SUPABASE_URL");
  }
  if (faltan.length) {
    registrar("mal_configurado", { faltan });
    res.status(503).json({ error: "Webhook no configurado" });
    return;
  }

  let crudo;
  try {
    crudo = await leerCuerpo(req);
  } catch (error) {
    if (error && error.code === "body_too_large") {
      registrar("body_demasiado_grande");
      res.status(413).json({ error: "Payload demasiado grande" });
      return;
    }
    registrar("error_interno");
    res.status(500).json({ error: "Error inesperado" });
    return;
  }

  if (!firmaValida(req.headers["x-tiendup-signature"], secreto, crudo.raw)) {
    registrar("firma_invalida");
    res.status(401).json({ error: "Firma inválida" });
    return;
  }

  let body = crudo.parsed;
  if (!body) {
    const texto = crudo.raw.toString("utf8").trim();
    if (!texto) {
      body = {};
    } else {
      try {
        body = JSON.parse(texto);
      } catch {
        registrar("json_invalido");
        res.status(400).json({ error: "JSON inválido" });
        return;
      }
    }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    registrar("json_invalido");
    res.status(400).json({ error: "JSON inválido" });
    return;
  }

  const evento = extraerEvento(req.headers, body);
  if (esPrueba(req.headers, body, evento)) {
    registrar("prueba", { evento });
    res.status(200).json({ ok: true });
    return;
  }
  if (!esPagoConfirmado(evento, body)) {
    registrar("ignorado", { evento: evento || "sin_evento" });
    res.status(200).json({ ok: true });
    return;
  }

  const email = extraerEmail(body);
  if (!email) {
    registrar("email_ausente", { evento, claves: clavesDe(body) });
    res.status(422).json({ error: "No se encontró el email del comprador" });
    return;
  }
  if (esEmailReservado(email)) {
    registrar("email_reservado", { evento });
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const usuario = await resolverUsuario(base, serviceKey, email);
    if (!usuario.user) {
      registrar(usuario.error || "lookup_failed", { evento });
      const permanente = usuario.error === "ambiguous";
      res.status(permanente ? 422 : 500).json({ error: "No se pudo identificar al comprador" });
      return;
    }
    const acceso = await otorgarAcceso(base, serviceKey, email, usuario.user.id);
    if (!acceso.ok) {
      registrar(acceso.error || "upsert_failed", { evento });
      const permanente = acceso.error === "profile_mismatch" || acceso.error === "upsert_mismatch";
      res.status(permanente ? 422 : 500).json({ error: "No se pudo activar el acceso" });
      return;
    }
    registrar(acceso.rol === "admin" ? "acceso_admin_conservado" : "acceso_activado", { evento });
    res.status(200).json({ ok: true });
  } catch {
    registrar("error_interno", { evento });
    res.status(500).json({ error: "Error inesperado" });
  }
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
