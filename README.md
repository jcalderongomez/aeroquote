# AEROQUOTE

Aplicación web multiempresa para gestionar clientes, servicios, cotizaciones y propuestas comerciales para empresas de servicios con drones.

## Requisitos

- Node.js 20.19 o posterior.
- PostgreSQL 15 o posterior.
- npm.

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta `DATABASE_URL`, un `AUTH_SECRET` aleatorio y los datos de la organización y su administrador inicial. Configura `APP_URL` como la URL canónica de la aplicación (HTTPS en producción); se usa para formar enlaces públicos y nunca se toma del encabezado `Host` de una solicitud.

3. Genera el cliente Prisma y aplica las migraciones:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Crea la organización y el administrador inicial:

   ```bash
   npm run db:seed
   ```

   La contraseña inicial debe tener al menos 12 caracteres. El seeder crea la organización, usuario administrador, membresía y configuración inicial. Volver a ejecutarlo actualiza el nombre de la organización y del administrador, pero no restablece la contraseña de una cuenta ya existente.

5. (Opcional) Carga el catálogo inicial de servicios:

   ```bash
   npm run db:seed-services
   ```

   El catálogo se carga para `aeroquote-demo` (o para el slug indicado mediante `ORGANIZATION_SLUG`), sin duplicar ni sobrescribir servicios existentes. Las tarifas son COP 0, no son referencias de mercado y deben verificarse y configurarse antes de cotizar.

6. Inicia el servidor:

   ```bash
   npm run dev
   ```

Abre `http://localhost:3000` e inicia sesión con el correo y contraseña de `INITIAL_ADMIN_EMAIL` y `INITIAL_ADMIN_PASSWORD`.

## Funcionalidad implementada

- Inicio de sesión con Auth.js Credentials y contraseñas almacenadas como hashes.
- Organización, membresías y roles: administrador, comercial y operador. El administrador puede crear usuarios con contraseña temporal, asignar roles y revocar accesos.
- Cambio de contraseña obligatorio para cuentas iniciales y nuevas cuentas de equipo.
- Clientes editables y catálogo de servicios aislados por organización, con formulario para editar tarifas, descripciones, categorías, unidades y estado activo.
- Formulario de administración para actualizar razón social, NIT, correo, teléfono, dirección y ciudad.
- Cotizaciones con líneas de servicio editables, descuentos, costos internos, términos comerciales, vigencia e impuestos configurables.
- Descarga de cotizaciones en PDF para imprimir desde el detalle de la cotización, incluso antes de publicarla; el PDF excluye los costos internos.
- Cálculos con precisión decimal, seguimiento de estados e historial.
- Publicación de propuestas inmutables por versión, con enlace aleatorio de acceso, página pública, PDF y respuesta del cliente (aprobación, rechazo o solicitud de cambios).
- Dashboard con indicadores consultados desde PostgreSQL.
- Costos y rentabilidad separados de la página pública y del PDF; solo están disponibles para administrador y comercial.

Los operadores no tienen acceso a clientes, catálogo ni cotizaciones. La pantalla de proyectos asignados no está implementada.

## Preparación antes de vender

- Cambia la contraseña inicial al primer ingreso. Las propuestas generadas por primera vez deben compartirse manualmente copiando el enlace y enviándolo desde un canal seguro; no hay envío de correo integrado.
- Configura y prueba `APP_URL` en el dominio HTTPS de producción antes de publicar propuestas.
- Revisa los datos legales/comerciales de la empresa, impuestos y vigencias. La configuración de impuestos es un porcentaje, no asesoría fiscal ni cumplimiento tributario automático.
- Define y verifica tus propias tarifas: el catálogo de muestra se carga con precios en cero y no representa precios de mercado.
- Despliega sobre un proveedor de PostgreSQL y hosting administrados, configura copias de seguridad y monitoreo, y prueba restauración antes de usar datos reales.
- Los enlaces son credenciales bearer: quien los tenga puede consultar la propuesta y responder hasta su expiración. Envíalos únicamente al contacto previsto.

## Decisiones técnicas

- Monolito modular con Next.js App Router; la interfaz, las rutas API, la lógica de cálculo y la persistencia se mantienen separadas.
- PostgreSQL y Prisma almacenan organizaciones, membresías, clientes, catálogo, cotizaciones e historial.
- Todas las consultas de negocio se filtran por la organización de la sesión. La sesión JWT revalida la membresía y el rol en la base de datos.
- El motor independiente de cotización usa `decimal.js`; precios, impuestos, descuentos, costos y márgenes se validan en servidor.
- Los enlaces de propuestas autentican por posesión del enlace; no existe verificación de identidad del destinatario, firma electrónica ni envío de correo.

## Comandos

```bash
npm run lint
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed-services
```

## Límites conocidos

- No incluye envío de correo, adjuntos, suscripciones, gestión de pagos, operaciones de vuelo ni asignación de una misma cuenta a varias organizaciones.
- La configuración tributaria es un porcentaje aplicado al subtotal; no sustituye asesoría fiscal ni configura impuestos por servicio.
- Los permisos se basan en roles fijos.
- La seguridad multiempresa se aplica en las consultas de la aplicación; PostgreSQL RLS requiere una decisión y prueba técnica posterior.
- Antes de producción deben configurarse `AUTH_SECRET`, `APP_URL`, HTTPS, copias de seguridad, monitoreo y un proveedor administrado de PostgreSQL/hosting.
