# 🛒 Plataforma Inteligente de Inteligencia de Precios — Backend Monolito Modular

Backend empresarial desarrollado en **NestJS (Node.js & TypeScript)** con separación por capas
(presentation / application / infrastructure) por Bounded Context, documentación OpenAPI,
geolocalización con **PostGIS** y un frontend **Next.js 14**.

> Este documento refleja el **estado real** del código. Las secciones marcadas como
> _(Roadmap)_ describen funcionalidad **planificada pero no implementada** todavía.

---

## 🏗️ Arquitectura y Tecnologías (implementado)

- **Core Framework:** NestJS (Node.js v20+) + TypeScript
- **Base de Datos:** PostgreSQL 16 + extensión geoespacial **PostGIS 3.4**
- **ORM:** TypeORM (`ST_DistanceSphere` / `ST_DWithin` sobre `geography`)
- **Documentación OpenAPI:** Swagger UI en `/docs`
- **Seguridad HTTP:** `helmet` + CORS configurable por whitelist
- **Tests:** Jest (unit tests de los casos de uso)
- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS, Zustand, next/image

## 🔜 Roadmap (declarado, no implementado)

Estas piezas estaban listadas como si existieran, pero **no hay código que las use**. Se dejan
como roadmap para no confundir el estado del proyecto:

- **Redis / BullMQ** (caché y colas) — infraestructura levantada en `docker-compose`, sin uso en código.
- **Elasticsearch** (búsqueda full-text) — contenedor en `docker-compose`, sin uso en código.
- **CQRS** (`@nestjs/cqrs`) — los casos de uso se invocan directamente, sin buses.
- **Autenticación JWT / Passport** — no hay guards ni endpoints de auth.
- **OCR de tickets (Azure AI Document Intelligence)** — el modal del frontend es una simulación; no hay endpoint backend.

---

## 📁 Estructura del Monolito Modular

```
supermarket-platform/
├── docker-compose.yml                      # PostgreSQL PostGIS (+ Redis/Elasticsearch del roadmap)
├── docker-compose.dev.yml                  # Stack de desarrollo completo (Postgres + backend + frontend)
├── init-postgis.sql                        # Inicialización de extensiones PostGIS
├── INFORME-CAMBIOS.md                      # Informe de fixes críticos aplicados
├── scripts/                                # Scripts de desarrollo (Windows, sin admin)
│   ├── dev.cmd                             # Levanta TODO (Postgres + backend + frontend)
│   ├── stop-dev.cmd                        # Detiene TODO
│   ├── start-postgres.cmd                  # Inicia el PostgreSQL portátil
│   └── stop-postgres.cmd                   # Detiene el PostgreSQL portátil
└── backend/
    ├── Dockerfile.dev                      # Imagen de desarrollo del backend
    ├── src/
    │   ├── main.ts                         # Entrypoint NestJS + Swagger + helmet + CORS
    │   ├── app.module.ts                   # Root Module (synchronize=false en runtime)
    │   ├── common/infrastructure/database/ # data-source CLI, seeder standalone, migraciones
    │   └── modules/
    │       ├── stores/                     # Supermercados y sucursales geo (PostGIS)
    │       ├── catalog/                    # Catálogo, productos EAN, búsqueda + precios
    │       ├── pricing/                    # BranchProduct y PriceHistory
    │       └── cart/                       # Optimización mono-tienda vs multi-tienda
    └── frontend/ (Next.js)                 # Dockerfile.dev incluido
```

---

## 🚀 Guía de Inicio Rápido

Hay tres formas de levantar el entorno. **Elegí una.**

### Opción A — Script local todo-en-uno (Windows, sin Docker ni admin) ⭐

La más simple en esta máquina: un solo comando levanta base de datos, backend y frontend
(hot reload en dos ventanas). Usa el PostgreSQL 17 + PostGIS 3.6 portátil ya instalado.

```bat
scripts\dev.cmd        REM levanta TODO
scripts\stop-dev.cmd   REM detiene backend, frontend y PostgreSQL
```

