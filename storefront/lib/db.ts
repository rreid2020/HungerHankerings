/**
 * Postgres access for the ops/admin database (`hungerhankeringsadmin`).
 * Catalog, checkout, and accounts still use **Vendure over HTTP** unless a module explicitly calls this helper.
 */
import { PrismaPg } from "@prisma/adapter-pg"
import { Prisma, PrismaClient } from "@prisma/client"
import type { PoolConfig } from "pg"
import { Pool } from "pg"

/**
 * Match `apps/vendure/src/vendure-config.ts` `dbConnectionOptions.ssl` exactly so leads use the same TLS
 * behavior as Vendure (DO Managed Postgres requires TLS; omitting `ssl` here caused connection timeouts).
 */
function leadsPgSsl(): false | { rejectUnauthorized: boolean } {
  if (process.env.DB_SSL === "false") return false
  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  }
}

/**
 * Leads DB only — never uses `DB_NAME` (that is for Vendure in the same container).
 *
 * Order:
 * 1. `LEADS_DATABASE_URL`
 * 2. If `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` are set (typical App Platform): compose using
 *    **`LEADS_DATABASE_NAME` or default `hungerhankeringsadmin`** — same cluster as Vendure, different database.
 * 3. `DATABASE_URL` — local / migrate-style single URL when `DB_*` is incomplete.
 */
function resolveLeadsConnectionString(): string | undefined {
  const leadsUrl = process.env.LEADS_DATABASE_URL?.trim()
  if (leadsUrl) return leadsUrl

  const host = process.env.DB_HOST?.trim()
  const port = process.env.DB_PORT?.trim()
  const user = process.env.DB_USER?.trim()
  const password = process.env.DB_PASSWORD
  const dbName =
    process.env.LEADS_DATABASE_NAME?.trim() || "hungerhankeringsadmin"

  if (host && port && user && password !== undefined && password !== "") {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`
  }

  return process.env.DATABASE_URL?.trim()
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
  const ssl = leadsPgSsl()
  const connectMs = Math.min(
    Math.max(Number(process.env.LEADS_PG_CONNECT_TIMEOUT_MS ?? "90000") || 90000, 5000),
    120_000,
  )
  const conn = ssl === false ? connectionString : stripSslModeFromUrl(connectionString)

  const cfg: PoolConfig = {
    connectionString: conn,
    max: Math.min(Math.max(Number(process.env.LEADS_PG_POOL_MAX ?? "5") || 5, 1), 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: connectMs,
    keepAlive: true,
  }
  if (ssl !== false) {
    cfg.ssl = ssl
  }
  return cfg
}

export function isLeadsDatabaseConfigured(): boolean {
  return resolveLeadsConnectionString() !== undefined
}

const globalForPrisma = globalThis as unknown as {
  leadsPgPool?: Pool
  leadsPrisma?: PrismaClient
}

function isTransientLeadDbError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const cause =
    err instanceof Error && err.cause instanceof Error ? err.cause.message : ""
  const s = `${msg} ${cause}`
  return /timeout|ECONNRESET|ECONNREFUSED|EPIPE|terminated unexpectedly|Connection terminated|ENOTFOUND/i.test(
    s,
  )
}

async function resetLeadsConnection(): Promise<void> {
  const prisma = globalForPrisma.leadsPrisma
  const pool = globalForPrisma.leadsPgPool
  if (prisma) {
    try {
      await prisma.$disconnect()
    } catch {
      /* ignore */
    }
  }
  if (pool) {
    try {
      await pool.end()
    } catch {
      /* ignore */
    }
  }
  globalForPrisma.leadsPrisma = undefined
  globalForPrisma.leadsPgPool = undefined
}

async function runWithLeadRetries<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = Math.min(
    Math.max(Number(process.env.LEADS_PG_OPERATION_RETRIES ?? "3") || 3, 1),
    6,
  )
  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (!isTransientLeadDbError(err) || attempt === maxAttempts) {
        throw err
      }
      console.warn(
        `[leads-db] transient error attempt ${attempt}/${maxAttempts}, resetting pool:`,
        err instanceof Error ? err.message : err,
      )
      await resetLeadsConnection()
      await new Promise((r) => setTimeout(r, Math.min(400 * attempt, 2500)))
    }
  }
  throw lastErr
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

export function getAdminPrisma(): PrismaClient | null {
  return getLeadsPrisma()
}

export async function runAdminDbQuery<T>(fn: () => Promise<T>): Promise<T> {
  return runWithLeadRetries(fn)
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

  const row = await runWithLeadRetries(async () => {
    const p = getLeadsPrisma()
    if (!p) throw new Error("Leads DB pool not available")
    return p.lead.create({
      data: {
        type,
        payload: payload as Prisma.InputJsonValue,
      },
    })
  })

  return {
    id: row.id,
    type: row.type,
    payload: row.payload as Record<string, unknown>,
    created_at: row.createdAt,
  }
}

export type PortalLeadRow = {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: Date
}

/** Ops portal inbox (newest first). */
export async function listLeadsForPortal(
  limit = 100,
): Promise<
  | { ok: false; error: "not_configured" | "query_failed"; message?: string }
  | { ok: true; leads: PortalLeadRow[] }
> {
  const prisma = getLeadsPrisma()
  if (!prisma) {
    return { ok: false, error: "not_configured" }
  }

  const take = Math.min(Math.max(limit, 1), 500)

  try {
    const rows = await runWithLeadRetries(async () => {
      const p = getLeadsPrisma()
      if (!p) throw new Error("Leads DB pool not available")
      return p.lead.findMany({
        orderBy: { createdAt: "desc" },
        take,
      })
    })
    return {
      ok: true,
      leads: rows.map((r) => ({
        id: r.id,
        type: r.type,
        payload: r.payload as Record<string, unknown>,
        createdAt: r.createdAt,
      })),
    }
  } catch (err) {
    console.error("listLeadsForPortal:", err)
    const message = err instanceof Error ? err.message : undefined
    return { ok: false, error: "query_failed", message }
  }
}

export async function deleteLeadForPortal(
  id: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "not_configured" | "not_found" | "delete_failed"; message?: string }
> {
  const prisma = getLeadsPrisma()
  if (!prisma) {
    return { ok: false, error: "not_configured" }
  }

  const normalizedId = id.trim()
  if (!normalizedId) {
    return { ok: false, error: "not_found" }
  }

  try {
    const deleted = await runWithLeadRetries(async () => {
      const p = getLeadsPrisma()
      if (!p) throw new Error("Leads DB pool not available")
      return p.lead.deleteMany({
        where: { id: normalizedId },
      })
    })
    if (deleted.count < 1) {
      return { ok: false, error: "not_found" }
    }
    return { ok: true }
  } catch (err) {
    console.error("deleteLeadForPortal:", err)
    const message = err instanceof Error ? err.message : undefined
    return { ok: false, error: "delete_failed", message }
  }
}
