/ api/tiendup-webhook.js
//
// Este archivo se despliega solo en Vercel como una "función serverless" —
// no es parte de la app que ve el usuario, es un endpoint que corre en el
// servidor y que solo Tiendup (o quien tenga la URL + el secreto) puede llamar.
//
// Flujo: Tiendup confirma un pago -> le avisa a esta URL -> este código
// busca o crea al usuario en Supabase -> le marca has_access = true.
//
// Variables de entorno necesarias (se configuran en Vercel, nunca acá):
//   SUPABASE_URL              -> https://nycgcaqiplijkukwwegy.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY -> la clave secreta (sb_secret_...), NUNCA la publishable
//   TIENDUP_WEBHOOK_SECRET    -> (opcional) el secreto que configuramos en Tiendup

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_SECRET = process.env.TIENDUP_WEBHOOK_SECRET;

// Intenta encontrar el mail del comprador sin importar en qué parte
// exacta del JSON lo mande Tiendup — cubrimos varias formas comunes.
function extraerEmail(body) {
  const candidatos = [
    body?.email,
    body?.customer?.email,
    body?.buyer?.email,
    body?.data?.email,
    body?.data?.customer?.email,
    body?.data?.buyer?.email,
    body?.order?.customer?.email,
    body?.order?.email,
    body?.payload?.customer?.email,
    body?.payload?.email,
  ];
  return candidatos.find((e) => typeof e === "string" && e.includes("@"));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Chequeo de seguridad: como Tiendup no tiene un campo de "Secret" propio,
  // el secreto va incluido directo en la URL del webhook (?key=...). Solo
  // quien tenga esa URL completa puede activar accesos.
  if (WEBHOOK_SECRET) {
    const secretRecibido = req.query?.key;
    if (secretRecibido !== WEBHOOK_SECRET) {
      res.status(401).json({ error: "Secreto inválido" });
      return;
    }
  }

  const email = extraerEmail(req.body);

  if (!email) {
    // Guardamos en los logs de Vercel el body completo para poder ver,
    // la primera vez que Tiendup llame de verdad, dónde viene el mail.
    console.log("Webhook de Tiendup sin email reconocible. Body recibido:", JSON.stringify(req.body));
    res.status(400).json({ error: "No se encontró el email del comprador en el body" });
    return;
  }

  try {
    // 1) Buscamos si el usuario ya existe en Supabase Auth
    const buscar = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const buscarData = await buscar.json();
    let userId = buscarData?.users?.[0]?.id;

    // 2) Si no existe, lo creamos (con el mail ya confirmado, sin contraseña —
    //    va a entrar siempre por el código de acceso, como el resto)
    if (!userId) {
      const crear = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, email_confirm: true }),
      });
      const crearData = await crear.json();
      userId = crearData?.id;
      if (!userId) {
        console.log("No se pudo crear el usuario:", JSON.stringify(crearData));
        res.status(500).json({ error: "No se pudo crear el usuario en Supabase" });
        return;
      }
    }

    // 3) Le damos acceso en la tabla profiles (crea la fila si no existe,
    //    la actualiza si ya existía)
    const upsert = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        id: userId,
        email,
        role: "premium",
        origen_acceso: "compra",
        purchased_at: new Date().toISOString(),
      }),
    });

    if (!upsert.ok) {
      const upsertError = await upsert.text();
      console.log("Error al activar el acceso:", upsertError);
      res.status(500).json({ error: "No se pudo activar el acceso" });
      return;
    }

    console.log(`Acceso activado correctamente para ${email}`);
    res.status(200).json({ ok: true, email });
  } catch (err) {
    console.log("Error inesperado en el webhook:", err.message);
    res.status(500).json({ error: "Error inesperado" });
  }
};
