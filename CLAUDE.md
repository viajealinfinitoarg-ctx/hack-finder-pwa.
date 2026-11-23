# Hack Finder — Contexto completo del proyecto

> Este archivo existe para que cualquier sesión nueva de Claude Code entienda el proyecto de punta a punta sin que Rodrigo tenga que reexplicarlo. Leelo completo antes de tocar cualquier cosa.

## Reglas de trabajo para esta etapa — LEER PRIMERO

**Modo actual: AUDITORÍA, no modificación.**

1. En esta etapa, Claude Code debe **revisar** lo que ya existe (código en GitHub, configuración de Vercel, esquema y políticas de Supabase) y entregar una devolución con hallazgos y sugerencias de mejora.
2. **No modificar ni un archivo, ni una variable, ni una fila de base de datos sin aprobación explícita de Rodrigo para ese cambio puntual.** Nada de cambios en lote ni "ya que estoy, aproveché y arreglé...".
3. Cada sugerencia se presenta, se espera el ok, y recién ahí se ejecuta — una por una, no todas juntas.
4. **La funcionalidad actual no se toca.** A Rodrigo le gusta cómo funciona la app hoy — el objetivo de esta etapa es exclusivamente visual/estético, no reescribir lógica que ya funciona y está probada.
5. Antes de dar cualquier cambio de código por terminado, verificarlo corriendo la app en un navegador real (Playwright u otra herramienta), no asumir que "debería funcionar".
6. Si se aplica un cambio de diseño a un elemento, aplicarlo consistentemente a todos los elementos equivalentes de la interfaz — no dejar la mitad de la app actualizada y la otra mitad con el estilo viejo.

## Qué es este proyecto

**Hack Finder** es una PWA (web app instalable) que funciona como bonus/companion de **"El Viajero Premium"**, un ebook de hacks de viaje ($47, vendido vía Tiendup) de **Rodrigo Suarez**, creador de contenido de viajes en Instagram (**@viajealinfinit8**, marca comercial "Viajealinfinit8").

La app deja que el usuario busque una ruta de vuelo (origen → destino, con escala opcional) y le muestra automáticamente:
- Qué salas VIP tiene disponibles en cada aeropuerto (con datos verificados donde existen, sin inventar nada donde no)
- Si le corresponde compensación por el reglamento europeo EC 261/2004, y cuánto
- Info sobre código de tarifa y upgrades
- Un cronograma de qué hacer 7 días antes / 48hs antes / en el aeropuerto

Es un producto **100% pago** — solo entra quien compró el ebook. No hay versión gratuita ni freemium dentro de la app.

## Stack técnico

- **Sin framework, sin build step.** Todo el frontend vive en un único archivo `index.html` (HTML + CSS + JS inline). No hay `package.json`, no hay `node_modules`, no hay bundler.
- **Hosting:** Vercel, proyecto llamado `hack-finder-pwa`, bajo el team `Infinit8`.
- **Repositorio:** GitHub, `hack-finder-pwa` (cuenta de la organización `viajealinfinitoarg-ctx`). Conectado a Vercel vía integración Git nativa (auto-deploy en cada push a `main`).
- **Dominio:** `app.viajealinfinito.com` (subdominio propio, DNS en Porkbun, CNAME apuntando a Vercel).
- **Base de datos / Auth:** Supabase, proyecto "HACK FINDER PREMIUM" — URL `https://nycgcaqiplijkukwwegy.supabase.co`.
- **Envío de mails:** Resend, con el dominio `viajealinfinito.com` verificado (DKIM/SPF/DMARC en Porkbun), conectado a Supabase vía SMTP custom (esto reemplazó el límite de 2 mails/hora del servicio de mail por defecto de Supabase).
- **Automatización de venta:** webhook de Tiendup → función serverless en Vercel (`api/tiendup-webhook.js`).

⚠️ **Ojo, no confundir repos:** la landing de venta del ebook (`viajealinfinito.com`, sin el `app.`) es un proyecto de Vercel **completamente distinto**, con su propio repo (`viajero-premium-lading`). No tocar ese código pensando que es este.

## Estructura de archivos del repo

