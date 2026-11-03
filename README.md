# AEROQUOTE

Aplicación multiempresa para gestionar clientes, servicios, cotizaciones y propuestas comerciales para empresas de servicios con drones. El repositorio está organizado como monorepo con dos proyectos independientes:

- `front/`: interfaz web Next.js, sesión Auth.js y proxy del navegador hacia la API.
- `back/`: API REST Next.js, autenticación de credenciales, reglas de negocio, PDFs y persistencia PostgreSQL con Prisma.

La interfaz y la API se desarrollan, ejecutan y compilan por separado. El frontend no importa Prisma ni se conecta directamente a PostgreSQL.

## Requisitos

- Node.js 20.19 o posterior.
- PostgreSQL 15 o posterior.
- npm.

## Configuración local

Instala todas las dependencias desde la raíz:

```bash
npm install
```

Configura los archivos de entorno por proyecto:

- Copia `back/.env.example` a `back/.env`. Define la conexión a PostgreSQL, un `AUTH_SECRET` aleatorio y único, `AUTH_URL` (URL del frontend), `APP_URL` y los datos del administrador inicial.
- Copia `front/.env.example` a `front/.env`. Usa el mismo `AUTH_SECRET`, configura `AUTH_URL` y `BACKEND_URL=http://localhost:3001`.
- No publiques archivos `.env` ni uses las contraseñas/secrets de ejemplo en producción.

Genera el cliente Prisma, crea/aplica las migraciones y carga el administrador inicial:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Opcionalmente carga el catálogo de muestra:

```bash
npm run db:seed-services
```

El catálogo de muestra tiene tarifas en COP 0; no son precios de mercado y deben verificarse antes de cotizar.

Inicia el frontend y el backend en dos terminales:

```bash
npm run dev:back
npm run dev:front
```

- Interfaz: <http://localhost:3000>
- API/health: <http://localhost:3001/api/health>

El frontend envía las llamadas de negocio al backend. Las llamadas del navegador pasan por un proxy del mismo origen para conservar la cookie de sesión; las páginas del servidor consultan el backend enviando la cookie de forma interna. El backend valida cada sesión y membresía contra la base de datos.

## Comandos

```bash
npm run lint
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:seed-services
```

También se pueden ejecutar comandos por proyecto:

```bash
npm run dev --workspace @aeroquote/back
npm run dev --workspace @aeroquote/front
npm run build --workspace @aeroquote/back
npm run build --workspace @aeroquote/front
npm run lint --workspace @aeroquote/back
npm run lint --workspace @aeroquote/front
```

## Funcionalidad

- Autenticación de usuarios, cambio de contraseña obligatorio, roles y administración del equipo.
- Clientes y catálogo editables, con aislamiento por organización.
- Cotizaciones con líneas de servicio, descuentos, costos internos, términos, impuestos configurables e historial.
- PDF comercial descargable para imprimir; los costos y márgenes internos no se incluyen.
- Propuestas públicas con versiones inmutables, enlace aleatorio de acceso, PDF y respuesta del cliente.
- Costos y rentabilidad visibles solo para administrador y comercial.

El correo de propuestas se comparte manualmente; no hay proveedor de email integrado. Los enlaces son bearer tokens: quien los tenga puede consultar y responder la propuesta hasta su vencimiento.

## Despliegue

### Demo gratuita con Render y Neon

El archivo `render.yaml` configura `front/` y `back/` como servicios web gratuitos en Render (región Ohio), comparte un `AUTH_SECRET` generado por Render y conecta automáticamente sus URLs públicas. El backend aplica las migraciones y carga el administrador inicial y el catálogo de muestra al iniciar. Los comandos de carga son idempotentes.

1. Crea una cuenta y un proyecto gratuito en [Neon](https://neon.tech/), seleccionando AWS US East (Ohio, `aws-us-east-2`) para acercar la base de datos a Render.
2. Copia la cadena de conexión directa de PostgreSQL (sin `-pooler`) y conserva `sslmode=require`.
3. En [Render](https://render.com/), crea un Blueprint desde este repositorio de GitHub y confirma los servicios definidos en `render.yaml`.
4. Cuando Render solicite valores, agrega la cadena de Neon en `DATABASE_URL`, la URL HTTPS pública de `aeroquote-front` en `AUTH_URL` y `APP_URL`, un correo para `INITIAL_ADMIN_EMAIL` y una contraseña única de al menos 12 caracteres en `INITIAL_ADMIN_PASSWORD`. Render generará y compartirá `AUTH_SECRET`; no lo reemplaces por un valor público ni lo subas a Git. `BACKEND_URL` se enlaza automáticamente a la URL pública del backend.
5. Espera a que los dos servicios indiquen estado `Live`. Abre la URL pública de `aeroquote-front` e inicia sesión con el correo y la contraseña de administrador configurados. La cuenta exigirá cambiar la contraseña en el primer acceso.

Este despliegue inicia con una base vacía: no copia datos locales. La carga inicial agrega una organización y servicios de muestra con tarifas en COP 0; configura los precios antes de emitir cotizaciones. Guarda aparte la cadena de conexión y las credenciales de administración, y prepara respaldos antes de cargar información real.

Los planes gratuitos son para demos: Render duerme los servicios tras 15 minutos sin tráfico y el siguiente acceso puede tardar cerca de un minuto. Render indica que sus instancias gratuitas no son para producción; Neon también suspende la base tras inactividad y aplica límites de uso. Verifica sus condiciones vigentes antes de depender del sistema comercialmente.

### Despliegue manual

Despliega `front/` y `back/` como servicios separados. Configura `AUTH_URL` del backend y `APP_URL` con la URL pública HTTPS del frontend, un `BACKEND_URL` accesible desde el servidor frontend, el mismo `AUTH_SECRET` en ambos proyectos, `AUTH_TRUST_HOST=true` en el frontend y `DATABASE_URL` solo en el backend. Aplica las migraciones con:

```bash
npm run db:deploy
```

No expongas PostgreSQL a Internet ni publiques secretos. Configura TLS, copias de seguridad y monitoreo. Revisa las vulnerabilidades detectadas por `npm audit` antes del despliegue público.

La configuración tributaria es un porcentaje aplicado al subtotal y no reemplaza asesoría fiscal ni cumplimiento tributario. Las tarifas de muestra son cero y no representan precios de mercado.
