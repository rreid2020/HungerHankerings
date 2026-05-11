declare module "pg" {
  export type PoolConfig = {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    keepAlive?: boolean;
    ssl?: boolean | { rejectUnauthorized?: boolean };
  };
  export class Pool {
    constructor(config?: PoolConfig);
    query<T = unknown>(
      queryText: string,
      values?: unknown[]
    ): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: {
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      database?: string;
      ssl?: boolean | { rejectUnauthorized?: boolean };
    });
    connect(): Promise<void>;
    query(
      queryText: string,
      values?: unknown[]
    ): Promise<{ rows: unknown[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}
