# Portal de seguimiento de avance ODN — Brief de desarrollo

## 0. Contexto de negocio

Empresa de despliegue de redes FTTH. El tendido se divide en **troncal** y **ODN
(distribución)**. Este portal mide avance de ODN por **NAPs construidos** dentro
de cada **PD** (punto de distribución, identificado por un prefijo de 4 letras).

Ejemplo: si una PD tiene 100 NAPs y 40 están construidos → 40% de avance ODN.

Dos tipos de usuario:
- **Administrativos** (con usuario/contraseña): cargan PDs, asignan proveedores,
  hacen seguimiento del avance. Vuelcan esta info a Maximo manualmente.
- **Proveedores contratistas** (sin usuario/contraseña): reciben un link único
  por PD y ahí tildan avance diario.

---

## 1. Stack técnico

- **Next.js 14 (App Router)** + TypeScript, desplegado en **Vercel**.
- **Supabase**: Postgres (esquema ya definido, ver `01_schema_supabase.sql`),
  Auth (solo para administrativos), Storage (bucket privado `nap-photos`).
- **UI**: Tailwind CSS + shadcn/ui.
- **Parseo de Excel**: `xlsx` (SheetJS) en el servidor.
- **Generación de ZIP de exportación**: `archiver` (Node) en una API route.
- **Generación de Excel de exportación**: `exceljs`.
- El bucket de Storage es **privado**. Todo acceso a fotos (lectura y
  escritura) pasa por API routes de Next.js usando la **service role key**
  de Supabase (nunca expuesta al cliente). El portal del proveedor no tiene
  sesión de Supabase Auth — su autorización es el `link_token` (UUID) en la
  URL, validado en cada API route contra la tabla `pds`.

### Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # solo server-side, nunca en el cliente
```

---

## 2. Modelo de datos

Ejecutar `01_schema_supabase.sql` en el SQL Editor de Supabase antes de
arrancar el desarrollo. Resumen de tablas:

| Tabla | Qué guarda |
|---|---|
| `regions` | CABA, GBA Oeste, GBA Sur, GBA Norte (precargadas) |
| `admin_profiles` | Perfil de cada admin: rol (`admin`/`superadmin`) y región (null si superadmin) |
| `providers` | Lista de proveedores contratistas |
| `pds` | Cada PD: código de 4 letras, región, proveedor asignado, `link_token` |
| `naps` | Cada NAP dentro de una PD: `construido`, `pruebas_opticas`, `active` |
| `nap_photos` | Fotos por NAP y categoría (`construido` max 1, `pr_optica` max 10) |
| `pd_daily_snapshots` | Snapshot diario de avance por PD (para la línea de tiempo) |
| `pd_uploads` | Historial de cargas de Excel por PD, con diffs de NAPs agregados/faltantes |
| `audit_log` | Registro de acciones sensibles (destildes, borrados) |

Funciones RPC ya creadas en el SQL:
- `remove_nap(p_nap_id uuid)`: da de baja un NAP (soft delete, `active=false`).
  Si el NAP ya tiene avance cargado (tildado o con fotos), **solo el
  superadmin** puede ejecutarla; si está sin tocar, cualquier admin regional
  puede.

Los snapshots diarios (`pd_daily_snapshots`) se generan solos vía trigger en
Postgres cada vez que cambia un NAP — no hay que calcularlos a mano en el
backend de Next.js.

---

## 3. Roles y permisos

| Acción | Admin regional | Superadmin |
|---|---|---|
| Ver PDs de su región | ✅ | ✅ (todas las regiones) |
| Cargar Excel de una PD nueva | ✅ (en su región) | ✅ |
| Re-cargar Excel de una PD existente | ✅ | ✅ |
| Asignar/reasignar proveedor | ✅ | ✅ |
| Ver panel de seguimiento y línea de tiempo | ✅ (su región) | ✅ (todas) |
| Exportar (global, por PD, por NAP) | ✅ (su región) | ✅ (todas) |
| Eliminar un NAP sin avance cargado | ✅ | ✅ |
| Eliminar un NAP **con avance ya cargado** (tildado o con fotos) | ❌ | ✅ (con confirmación) |
| Gestionar cuentas de administrativos | ❌ | ✅ |

El proveedor (portal público sin login) solo puede: tildar/destildar
`construido` y `pruebas_opticas`, y subir/editar/borrar fotos — únicamente
de los NAPs que pertenecen a la PD de su `link_token`. No puede eliminar
NAPs.

---

## 4. Flujo: alta de PD y purga del Excel

1. El admin sube un archivo Excel (mismo formato que el ejemplo real:
   hoja `Lista de registros`, columnas `Activo`, `Clasificación`,
   `Construido`, `Pr. ópticas`, entre otras).
2. **Purga**: quedarse únicamente con las filas donde `Clasificación === 'NAP'`.
   Descartar CDO, CABLE SUBTRONCAL FO, CABLE TRONCAL FO y cualquier otra.
3. **Inferencia de PD**: el código de PD son los primeros 4 caracteres de la
   columna `Activo` de cada fila NAP (ej: `RDOQB17` → PD `RDOQ`).
4. **Validación de un solo prefijo por archivo**: si el Excel purgado
   contiene NAPs con más de un prefijo de 4 letras distinto, **rechazar el
   archivo completo** con un mensaje claro pidiendo al admin que lo revise.
   No separar automáticamente.
5. Si la PD no existe todavía para esa región: crearla (nuevo `pds` +
   `naps` para cada NAP purgado, todos arrancan sin tildar) y generar el
   `link_token`.
6. Si la PD **ya existe** (mismo código + región): comparar el set de
   códigos de NAP del archivo nuevo contra los `naps.code` activos actuales:
   - **Códigos nuevos que no estaban** → agregarlos automáticamente como
     NAPs nuevos (sin tildar).
   - **Códigos que ya no aparecen en el archivo nuevo** → NO borrar
     automáticamente. Crear un registro en `pd_uploads` con
     `status='pending_review'` y `missing_codes`, y mostrarle al admin una
     alerta explícita para que decida (ver `remove_nap` para las reglas de
     quién puede confirmar la baja según si el NAP tiene avance o no).
   - Guardar siempre un registro en `pd_uploads` con el resultado (aunque
     sea `status='applied'` sin pendientes).

---

## 5. Portal del proveedor (`/p/[token]`, sin login)

- Resolver el `link_token` de la URL contra `pds.link_token`. Si no existe,
  página de error simple ("Link inválido o vencido").
- Header fijo: nombre de la PD, % ODN calculado en vivo, contador
  "X construidos de Y" y "X con pruebas ópticas de Y".
- Lista de NAPs de esa PD (solo `active = true`). Por cada NAP, una fila/card
  con:
  - Checkbox **Construido**: se puede tildar sin exigir foto. Al destildar,
    mostrar modal de confirmación ("¿Seguro que querés destildar
    Construido? Se perderá el estado de avance de este ítem.").
  - Checkbox **Pruebas ópticas**: al tildar, **abrir automáticamente el
    selector de archivos/galería** (`<input type="file" capture>` con click
    programático). Si el usuario cierra el selector sin elegir ninguna
    foto, el checkbox vuelve a quedar destildado (no se marca como hecho
    sin al menos 1 foto). Una vez tildado, se pueden agregar más fotos
    (hasta 10 en total), editarlas o borrarlas libremente. Al destildar,
    mismo modal de confirmación que "Construido" — pero **las fotos ya
    subidas no se borran**, quedan asociadas al NAP.
  - Cada categoría de foto (`construido`, `pr_optica`) tiene su **carrusel
    de fotos autocontenido**: imágenes en un contenedor de tamaño fijo
    (`object-fit: contain`, sin desbordar aunque la resolución original sea
    enorme), navegable con flechas/dots, sin necesidad de descargar para
    verlas. Categoría `construido` muestra 1 sola foto (sin flechas de
    navegación). Categoría `pr_optica` es carrusel real hasta 10 fotos.
  - Botón opcional para subir foto en cualquiera de las dos categorías, sin
    ser obligatorio para completar el NAP salvo la regla de "pruebas
    ópticas exige al menos 1 foto" ya descripta.
- Toda escritura (tildar, destildar, subir/borrar foto) pega contra API
  routes que validan el `link_token`, escriben con la service role key, y
  loguean en `audit_log` con `actor_type='provider_link'`.

---

## 6. Panel del admin (`/dashboard`, con login)

### 6.1 Alta de PD
- Formulario: subir Excel, seleccionar proveedor de una lista (o crear uno
  nuevo), región pre-fijada a la del admin (o seleccionable si es
  superadmin). Al confirmar, corre el flujo de la sección 4 y muestra el
  link generado con botón "Copiar link".

### 6.2 Listado de seguimiento
- Tabla de todas las PDs de la región del admin (o todas si superadmin),
  con: código, proveedor, % ODN, construidos/total, pruebas ópticas/total,
  fecha de última actualización.
- Filtros por proveedor y por estado de avance.
- Click en una PD → vista de detalle.

### 6.3 Detalle de PD
- Header con métricas grandes (% ODN, construidos, pruebas ópticas).
- **Línea de tiempo**: gráfico o tabla día a día desde `pd_daily_snapshots`
  (histórico completo desde la creación de la PD), mostrando el delta
  respecto al día anterior (ej: "+3 construidos desde ayer"). Marcar
  visualmente los días sin cambios.
- Listado de NAPs de esa PD con su estado y miniaturas de fotos (mismo
  carrusel autocontenido que en el portal del proveedor, en modo
  solo-lectura para admin regional).
- Si hay un `pd_uploads` con `status='pending_review'`: banner de alerta
  mostrando los códigos de NAP que faltan en la última carga, con opción de
  resolver (confirmar baja o descartar la alerta).
- Botón "Eliminar NAP" visible únicamente para superadmin, con modal de
  confirmación, llama a la RPC `remove_nap`.

### 6.4 Exportación
Tres botones de exportación, todos generan un `.zip`:
- **Global**: todas las PDs visibles para el admin. Excel con una fila por
  NAP (PD, código, construido, pruebas ópticas, fechas, % de su PD) +
  carpeta de fotos con árbol `Proveedor / PD / NAP / CONSTRUIDO` y
  `Proveedor / PD / NAP / PR_OPTICA`.
- **Por PD**: mismo formato, acotado a una PD.
- **Por NAP**: ficha individual de un NAP (Excel de 1 fila + sus fotos).
- **Botón rápido "Solo pruebas ópticas" por PD**: descarga únicamente la
  rama de fotos `.../PR_OPTICA` de todos los NAPs de esa PD, sin el resto
  del árbol, para facilitar la carga de potencia a Maximo.

### 6.5 Gestión de administrativos (solo superadmin)
- CRUD simple de `admin_profiles`: crear admin con email/contraseña (usa
  `supabase.auth.admin.createUser` desde una API route con service role),
  asignar región y rol.

---

## 7. Estructura de carpetas sugerida (Next.js App Router)

```
app/
  (auth)/
    login/page.tsx
  dashboard/
    layout.tsx                    -- valida sesión + rol, guarda región en contexto
    page.tsx                      -- listado de PDs
    pds/
      nueva/page.tsx              -- alta de PD (subida de Excel)
      [pdId]/page.tsx             -- detalle de PD + timeline + export
    admins/page.tsx               -- gestión de administrativos (solo superadmin)
  p/
    [token]/page.tsx              -- portal público del proveedor
  api/
    pds/route.ts                  -- POST alta de PD (parseo + purga de Excel)
    pds/[pdId]/upload/route.ts    -- POST re-carga de Excel (diff)
    pds/[pdId]/export/route.ts    -- GET zip de exportación por PD
    pds/[pdId]/export-pr-optica/route.ts
    export/global/route.ts        -- GET zip global
    naps/[napId]/export/route.ts  -- GET ficha individual
    naps/[napId]/remove/route.ts  -- POST llama RPC remove_nap
    public/[token]/naps/route.ts        -- GET NAPs de la PD (portal proveedor)
    public/[token]/naps/[napId]/route.ts -- PATCH tildar/destildar
    public/[token]/naps/[napId]/photos/route.ts -- POST/DELETE fotos