```
hack-finder-pwa/
├── index.html          ← toda la app: HTML + CSS + JS inline
├── manifest.json        ← metadata de la PWA (nombre, ícono, colores)
├── sw.js                 ← service worker (cachea el shell, network-first para el HTML)
├── icons/
│   ├── icon-192.png
│   ├── icon-192-maskable.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
└── api/
    └── tiendup-webhook.js  ← función serverless (Node, sin dependencias externas)
```

**Cómo se actualiza hoy:** se borran los archivos viejos en GitHub (interfaz web, sin git CLI de por medio) y se suben los nuevos. Vercel detecta el push y redeploya solo.

## Identidad visual (NO CAMBIAR el ADN de marca — sí elevar la ejecución)

- **Colores:** negro (`#0A0A0A` / `#141414` / `#1C1C1C`) + dorado (`#C9A84C` / `#E8C96A`). Esta paleta es la identidad de marca de Rodrigo en todo su ecosistema (Instagram, ebook, landing) — no se reemplaza, se refina.
- **Tipografía:** **DM Sans** en absolutamente todo — títulos y cuerpo. Se sacó Playfair Display (serif) a pedido explícito de Rodrigo; no reintroducir tipografía serif en ningún lado. **JetBrains Mono** solo para datos técnicos (códigos de aeropuerto, montos).
- **Idioma:** español **neutro**, sin voseo argentino (revisado y corregido varias veces — ojo con nuevas frases que se agreguen).
- **Lenguaje de interfaz actual:** inspirado en Airbnb/Apple — esquinas redondeadas (sistema de tokens `--r-sm/md/lg/pill`), bottom sheets con animación "spring" (`cubic-bezier(.34,1.56,.64,1)`), chips de filtro, tab bar inferior fijo, header de resultados estilo "tarjeta de embarque" con el código IATA grande.

### Lo que pide esta etapa

Rodrigo quiere una **elevación visual hacia un estilo más sofisticado, premium y "Apple-like"**, tomando como referencia **Flighty** (la app de tracking de vuelos que ganó el Apple Design Award 2023 y fue nombrada una de las mejores apps del mundo ese año). Las señas de identidad de Flighty que vale la pena estudiar antes de proponer cambios: tipografía con jerarquía muy marcada pero sobria, muchísimo espacio en blanco/negro (nada apretado), micro-interacciones con propósito (no decorativas), datos numéricos tratados como protagonistas visuales, cero elementos genéricos de "IA" (gradientes forzados, sombras excesivas, iconografía de stock).

**Importante:** esto es una dirección de inspiración, no una orden de copiar literalmente. La marca sigue siendo negro/dorado/DM Sans — la tarea es ejecutar ese sistema con más pulido y sofisticación, no reemplazarlo por otro.

## Base de datos (Supabase)

Tablas creadas (todas con RLS activado desde su creación):

| Tabla | Contenido | Estado |
|---|---|---|
| `airports` | Aeropuertos (código, ciudad, país, lat/lng, flag, is_eu) | La app los lee en vivo en `cargarDatosDesdeSupabase()` y llena `AIRPORTS`. Si esta lectura falla, la búsqueda no arranca. |
| `lounges` | Salas VIP verificadas, ligadas a `airport_code` | Leídas en vivo. Siguen valiendo la regla de no inventar una sala que no esté en la tabla. |
| `glossary_terms` | Términos del glosario (`term_key`, tag, título, texto) | Leídos en vivo. Si falla, la app no arranca. |
| `stopover_programs` | Programas de escala | Leídos en vivo. Si falla, esa sección no aparece y el resto sigue. |
| `promos` | Colaboraciones con bancos/aerolíneas | Leídas en vivo. Sigue vacía: si no hay filas, la sección no aparece. |
| `profiles` | `id` (= `auth.users.id`), `email`, `role` (`free` / `premium` / `admin`), `premium_expira_en`, `origen_acceso`, `purchased_at`, `created_at`. `has_access` sigue en la tabla pero **el gate no lo usa**. | En uso. El acceso entra si `role = admin`, o si `role = premium` y `premium_expira_en` es null o todavía no venció. |
| `authorized_buyers` | Mail de compra, para el trigger `handle_new_user` | La usa el trigger al crear un usuario de Auth y la edge function vieja. El webhook de Vercel otorga el acceso escribiendo `profiles` directo. |