- El script es **idempotente**: si Postgres ya está corriendo no lo reinicia, y el `seed` omite si ya hay datos.
- Instala dependencias solo si falta `node_modules`.

### Opción B — Docker Compose (cualquier SO con Docker)

```bash
docker compose -f docker-compose.dev.yml up --build
```

Levanta Postgres+PostGIS, backend (con seed automático) y frontend. URLs:
`http://localhost:3001` (web) y `http://localhost:3000/docs` (Swagger).
Para bajar todo y borrar datos: `docker compose -f docker-compose.dev.yml down -v`.

> `docker-compose.yml` (sin `.dev`) es la infraestructura suelta del roadmap (Postgres + Redis + Elasticsearch).
> El compose de desarrollo es `docker-compose.dev.yml`.

### Opción C — Manual paso a paso

```bash
# 1) Base de datos (elegí una)
scripts\start-postgres.cmd          # PostgreSQL portátil (sin admin)
#   o bien:  docker-compose up -d postgres

# 2) Backend  (http://localhost:3000)
cd backend
npm install
npm run seed        # crea esquema + datos de prueba (idempotente)
npm run start:dev

# 3) Frontend (http://localhost:3001)  — en otra terminal
cd frontend
npm install
npm run dev
```

App web: **`http://localhost:3001`** (Next.js corre en 3001 para no chocar con el backend en 3000).
Copiá `frontend/.env.example` a `frontend/.env` si el backend no está en `http://localhost:3000/api/v1`.

---

## 📍 Geolocalización

La app **usa tu ubicación real**, no coordenadas fijas:

- Al abrir, pide la posición al navegador (`navigator.geolocation`).
- Resuelve la dirección legible con **OpenStreetMap / Nominatim** (ej. `Punta Lara, Ensenada`).
- Si denegás el permiso o el navegador no lo soporta, cae a una ubicación por defecto y lo avisa.
- El chip de ubicación del header es clicable: vuelve a pedir la posición.
- Hay un **selector de radio** (2 / 5 / 10 / 25 / 50 km) junto a la barra de sucursales.

El backend calcula distancias con `ST_DistanceSphere` y filtra con `ST_DWithin` sobre `::geography`
(**metros reales**, no grados).

> El fallback mock del frontend también calcula distancias con Haversine contra tu posición real,
> así el modo offline respeta la geolocalización.

### Datos de prueba por zona

| Zona | Sucursales | Distancia |
|---|---|---|
| CABA (Obelisco / San Telmo / Abasto) | Carrefour, Coto, Día % | 0.06 – 2.65 km del Obelisco |
| Ensenada / La Plata / Gonnet | Día % ×3, Carrefour Tolosa, Wangs ×2, Super Vea, Vigoroso | 6 – 9 km desde Punta Lara (Ensenada) |

Los datos de la zona Ensenada/La Plata provienen de **OpenStreetMap**.

---

## 📈 Historial de precios y 📸 Evidencias de la comunidad

### Historial de precios

Cada vez que un precio **cambia** se guarda una observación (en la ingestion oficial y también
cuando un usuario reporta un precio). Eso alimenta un endpoint con la serie y estadísticas:

```bash
GET /api/v1/products/{productId}/history?latitude=..&longitude=..&limit=100
```

```json
{
  "series": [{ "date": "2026-10-21T00:00:00Z", "price": 6529, "listPrice": null, "source": "SEPA", "branchName": "163 - ENSENADA" }],
  "stats": { "observations": 12, "min": 6333, "max": 6990, "average": 6642, "first": 6990, "last": 6529, "changePercent": -6.6 }
}
```

En la UI, cada tarjeta de producto tiene **"Ver historial de precios"**: abre el mínimo, máximo,
promedio, variación y la lista de cambios con su origen.

### Evidencias de la comunidad (OCR)

Los usuarios reportan precios con una foto del ticket. El backend lo valida con un **TrustScore (0-100)**:

