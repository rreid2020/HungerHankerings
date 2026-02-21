import postgres from "postgres"

const connectionString = process.env.DATABASE_URL

export const sql = connectionString
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
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
    VALUES (${type}, ${JSON.stringify(payload)})
    RETURNING id, type, payload, created_at
  `
  return row ?? null
}
