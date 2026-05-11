import { Prisma } from "@prisma/client"
import { getAdminPrisma, runAdminDbQuery } from "./db"

export const FALLBACK_ZONE_CODE = "FALLBACK_CANADA"

export const CANADIAN_PROVINCES = new Set([
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
])

export type ShippingRateResult = {
  success: true
  postalCode: string
  fsa: string
  province: string | null
  urbanRural: string
  regionBand: string | null
  zoneCode: string
  zoneName: string
  flatRate: number
  freeShippingThreshold: number
  freeShippingApplied: boolean
  finalRate: number
  overrideUsed: boolean
  fallbackUsed: boolean
  fallbackReason?: string
}

export type ShippingRateFailure = {
  success: false
  error: string
}

export type ShippingRateResponse = ShippingRateResult | ShippingRateFailure

export type ShippingZoneInput = {
  zoneCode?: string
  zoneName?: string
  province?: string | null
  urbanRural?: string
  regionBand?: string | null
  flatRate?: number
  freeShippingThreshold?: number
  active?: boolean
  sortOrder?: number
}

export type FsaRegionInput = {
  fsa?: string
  province?: string
  city?: string | null
  urbanRural?: string
  regionBand?: string | null
  shippingZoneCode?: string
  active?: boolean
  notes?: string | null
}

export type FsaOverrideInput = {
  fsa?: string
  overrideZoneCode?: string
  reason?: string | null
  active?: boolean
}

function prismaOrThrow() {
  const prisma = getAdminPrisma()
  if (!prisma) throw new Error("Admin database is not configured")
  return prisma
}

function moneyDecimal(value: unknown, fallback = 0): Prisma.Decimal {
  const n = Number(value)
  if (!Number.isFinite(n)) return new Prisma.Decimal(fallback.toFixed(2))
  return new Prisma.Decimal(Math.max(0, n).toFixed(2))
}

function moneyNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0
  return Number(Number(value).toFixed(2))
}

function boolFromUnknown(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    if (["true", "1", "yes", "y"].includes(s)) return true
    if (["false", "0", "no", "n"].includes(s)) return false
  }
  return fallback
}

function upperTrim(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

export function normalizePostalCode(input: unknown): string {
  return upperTrim(input).replace(/\s+/g, "")
}

export function extractFsa(input: unknown): string {
  return normalizePostalCode(input).slice(0, 3)
}

export function isValidCanadianPostalCode(input: unknown): boolean {
  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/i.test(
    normalizePostalCode(input),
  )
}

export function isValidFsa(input: unknown): boolean {
  return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]$/i.test(upperTrim(input))
}

export function normalizeFsa(input: unknown): string {
  return upperTrim(input).replace(/\s+/g, "").slice(0, 3)
}

function normalizeProvince(input: unknown): string | null {
  const p = upperTrim(input).slice(0, 2)
  return CANADIAN_PROVINCES.has(p) ? p : null
}

function cleanNullable(input: unknown): string | null {
  if (typeof input !== "string") return null
  const s = input.trim()
  return s ? s : null
}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}

function serializeForAudit(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

async function writeAudit(params: {
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  changedBy?: string | null
}) {
  const prisma = prismaOrThrow()
  await prisma.shippingRateAuditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      beforeData: serializeForAudit(params.before),
      afterData: serializeForAudit(params.after),
      changedBy: params.changedBy ?? null,
    },
  })
}

export async function listShippingZones() {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    return prisma.shippingZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { zoneCode: "asc" }],
    })
  })
}

export async function listActiveZoneCodes(): Promise<string[]> {
  const zones = await listShippingZones()
  return zones.filter((z) => z.active).map((z) => z.zoneCode)
}

export async function createShippingZone(input: ShippingZoneInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const zoneCode = requireNonEmpty(input.zoneCode, "Zone code").toUpperCase().replace(/\s+/g, "_")
    const province = normalizeProvince(input.province)
    const row = await prisma.shippingZone.create({
      data: {
        zoneCode,
        zoneName: requireNonEmpty(input.zoneName, "Zone name"),
        province,
        urbanRural: requireNonEmpty(input.urbanRural, "Urban/rural"),
        regionBand: cleanNullable(input.regionBand),
        flatRate: moneyDecimal(input.flatRate),
        freeShippingThreshold: moneyDecimal(input.freeShippingThreshold, 150),
        active: input.active ?? true,
        sortOrder: Number.isFinite(Number(input.sortOrder)) ? Number(input.sortOrder) : 0,
      },
    })
    await writeAudit({ action: "create", entityType: "shipping_zone", entityId: row.id, after: row, changedBy })
    return row
  })
}