lib/
  supabase/
    client.ts                     -- cliente browser (anon key)
    server.ts                     -- cliente server con cookies (auth SSR)
    admin.ts                      -- cliente con service role key (solo server)
  excel/
    parse.ts                      -- purga + inferencia de PD desde el Excel
    diff.ts                       -- comparación de códigos entre cargas
  export/
    buildZip.ts
    buildExcel.ts
components/
  provider-portal/
    NapCard.tsx
    PhotoCarousel.tsx
    ConfirmDismissModal.tsx
  dashboard/
    PdTable.tsx
    PdTimeline.tsx
    NapList.tsx
    ExportButtons.tsx
```

---

## 8. Orden de implementación sugerido

1. Correr `01_schema_supabase.sql` en Supabase. Crear el bucket privado
   `nap-photos` desde el dashboard.
2. Scaffold del proyecto Next.js + Tailwind + shadcn/ui + clientes de
   Supabase (browser, server SSR, admin).
3. Login de admin + middleware que protege `/dashboard` y redirige según
   sesión.
4. Alta de PD: parseo y purga de Excel (`lib/excel/parse.ts`) + validación
   de prefijo único + creación de PD y NAPs.
5. Portal del proveedor `/p/[token]`: lectura de NAPs, tildar/destildar,
   apertura automática de galería en "pruebas ópticas", carrusel de fotos.
6. Panel de seguimiento: listado de PDs + detalle + línea de tiempo
   (leyendo `pd_daily_snapshots`, que ya se generan solos por trigger).
7. Flujo de re-carga de Excel con diff (agregar automático / alerta de
   faltantes).
8. Exportaciones (global, por PD, por NAP, solo pruebas ópticas).
9. Gestión de administrativos (superadmin).
10. Pulido: estados de carga, manejo de errores, límites de tamaño de
    imagen antes de subir a Storage (comprimir en el cliente si hace falta
    para cuidar el storage).

---

## 9. Archivo de ejemplo

El Excel real de referencia tiene la hoja `Lista de registros` con columnas
`Activo, Clasificación, Fecha Prog. Comercial, Construido, Fecha Construido,
Pr. ópticas, E2E FO, D-ODN, CERTA, Habil. Red, Ok comercial, Fecha Hab.
Comercial, Habil. Comer., Edificios Construidos`. Del archivo de ejemplo
provisto, de 628 filas totales solo 39 son `Clasificación = 'NAP'` — esas
son las que hay que purgar y quedarse, agrupadas por el prefijo de 4 letras
de `Activo` (en el ejemplo, todas comparten el prefijo `RDOQ`).