**Políticas RLS de lectura que usa la app:**
- `profiles`: "usuarios ven su propio perfil" (`auth.uid() = id`) y "admins ven todos los perfiles" (`is_admin()`). Los admins además pueden actualizar roles.
- `airports`, `lounges`, `glossary_terms`, `promos`, `stopover_programs`: política de `SELECT` pública (`qual = true`).

⚠️ **Lección aprendida:** una política RLS por sí sola **no alcanza** — Supabase también necesita el `GRANT` explícito a nivel de tabla para el rol que usa el cliente. Esas tablas públicas ya se leen desde el navegador: si se les saca el `GRANT SELECT`, se rompen la búsqueda y el glosario.

**Todavía no existe** el panel para agregar, editar o borrar aeropuertos, salas VIP y promos sin tocar código. Sí existe la pestaña Admin de la app, que lista perfiles y cambia `role`.

## Autenticación

- **Método:** código de acceso de 6-8 dígitos por mail (NO magic link — se abandonó el magic link a propósito, ver "Decisiones técnicas" abajo).
- **Flujo:** `signInWithOtp({email})` → el usuario recibe un mail con un código → lo tipea en la app → `verifyOtp({email, token, type:"email"})` → `verificarAcceso()` lee `profiles.role` y `profiles.premium_expira_en`. Entra si es `admin`, o si es `premium` y la fecha no venció (null cuenta como vigente). Si no, ve "no encontramos tu compra". Un OTP correcto dispara el evento `CompleteRegistration` del Meta Pixel; volver a abrir la app con la sesión ya abierta no lo vuelve a disparar.
- **Plantilla del mail:** editada en Supabase → Authentication → Emails → "Magic link or OTP". Usa la variable `{{ .Token }}` (con T mayúscula — es sensible a mayúsculas/minúsculas, causó un bug real).
- ⚠️ **Pendiente de seguridad antes de escalar:** el toggle "Allow new users to sign up" en Supabase Auth está **activado**. Hoy no es grave porque un alta nueva queda con `role = free` (el trigger `handle_new_user`) y el gate no la deja pasar. Antes de un lanzamiento más grande conviene revisar si hay que desactivarlo.
- **UI del login:** vive en `#auth-gate`, con 5 estados manejados por `mostrarPaso()`: `checking`, `email`, `loading`, `sent` (ahora es la pantalla de ingresar el código, el nombre del id quedó del diseño viejo), `noaccess`.

## Automatización de la venta (Tiendup → acceso automático)

- En Tiendup: Configuraciones → Webhooks → Crear Webhook. URL **sin** secreto en el query string:
  `https://app.viajealinfinito.com/api/tiendup-webhook`
- Eventos a marcar: `orders.payment_paid` (este otorga el acceso) y, si se quiere recibir el aviso, `orders.creation` (se responde 200 y **no** otorga acceso: ese evento sale antes de confirmar el pago).
- Cada webhook tiene una firma secreta en el detalle. Tiendup la manda en el header `x-tiendup-signature`. Esa firma, tal cual, va en `TIENDUP_WEBHOOK_SECRET`. Si la variable no está, el endpoint responde 503 y no toca ningún usuario.
- La función (`api/tiendup-webhook.js`, sin dependencias npm, `fetch` directo a Supabase):
  1. Solo acepta POST (cualquier otro método: 405).
  2. Compara la firma. La doc oficial no publica un algoritmo HMAC; se acepta la firma secreta en el header y, además, un HMAC-SHA256 del body crudo. Si no coincide: 401.
  3. En un pago confirmado, busca al comprador por **email exacto** (`filter` + coincidencia exacta, nunca el primer usuario de la lista). Si no existe, lo crea con `email_confirm: true`, sin contraseña, y vuelve a comprobar que el id devuelto es de ese mismo mail.
  4. Escribe solo la fila `profiles` de ese id: `role = premium` (si ya era `admin`, lo deja admin), `premium_expira_en = null`, `origen_acceso = compra`, `purchased_at`, y `has_access = true` para que la columna vieja no quede en falso. El gate mira `role` y `premium_expira_en`, no `has_access`.
