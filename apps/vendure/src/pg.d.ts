declare module "pg" {
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
