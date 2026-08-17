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
| `airports` | ~63 aeropuertos (código, ciudad, país, lat/lng, flag, is_eu) | Cargada, pero la app **todavía no la lee** — sigue usando un objeto JS hardcodeado (`AIRPORTS`) dentro de `index.html`. Son los mismos datos duplicados en dos lugares. |
| `lounges` | ~20 salas VIP verificadas, ligadas a `airport_code` | Misma situación: cargada en Supabase, pero la app lee del objeto JS `LOUNGES` hardcodeado. |
| `glossary_terms` | Definida en el esquema | Nunca se migró el contenido — el glosario real vive en el objeto JS `GLOSARIO` dentro del HTML. |
| `promos` | Definida, para futuras colaboraciones con bancos/aerolíneas | Vacía, sin usar todavía. |
| `profiles` | `id` (= `auth.users.id`), `email`, `has_access`, `purchased_at`, `created_at` | En uso activo — acá es donde se guarda quién tiene acceso pago. |

**Políticas RLS activas:**
```sql
create policy "usuarios ven su propio perfil"
on profiles for select
using (auth.uid() = id);

grant select on public.profiles to authenticated;
```
⚠️ **Lección aprendida y OJO para el futuro:** una política RLS por sí sola **no alcanza** — Supabase también necesita el `GRANT` explícito a nivel de tabla para el rol correspondiente (`authenticated` o `anon`). Si en el futuro se migra `airports`/`lounges`/`glossary_terms` a lectura desde el cliente, van a necesitar su propio `grant select ... to anon` (son datos públicos, no sensibles) además de cualquier policy.

**Migración pendiente (la pieza grande que falta):** mover `AIRPORTS`, `LOUNGES` y `GLOSARIO` de estar hardcodeados en el HTML a consultarse en vivo desde Supabase. Esto es el requisito previo para construir el **panel de administración** (pantalla donde Rodrigo agregue/edite/borre aeropuertos, salas VIP y promos sin tocar código). Ninguna de las dos cosas está construida todavía.

## Autenticación

- **Método:** código de acceso de 6-8 dígitos por mail (NO magic link — se abandonó el magic link a propósito, ver "Decisiones técnicas" abajo).
- **Flujo:** `signInWithOtp({email})` → el usuario recibe un mail con un código → lo tipea en la app → `verifyOtp({email, token, type:"email"})` → se chequea `profiles.has_access` → si es `true`, pasa; si no, ve un mensaje de "no encontramos tu compra".
- **Plantilla del mail:** editada en Supabase → Authentication → Emails → "Magic link or OTP". Usa la variable `{{ .Token }}` (con T mayúscula — es sensible a mayúsculas/minúsculas, causó un bug real).
- ⚠️ **Pendiente de seguridad antes de escalar:** el toggle "Allow new users to sign up" en Supabase Auth está **activado**. Hoy no es grave porque sin `has_access=true` nadie pasa del gate, pero antes de un lanzamiento más grande convendría revisar si conviene desactivarlo (evita que cualquiera cree una cuenta, aunque sea inútil sin acceso).
- **UI del login:** vive en `#auth-gate`, con 5 estados manejados por `mostrarPaso()`: `checking`, `email`, `loading`, `sent` (ahora es la pantalla de ingresar el código, el nombre del id quedó del diseño viejo), `noaccess`.

## Automatización de la venta (Tiendup → acceso automático)

- Tiendup dispara el evento **`orders.payment_paid`** (confirmación de pago, no `orders.creation` que dispara antes de confirmar) hacia:
  `https://app.viajealinfinito.com/api/tiendup-webhook?key=[TIENDUP_WEBHOOK_SECRET]`
- Como Tiendup no tiene campo nativo de "secret" para firmar el webhook, el secreto va **embebido en el query string de la URL**.
- La función (`api/tiendup-webhook.js`, sin dependencias npm, usa `fetch` directo a la API de Supabase):
  1. Extrae el mail del comprador del body (prueba varios formatos posibles, porque no hay documentación pública de Tiendup sobre el shape exacto del payload — **si algo falla, revisar los logs de Vercel Functions, ahí queda logueado el body completo**).
  2. Busca si el usuario ya existe en Supabase Auth; si no, lo crea (`email_confirm: true`, sin contraseña).
  3. Hace upsert en `profiles` con `has_access: true`.
- **Variables de entorno en Vercel** (Project Settings → Environment Variables): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (la secret key de Supabase — nunca debe aparecer en el código ni en el frontend), `TIENDUP_WEBHOOK_SECRET`.
- **Nunca probado con una venta real todavía** — Tiendup no ofrece botón de "test webhook". La primera compra real es la primera prueba de fuego; conviene revisar los Vercel Function Logs después de la primera venta para confirmar que corrió bien.

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
4. Panel de administración (depende de migrar los datos a Supabase primero, ver arriba).