| Factor | Puntos | Qué mide |
|---|---|---|
| Base | 25 | Puntaje inicial |
| Evidencia | +20 | Vino con imagen del ticket |
| Sucursal | +10 | La sucursal existe en el catálogo |
| Producto | +10 | El EAN existe en el catálogo |
| Corroboración | +15 | El ticket contiene el mismo producto al mismo precio |
| Coherencia | +20 / +10 / 0 / −15 | Qué tan lejos está del precio conocido |
| Reputación | 0 a +10 | Antecedentes del reportante |

- **≥ 85** → `APPROVED`: se aplica el precio a la sucursal y se suma reputación.
- **60–84** → `PENDING`: queda en revisión (no modifica el precio).
- **< 60** → `REJECTED`: se descarta.

El precio oficial pesa más que un ticket individual: se blendea por confianza, así un reporte
no pisa el dato de SEPA.

```bash
POST /api/v1/evidences
{
  "branchId": "uuid",
  "reporterId": "rep_abc123",
  "productId": "uuid",
  "reportedPrice": 6400,
  "imageBase64": "data:image/jpeg;base64,..."
}

GET /api/v1/evidences/reputation/{reporterId}
```

El OCR usa **Azure AI Document Intelligence** (modelo `prebuilt-receipt`) si hay
`AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` + `KEY` configurados. Si no los hay, el backend usa el
extractor por defecto (el cliente manda los items ya extraídos) y el flujo sigue funcionando.

---

## 💰 Precios: fuente oficial SEPA ("Precios Claros")

Los precios **no son inventados**. Vienen de **SEPA**, la base oficial de la Secretaría de
Industria y Comercio, donde los comercios publican sus precios **por punto de venta** todos los días.

- El **seed** carga un *snapshot* de SEPA (`backend/src/common/infrastructure/database/seeders/sepa-snapshot.ts`),
  con el precio de lista real de cada sucursal y EAN válidos.
- El módulo `ingestion` trae los precios **vivos** de cualquier zona:

```bash
cd backend
npm run ingest:prices -- --lat=-34.8207 --lng=-57.9675 --radius=10
npm run ingest:prices -- --lat=-34.8207 --lng=-57.9675 --radius=10 --max-branches=10 --max-products=600

# O desde Windows, con los valores por defecto del .env:
scripts\refresh-prices.cmd
```

| Parámetro | Default | Qué hace |
|---|---|---|
| `--lat` / `--lng` | `-34.8207` / `-57.9675` | Centro de la zona a traer |
| `--radius` | `10` | Radio en km |
| `--max-branches` | `5` | Cuántas sucursales traer (la API devuelve 100 ordenadas por cercanía) |
| `--max-products` | `300` | Cuántos productos por sucursal |

La ingesta es **idempotente**: se puede volver a ejecutar. Solo escribe una fila en `price_history`
cuando el precio **cambia de verdad** (así la serie de precios es útil).

Datos que se persisten:

- `store_branches.externalId` → id de SEPA de la sucursal (`"15-1-163"`), la clave de matcheo.
- `branch_products.currentPrice` → precio de lista observado (el `precioMin` de SEPA, ya incluye promos).
- `unitPrice` → precio por unidad de contenido, normalizado a LITER / GRAM / KG / UNIT.
- `price_history.source = 'SEPA'` → origen de la observación.

> **Alcance de SEPA:** solo publica las grandes cadenas (Día, Coto, Carrefour, Jumbo, Disco, Vea,
> Fravega, Naldo…). Los comercios de barrio chicos no están. Los endpoints de lectura son públicos
> (no requieren API key). Para cargas masivas, el open data diario oficial es
> https://datos.gob.ar/dataset/precios-claros-base-sepa

---

## ✅ Cómo probar el funcionamiento

Con el entorno arriba (Opción A, B o C), abrí **http://localhost:3001** y recorré:

1. **Ubicación**: el chip del header muestra tu dirección real (ej. `Punta Lara, Ensenada`).
2. **Barra de sucursales**: las más cercanas, ordenadas por distancia PostGIS real. Si no hay
   ninguna en el radio, aparece un aviso con la sugerencia de ampliarlo.
