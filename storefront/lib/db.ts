import postgres from "postgres"

const connectionString = process.env.DATABASE_URL?.trim()

/** Same flag as Vendure on App Platform + DO Managed Postgres (TLS with relaxed CA verify). */
const sslRelaxed = process.env.DB_SSL_REJECT_UNAUTHORIZED === "false"

export const sql = connectionString
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ...(sslRelaxed ? { ssl: { rejectUnauthorized: false } } : {})
    })
  : null

export type Lead = {
  id: string
  type: string
  payload: Record<string, unknown>
  created_at: Date
}

export async function insertLead(
  type: string,
  payload: Record<string, unknown>
): Promise<Lead | null> {
  if (!sql) return null

  const [row] = await sql<Lead[]>`
    INSERT INTO leads (type, payload)
    VALUES (${type}, ${sql.json(payload as import("postgres").JSONValue)})
    RETURNING id, type, payload, created_at
  `
  return row ?? null
}
