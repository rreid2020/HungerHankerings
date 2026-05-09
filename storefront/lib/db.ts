import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"
import type { PoolConfig } from "pg"
import { Pool } from "pg"

/** Same flag as Vendure on App Platform + DO Managed Postgres (TLS with relaxed CA verify). */
function sslRelaxed(): boolean {
  return process.env.DB_SSL_REJECT_UNAUTHORIZED === "false"
}

/**
 * Explicit URL wins. Otherwise compose from the same `DB_*` vars Vendure uses on App Platform.
 * Database name: `LEADS_DATABASE_NAME`, else `DB_NAME`, else `hungerhankeringsadmin`.
 */
function resolveLeadsConnectionString(): string | undefined {
  const direct = process.env.DATABASE_URL?.trim()
  if (direct) return direct

  const host = process.env.DB_HOST?.trim()
  const port = process.env.DB_PORT?.trim()
  const user = process.env.DB_USER?.trim()
  const password = process.env.DB_PASSWORD
  const dbName =
    process.env.LEADS_DATABASE_NAME?.trim() ||
    process.env.DB_NAME?.trim() ||
    "hungerhankeringsadmin"

  if (!host || !port || !user || password === undefined || password === "") {
    return undefined
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`
}

/** Remove sslmode query params so we can pass TLS options via Pool.ssl (node-pg / pg v8+ semantics). */
function stripSslModeFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    u.searchParams.delete("sslmode")
    const out = u.toString()
    return out.endsWith("?") ? out.slice(0, -1) : out
  } catch {
    return rawUrl.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "")
  }
}

function leadsPoolConfig(connectionString: string): PoolConfig {
  const relaxed = sslRelaxed()
  const connectMs = Math.min(
    Math.max(Number(process.env.LEADS_PG_CONNECT_TIMEOUT_MS ?? "45000") || 45000, 5000),
    120_000,
  )

  if (relaxed) {
    return {
      connectionString: stripSslModeFromUrl(connectionString),
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.LEADS_PG_POOL_MAX ?? "10") || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: connectMs,
      keepAlive: true,
    }
  }

  return {
    connectionString,
    max: Number(process.env.LEADS_PG_POOL_MAX ?? "10") || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: connectMs,
    keepAlive: true,
  }
}

export function isLeadsDatabaseConfigured(): boolean {
  return resolveLeadsConnectionString() !== undefined
}

const globalForPrisma = globalThis as unknown as {
  leadsPgPool?: Pool
  leadsPrisma?: PrismaClient
}

function getLeadsPrisma(): PrismaClient | null {
  const raw = resolveLeadsConnectionString()
  if (!raw) return null

  if (!globalForPrisma.leadsPgPool) {
    globalForPrisma.leadsPgPool = new Pool(leadsPoolConfig(raw))
  }

  if (!globalForPrisma.leadsPrisma) {
    const adapter = new PrismaPg(globalForPrisma.leadsPgPool)
    globalForPrisma.leadsPrisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  }

  return globalForPrisma.leadsPrisma
}

export type Lead = {
  id: string
  type: string
  payload: Record<string, unknown>
  created_at: Date
}

export async function insertLead(
  type: string,
  payload: Record<string, unknown>,
): Promise<Lead | null> {
  const prisma = getLeadsPrisma()
  if (!prisma) return null

  const row = await prisma.lead.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  return {
    id: row.id,
    type: row.type,
    payload: row.payload as Record<string, unknown>,
    created_at: row.createdAt,
  }
}