export async function updateShippingZone(id: string, input: ShippingZoneInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.shippingZone.findUnique({ where: { id } })
    if (!before) throw new Error("Shipping zone not found")
    const data: Prisma.ShippingZoneUpdateInput = {}
    if (input.zoneName !== undefined) data.zoneName = requireNonEmpty(input.zoneName, "Zone name")
    if (input.province !== undefined) data.province = normalizeProvince(input.province)
    if (input.urbanRural !== undefined) data.urbanRural = requireNonEmpty(input.urbanRural, "Urban/rural")
    if (input.regionBand !== undefined) data.regionBand = cleanNullable(input.regionBand)
    if (input.flatRate !== undefined) data.flatRate = moneyDecimal(input.flatRate)
    if (input.freeShippingThreshold !== undefined) data.freeShippingThreshold = moneyDecimal(input.freeShippingThreshold, 150)
    if (input.active !== undefined) data.active = input.active
    if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder) || 0
    const after = await prisma.shippingZone.update({ where: { id }, data })
    await writeAudit({ action: "update", entityType: "shipping_zone", entityId: id, before, after, changedBy })
    return after
  })
}

export async function listFsaRegions(params: URLSearchParams) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const q = params.get("q")?.trim()
    const fsa = normalizeFsa(params.get("fsa") ?? "")
    const province = normalizeProvince(params.get("province"))
    const zone = params.get("zone")?.trim()
    const urbanRural = params.get("urbanRural")?.trim()
    const activeRaw = params.get("active")
    const where: Prisma.PostalFsaRegionWhereInput = {}
    if (fsa) where.fsa = { startsWith: fsa, mode: "insensitive" }
    if (province) where.province = province
    if (zone) where.shippingZoneCode = zone
    if (urbanRural) where.urbanRural = urbanRural
    if (activeRaw === "true" || activeRaw === "false") where.active = activeRaw === "true"
    if (q) {
      where.OR = [
        { fsa: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { shippingZoneCode: { contains: q, mode: "insensitive" } },
      ]
    }
    return prisma.postalFsaRegion.findMany({
      where,
      include: { shippingZone: true },
      orderBy: [{ province: "asc" }, { fsa: "asc" }],
      take: Math.min(Number(params.get("limit")) || 200, 500),
    })
  })
}

async function assertZoneExists(zoneCode: string) {
  const prisma = prismaOrThrow()
  const zone = await prisma.shippingZone.findUnique({ where: { zoneCode } })
  if (!zone) throw new Error(`Unknown shipping zone: ${zoneCode}`)
  return zone
}

export async function createFsaRegion(input: FsaRegionInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const fsa = normalizeFsa(input.fsa)
    if (!isValidFsa(fsa)) throw new Error("FSA must be a valid Canadian FSA")
    const province = normalizeProvince(input.province)
    if (!province) throw new Error("Province must be a valid Canadian province code")
    const zoneCode = requireNonEmpty(input.shippingZoneCode, "Shipping zone").toUpperCase()
    await assertZoneExists(zoneCode)
    const row = await prisma.postalFsaRegion.create({
      data: {
        fsa,
        province,
        city: cleanNullable(input.city),
        urbanRural: requireNonEmpty(input.urbanRural, "Urban/rural"),
        regionBand: cleanNullable(input.regionBand),
        shippingZoneCode: zoneCode,
        active: input.active ?? true,
        notes: cleanNullable(input.notes),
      },
    })
    await writeAudit({ action: "create", entityType: "postal_fsa_region", entityId: row.id, after: row, changedBy })
    return row
  })
}

export async function updateFsaRegion(id: string, input: FsaRegionInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.postalFsaRegion.findUnique({ where: { id } })
    if (!before) throw new Error("FSA region not found")
    const data: Prisma.PostalFsaRegionUpdateInput = {}
    if (input.province !== undefined) {
      const province = normalizeProvince(input.province)
      if (!province) throw new Error("Province must be a valid Canadian province code")
      data.province = province
    }
    if (input.city !== undefined) data.city = cleanNullable(input.city)
    if (input.urbanRural !== undefined) data.urbanRural = requireNonEmpty(input.urbanRural, "Urban/rural")
    if (input.regionBand !== undefined) data.regionBand = cleanNullable(input.regionBand)
    if (input.shippingZoneCode !== undefined) {
      const zoneCode = requireNonEmpty(input.shippingZoneCode, "Shipping zone").toUpperCase()
      await assertZoneExists(zoneCode)
      data.shippingZone = { connect: { zoneCode } }
    }
    if (input.active !== undefined) data.active = input.active
    if (input.notes !== undefined) data.notes = cleanNullable(input.notes)
    const after = await prisma.postalFsaRegion.update({ where: { id }, data })
    await writeAudit({ action: "update", entityType: "postal_fsa_region", entityId: id, before, after, changedBy })
    return after
  })
}

