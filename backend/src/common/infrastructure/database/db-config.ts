/**
 * Resuelve la configuracion de Postgres para la aplicacion y para los scripts
 * que la usan (migraciones, seed, ingesta).
 *
 * Se acepta cualquiera de las dos formas:
 *  - `DATABASE_URL` / `POSTGRES_URL` / `DB_URL`  ->  postgres://user:pass@host:port/dbname
 *  - Variables sueltas: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
 *
 * Los proveedores en la nube (Supabase, Neon, Render, Fly, Railway, ...) exponen
 * un unico `DATABASE_URL`. Asi no hay que reescribir nada cuando se pasa a prod.
 */
export interface PostgresConnectionConfig {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export function resolvePostgresConfig(env: Record<string, string | undefined>): PostgresConnectionConfig {
  const url = env.DATABASE_URL || env.POSTGRES_URL || env.DB_URL;

  if (url) {
    // `postgres://user:password@host:port/database`
    return { url };
  }

  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 5432,
    username: env.DB_USERNAME || 'postgres',
    password: env.DB_PASSWORD || 'postgrespassword',
    database: env.DB_NAME || 'supermarket_pricing_db',
  };
}

/** Extrae las partes del connection string, util para logs y tests. */
export function parsePostgresUrl(url: string): {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
} {
  const withoutScheme = url.replace(/^postgres(ql)?:\/\//, '');
  const [userInfo, hostPortRaw] = withoutScheme.split('@');
  const hostPort = (hostPortRaw ?? '').split('?')[0];
  const password = userInfo?.split(':')[1] ?? '';
  const hostPortParts = hostPort.split('/') ?? [];
  const host = hostPortParts[0];
  const database = hostPortParts[1];

  const [hostname, portStr] = (host || '').split(':') ?? [host, '5432'];
  const port = portStr ? Number(portStr) : 5432;

  const username = userInfo?.split(':')[0];

  return { host: hostname, port, username, password, database };
}