3. **Buscador**: escribí `Leche` o `Coca` → el producto aparece con su mejor oferta y rango de precios.
4. **Chips de categoría**: clic en **"Almacén"** → deben verse Aceite y Coca-Cola.
5. **Carrito**: "Agregar para Optimizar" in 2–3 productos → botón **"Optimizar Carrito"** →
   **"Calcular Ahorro Máximo"**. Pestañas **Multi-Tienda** (ruta + ahorro) y **Un Solo Supermercado**.
6. **Subir Ticket**: modal de OCR (simulación; no hay backend real de OCR todavía).

### Verificación por consola (API real)

```bash
# Sucursales cercanas (PostGIS) - reemplazar por TUS coordenadas
curl "http://localhost:3000/api/v1/stores/nearby?latitude=-34.8207&longitude=-57.9675&radiusKm=10"

# Búsqueda por texto
curl "http://localhost:3000/api/v1/products/search?q=Leche&latitude=-34.8207&longitude=-57.9675"

# Búsqueda solo por categoría (fix verificado)
curl "http://localhost:3000/api/v1/products/search?category=Almac%C3%A9n&latitude=-34.8207&longitude=-57.9675"

# Optimización de carrito (reemplazá <uuid> por los devueltos por la búsqueda)
curl -X POST "http://localhost:3000/api/v1/cart/optimize" -H "Content-Type: application/json" -d "{\"latitude\":-34.8207,\"longitude\":-57.9675,\"items\":[{\"productId\":\"<uuid>\",\"quantity\":2}]}"
```

Swagger UI interactivo: **`http://localhost:3000/docs`**.

---

## 🗄️ Base de Datos: Seeder y Migraciones

En **runtime** la app arranca con `synchronize: false` (no modifica el esquema). El esquema se
gestiona por separado:

| Comando | Descripción |
|---|---|
| `npm run seed` | Crea el esquema (synchronize) y carga datos de prueba. Idempotente: omite si ya hay datos. |
| `npm run migration:run` | Aplica migraciones pendientes. |
| `npm run migration:generate -- src/common/infrastructure/database/migrations/Nombre` | Genera migración a partir de cambios de entidades. |
| `npm run migration:revert` | Revierte la última migración. |

Incluye la migración `1710000000000-FixForeignKeyColumnNames` que **repara bases creadas con la
versión anterior** (renombra las columnas FK `*_id` a `*Id`). Ver `INFORME-CAMBIOS.md`.

> ⚠️ Migrar de `synchronize` a migraciones reales para producción es un paso pendiente recomendado.

---

## 🧪 Tests y Calidad

```bash
cd backend
npm test            # Jest (unit tests de casos de uso)
npm run lint        # ESLint + Prettier (--fix)
npm run build       # nest build

cd ../frontend
npm run lint        # next lint
npm run build       # next build
```

---

## 📡 Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/stores/nearby` | Sucursales cercanas ordenadas por distancia (`ST_DistanceSphere` + `ST_DWithin` sobre `geography`). |
| GET | `/api/v1/products/search` | Búsqueda por nombre/marca/EAN y/o categoría (`category`), con precios cercanos, paginación (`page`, `limit`) y `bestDeal`. |
| POST | `/api/v1/cart/optimize` | Compara opción mono-tienda vs multi-tienda; respeta `allowSplitStores`. |
| GET | `/api/v1/products/{id}/history` | Serie histórica de precios + estadísticas. |
| POST | `/api/v1/evidences` | Reporte de precio con evidencia (OCR + TrustScore). |
| GET | `/api/v1/evidences/reputation/{id}` | Reputación de un reportante. |

---

## 🎨 Frontend

- **Hero dashboard** con filtros por categoría y búsqueda en tiempo real.- **Barra de sucursales PostGIS** con distancia calculada.
- **Tarjetas de producto** con resaltado de mejor oferta y rango de precios.
- **Modal de carrito optimizado** con estrategia split vs mono-tienda.
- **Modal de evidencia OCR** (simulación de Azure AI Document Intelligence).
- **Paginación** del catálogo.
- Fallback a datos mock **solo** cuando el backend es inalcanzable (no ante errores HTTP 4xx/5xx).