- Los logs no guardan el body ni el mail. Si falta el email en un pago, el log trae solo los nombres de los campos (`claves`), para poder ajustar el parser sin datos personales.
- **Variables de entorno en Vercel** (Production y Preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TIENDUP_WEBHOOK_SECRET`. Las tres son obligatorias.
- Para probar: en el webhook de Tiendup, "Enviar evento de prueba", y después una compra real. En los logs de la función tiene que aparecer `prueba` o `ignorado` en el ensayo, y `acceso_activado` en la compra. El evento de prueba no debe crear un premium si Tiendup lo marca como test o si el mail es de un dominio reservado (`example.com`).
- Existe además una edge function de Supabase llamada `tiendup-webhook` (con `verify_jwt` activo). Este cambio **no la borra ni la despliega**. Se puede desactivar más adelante para que no quede un segundo camino de acceso.

## Funcionalidades ya construidas

- Buscador con autocomplete de aeropuertos (origen/destino/escala), agrupado por país, dentro de un bottom sheet.
- Selector opcional de aerolínea (incluye low-cost regionales: JetSMART, FlyBondi, GOL, Azul, Arajet, Volaris, Plus Ultra, World2Fly).
- Cálculo de distancia (haversine) y banda de compensación EC261 (€250/€400/€600).
- Salas VIP: datos curados y verificados para ~13 aeropuertos; fallback genérico (mencionando DragonPass/Priority Pass) para el resto — **regla de negocio explícita: nunca inventar una sala VIP no verificada.**
- Glosario con menú buscable (tab inferior) + fichas de detalle individuales.
- Guardar rutas favoritas (hoy en `localStorage`, no en la cuenta — no viaja entre dispositivos).
- Compartir resultado como imagen (se genera un PNG con `<canvas>`, formato historia de Instagram, y se comparte vía Web Share API con archivo — así aparece Instagram/WhatsApp entre las opciones, no solo mail/mensajes).
- Instalación como PWA (banner custom, maneja Android/Chrome con `beforeinstallprompt` e iOS con instrucciones manuales).

## Decisiones técnicas ya tomadas (no las reabramos sin buen motivo)

- **Magic link → código OTP:** se abandonó el login por link porque los escáneres de seguridad de los mails (Gmail y otros) "clickean" el link automáticamente para escanearlo, gastando el token de un solo uso antes de que el usuario lo toque. El código de 6-8 dígitos es inmune a eso porque nadie más que el usuario lo tipea.
- **Deploy vía Vercel Drop → GitHub:** el proyecto arrancó con un deploy manual arrastrando archivos ("Vercel Drop"). Se migró a deploy vía Git porque el método Drop no soporta actualizaciones limpias y porque perdía la configuración de "qué archivo servir como raíz" en cada redeploy. **El archivo principal se llama `index.html`, no `hack-finder.html`** (se renombró específicamente para evitar tener que configurar rutas especiales en Vercel).
- **Sin candado ni CTA de compra dentro de la app:** existía un diseño freemium (una card con blur + botón "comprá el manual") pero se sacó por completo cuando se activó el webhook de Tiendup — ya que solo entra gente que pagó, no tiene sentido seguir mostrando el paywall.

## Contexto de negocio (por si es relevante para alguna decisión de producto)

- El ebook "El Viajero Premium" se vende hoy a $47 (precio de lanzamiento fue $27→$47, con siguiente escalón pensado a $67).
- Se está evaluando lanzar el combo Ebook + Hack Finder a $47 de lanzamiento → $97 precio regular. **Todavía no está armado como producto separado en Tiendup.**
- Checkout: Tiendup → redirige a MercadoPago.
- Mail de bienvenida post-compra (dentro de la automatización nativa de Tiendup) ya incluye mención de la app con el link a `app.viajealinfinito.com` y una mini guía de cómo entrar.

## Sugerencias de roadmap ya conversadas, no construidas

En orden de prioridad sugerido, ninguna implementada todavía:
1. Estado del vuelo en tiempo real (requeriría una API externa tipo AeroDataBox).
2. Countdown + notificaciones push atadas a la fecha real del vuelo.
3. Perfil de fidelidad guardado (tarjetas/programas de millas del usuario, para filtrar hacks relevantes a su situación).
4. Panel para editar aeropuertos, salas y promos sin tocar código. La pestaña Admin que cambia el `role` de un perfil ya está. Los datos de aeropuertos, salas y glosario ya se leen desde Supabase.