export async function listFsaOverrides() {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    return prisma.shippingFsaOverride.findMany({
      include: { overrideZone: true },
      orderBy: [{ active: "desc" }, { fsa: "asc" }],
      take: 500,
    })
  })
}

export async function createFsaOverride(input: FsaOverrideInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const fsa = normalizeFsa(input.fsa)
    if (!isValidFsa(fsa)) throw new Error("FSA must be a valid Canadian FSA")
    const zoneCode = requireNonEmpty(input.overrideZoneCode, "Override zone").toUpperCase()
    await assertZoneExists(zoneCode)
    const row = await prisma.shippingFsaOverride.create({
      data: {
        fsa,
        overrideZoneCode: zoneCode,
        reason: cleanNullable(input.reason),
        active: input.active ?? true,
      },
    })
    await writeAudit({ action: "create", entityType: "shipping_fsa_override", entityId: row.id, after: row, changedBy })
    return row
  })
}

export async function updateFsaOverride(id: string, input: FsaOverrideInput, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.shippingFsaOverride.findUnique({ where: { id } })
    if (!before) throw new Error("FSA override not found")
    const data: Prisma.ShippingFsaOverrideUpdateInput = {}
    if (input.overrideZoneCode !== undefined) {
      const zoneCode = requireNonEmpty(input.overrideZoneCode, "Override zone").toUpperCase()
      await assertZoneExists(zoneCode)
      data.overrideZone = { connect: { zoneCode } }
    }
    if (input.reason !== undefined) data.reason = cleanNullable(input.reason)
    if (input.active !== undefined) data.active = input.active
    const after = await prisma.shippingFsaOverride.update({ where: { id }, data })
    await writeAudit({ action: "update", entityType: "shipping_fsa_override", entityId: id, before, after, changedBy })
    return after
  })
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    const next = line[i + 1]
    if (ch === '"' && quoted && next === '"') {
      cur += '"'
      i++
    } else if (ch === '"') {
      quoted = !quoted
    } else if (ch === "," && !quoted) {
      cells.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

export type CsvImportSummary = {
  inserted: number
  updated: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

export async function importFsaRegionsCsv(csv: string, changedBy?: string | null): Promise<CsvImportSummary> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  const summary: CsvImportSummary = { inserted: 0, updated: 0, skipped: 0, errors: [] }
  if (lines.length === 0) return summary
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const required = ["fsa", "province", "urban_rural", "shipping_zone_code"]
  for (const h of required) {
    if (!headers.includes(h)) {
      return { inserted: 0, updated: 0, skipped: lines.length - 1, errors: [{ row: 1, error: `Missing required column: ${h}` }] }
    }
  }
  const idx = (name: string) => headers.indexOf(name)
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    try {
      const cells = parseCsvLine(lines[i])
      const input: FsaRegionInput = {
        fsa: cells[idx("fsa")] ?? "",
        province: cells[idx("province")] ?? "",
        city: idx("city") >= 0 ? cells[idx("city")] : null,
        urbanRural: cells[idx("urban_rural")] ?? "",
        regionBand: idx("region_band") >= 0 ? cells[idx("region_band")] : null,
        shippingZoneCode: cells[idx("shipping_zone_code")] ?? "",
        active: idx("active") >= 0 ? boolFromUnknown(cells[idx("active")], true) : true,
        notes: idx("notes") >= 0 ? cells[idx("notes")] : null,
      }
      const fsa = normalizeFsa(input.fsa)
      if (!isValidFsa(fsa)) throw new Error("Invalid FSA")
      const province = normalizeProvince(input.province)
      if (!province) throw new Error("Invalid province")
      const zoneCode = requireNonEmpty(input.shippingZoneCode, "Shipping zone").toUpperCase()
      await assertZoneExists(zoneCode)
      const prisma = prismaOrThrow()
      const existing = await prisma.postalFsaRegion.findUnique({ where: { fsa } })
      const after = await prisma.postalFsaRegion.upsert({
        where: { fsa },
        create: {
          fsa,
          province,
          city: cleanNullable(input.city),
          urbanRural: requireNonEmpty(input.urbanRural, "Urban/rural"),
          regionBand: cleanNullable(input.regionBand),
          shippingZoneCode: zoneCode,
          active: input.active ?? true,
          notes: cleanNullable(input.notes),
        },
        update: {
          province,
          city: cleanNullable(input.city),
          urbanRural: requireNonEmpty(input.urbanRural, "Urban/rural"),
          regionBand: cleanNullable(input.regionBand),
          shippingZoneCode: zoneCode,
          active: input.active ?? true,
          notes: cleanNullable(input.notes),
        },
      })
      summary[existing ? "updated" : "inserted"]++
      await writeAudit({
        action: existing ? "csv_update" : "csv_insert",
        entityType: "postal_fsa_region",
        entityId: after.id,
        before: existing,
        after,
        changedBy,
      })
    } catch (err) {
      summary.skipped++
      summary.errors.push({ row: rowNum, error: err instanceof Error ? err.message : "Invalid row" })
    }
  }
  return summary
}

