import { resolvePostgresConfig, parsePostgresUrl } from './db-config';

describe('resolvePostgresConfig', () => {
  it('usa DATABASE_URL cuando esta presente', () => {
    const config = resolvePostgresConfig({
      DATABASE_URL: 'postgres://postgres:secret@db.abc.supabase.co:5432/postgres',
      DB_HOST: 'localhost',
    });

    expect(config.url).toBe('postgres://postgres:secret@db.abc.supabase.co:5432/postgres');
    expect(config.host).toBeUndefined();
  });

  it('cae a las variables sueltas cuando no hay DATABASE_URL', () => {
    const config = resolvePostgresConfig({
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgrespassword',
      DB_NAME: 'supermarket_pricing_db',
    });

    expect(config.url).toBeUndefined();
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.database).toBe('supermarket_pricing_db');
  });

  it('tiene defaults coherentes', () => {
    const config = resolvePostgresConfig({});

    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
    expect(config.username).toBe('postgres');
  });
});

describe('parsePostgresUrl', () => {
  it('parsea el connection string de Supabase', () => {
    const parsed = parsePostgresUrl(
      'postgres://postgres:secret@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require',
    );

    expect(parsed.host).toContain('supabase.com');
    expect(parsed.port).toBe(5432);
    expect(parsed.database).toBe('postgres');
    expect(parsed.username).toBe('postgres');
  });

  it('parsea un URL con postgres:// y con postgresql://', () => {
    expect(parsePostgresUrl('postgresql://user:pass@host:5432/db')).toEqual({
      host: 'host',
      port: 5432,
      username: 'user',
      password: 'pass',
      database: 'db',
    });
  });
});
