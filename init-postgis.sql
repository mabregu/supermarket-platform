-- Habilitar extensión PostGIS para geolocalización y cálculo de distancias
CREATE EXTENSION IF NOT EXISTS postgis;

-- Habilitar extensión uuid-ossp para generación de UUIDs v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar búsqueda difusa trigram (útil para matching de nombres de productos)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

SELECT PostGIS_Full_Version();