type ZoneLike = {
  zoneCode: string
  zoneName: string
  flatRate: Prisma.Decimal
  freeShippingThreshold: Prisma.Decimal
  active: boolean
  province: string | null
  urbanRural: string
  regionBand: string | null
}

function rateResult(params: {
  postalCode: string
  fsa: string
  zone: ZoneLike
  province: string | null
  urbanRural: string
  regionBand: string | null
  orderSubtotal: number
  overrideUsed: boolean
  fallbackUsed: boolean
  fallbackReason?: string
}): ShippingRateResult {
  const threshold = moneyNumber(params.zone.freeShippingThreshold)
  const flatRate = moneyNumber(params.zone.flatRate)
  const freeShippingApplied = params.orderSubtotal >= threshold
  return {
    success: true,
    postalCode: params.postalCode,
    fsa: params.fsa,
    province: params.province,
    urbanRural: params.urbanRural,
    regionBand: params.regionBand,
    zoneCode: params.zone.zoneCode,
    zoneName: params.zone.zoneName,
    flatRate,
    freeShippingThreshold: threshold,
    freeShippingApplied,
    finalRate: freeShippingApplied ? 0 : flatRate,
    overrideUsed: params.overrideUsed,
    fallbackUsed: params.fallbackUsed,
    ...(params.fallbackReason ? { fallbackReason: params.fallbackReason } : {}),
  }
}

export async function resolveShippingRate(params: {
  postalCode: string
  orderSubtotal?: number
  recordFallbackUsage?: boolean
}): Promise<ShippingRateResponse> {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const postalCode = normalizePostalCode(params.postalCode)
    const fsa = extractFsa(postalCode)
    const orderSubtotal = Math.max(0, Number(params.orderSubtotal ?? 0) || 0)

    const fallback = async (reason: string): Promise<ShippingRateResponse> => {
      const zone = await prisma.shippingZone.findUnique({ where: { zoneCode: FALLBACK_ZONE_CODE } })
      if (!zone) return { success: false, error: "Fallback shipping zone is missing." }
      if (!zone.active) return { success: false, error: "Fallback shipping zone is inactive." }
      if (params.recordFallbackUsage) {
        await writeAudit({
          action: "fallback_used",
          entityType: "shipping_rate",
          after: { fsa, reason },
        })
      }
      return rateResult({
        postalCode,
        fsa,
        zone,
        province: null,
        urbanRural: "fallback",
        regionBand: "fallback",
        orderSubtotal,
        overrideUsed: false,
        fallbackUsed: true,
        fallbackReason: reason,
      })
    }

    if (!isValidFsa(fsa)) {
      return fallback("Postal code did not contain a valid Canadian FSA.")
    }

    const override = await prisma.shippingFsaOverride.findFirst({
      where: { fsa, active: true },
      include: { overrideZone: true },
    })
    if (override?.overrideZone?.active) {
      const region = await prisma.postalFsaRegion.findUnique({ where: { fsa } })
      return rateResult({
        postalCode,
        fsa,
        zone: override.overrideZone,
        province: region?.province ?? override.overrideZone.province,
        urbanRural: region?.urbanRural ?? override.overrideZone.urbanRural,
        regionBand: region?.regionBand ?? override.overrideZone.regionBand,
        orderSubtotal,
        overrideUsed: true,
        fallbackUsed: false,
      })
    }

    const region = await prisma.postalFsaRegion.findFirst({
      where: { fsa, active: true },
      include: { shippingZone: true },
    })
    if (region?.shippingZone?.active) {
      return rateResult({
        postalCode,
        fsa,
        zone: region.shippingZone,
        province: region.province,
        urbanRural: region.urbanRural,
        regionBand: region.regionBand,
        orderSubtotal,
        overrideUsed: false,
        fallbackUsed: false,
      })
    }

    return fallback("No active FSA mapping was found for this postal code.")
  })
}

export async function getFallbackSettings() {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const zone = await prisma.shippingZone.findUnique({ where: { zoneCode: FALLBACK_ZONE_CODE } })
    const fallbackUsageCount = await prisma.shippingRateAuditLog.count({
      where: { action: "fallback_used", entityType: "shipping_rate" },
    })
    return { zone, fallbackUsageCount }
  })
}
