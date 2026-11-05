# Checklist de QA — Supermarket Platform (Full Stack Online)

**Fecha:** 2026-11-04
**Alcance:** validación end-to-end del deploy online (Vercel frontend ↔ Render backend ↔ Neon DB).

---

## 0. Salud del sistema

- [ ] Backend Render: deploy status `live` (último: `dep-dblluumc6qcc73bkob10`).
- [ ] Swagger: `GET https://supermarket-platform-jt71.onrender.com/docs` → HTTP 200.
- [ ] Frontend: `GET https://frontend-tan-chi-6ityrwozm2.vercel.app/` → HTTP 200.
- [ ] Render logs: sin errores de conexión a BD ni crash loop.

## 1. Conexión a BD

- [ ] Backend log: conectado a Neon y ejecutando queries.

## 2. API — Sucursales cercanas

- [ ] `GET /api/v1/stores/nearby?latitude=-34.8207&longitude=-57.9675&radiusKm=10` → 200, count > 0, distancias reales.
- [ ] `GET /api/v1/stores/nearby?latitude=-34.799039&longitude=-58.00194695&radiusKm=20` → 200, count = 9.
- [ ] CORS: `access-control-allow-origin` incluye `https://frontend-tan-chi-6ityrwozm2.vercel.app`.

## 3. API — Catálogo / precios

- [ ] `GET /api/v1/products/search?q=Leche&limit=20` → 200, `bestDeal` con listPrice/hasPromotion.
- [ ] `GET /api/v1/products/search?category=Almacén` → 200 (q opcional).
- [ ] Paginación: `pagination.*`.

## 4. API — Historial

- [ ] `GET /api/v1/products/:productId/history?limit=50` → 200, stats + source SEPA + sourceDate.

## 5. API — Carrito

- [ ] `POST /api/v1/cart/optimize` → 201/200, ruta óptima, ahorro.

## 6. API — Evidencias

- [ ] `POST /api/v1/evidences` → 201/200 + trustScore.
- [ ] `GET /api/v1/evidences/reputation/:reporterId` → 200.

## 7. Frontend (manual)

- [ ] Home carga sin errores de consola.
- [ ] Geolocalización → radio 10 km → sucursales.
- [ ] Historial desde ProductCard.
- [ ] Carrito → optimize → ahorro.

## 8. Datos (Neon)

- [ ] Counts por tabla.
- [ ] Precios: 1141 guardados, source `SEPA`.

## 9. Bugs conocidos / observaciones

- [ ] Sucursal `3-1-1736` (AUT BSAS-LA PLATA) → `value too long for type character varying(14)`.
- [ ] Sucursal duplicada con violación `UQ_4ba4d5a4e9ec0424d048d424173`.
