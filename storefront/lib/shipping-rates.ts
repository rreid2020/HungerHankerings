import { Prisma } from "@prisma/client"
import { getAdminPrisma, runAdminDbQuery } from "./db"

export const FALLBACK_ZONE_CODE = "FALLBACK_CANADA"
export const PROVINCIAL_FALLBACK_ZONE_PREFIX = "FALLBACK_"
export const REGION_BANDS = new Set([
  "south",
  "central",
  "north",
  "far_north",
  "remote",
  "interior",
  "atlantic",
  "fallback",
])
export const URBAN_RURAL_VALUES = new Set([
  "urban",
  "rural",
  "north",
  "far_north",
  "remote",
  "fallback",
])

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

export function inferProvinceFromFsa(input: unknown): string | null {
  const fsa = normalizeFsa(input)
  if (!isValidFsa(fsa)) return null
  const c0 = fsa[0]
  if (c0 === "A") return "NL"
  if (c0 === "B") return "NS"
  if (c0 === "C") return "PE"
  if (c0 === "E") return "NB"
  if (c0 === "G" || c0 === "H" || c0 === "J") return "QC"
  if (c0 === "K" || c0 === "L" || c0 === "M" || c0 === "N" || c0 === "P") return "ON"
  if (c0 === "R") return "SK"
  if (c0 === "S") return "MB"
  if (c0 === "T") return "AB"
  if (c0 === "V") return "BC"
  if (c0 === "Y") return "YT"
  if (c0 === "X") {
    if (fsa.startsWith("X0A") || fsa.startsWith("X0B") || fsa.startsWith("X0C")) return "NU"
    return "NT"
  }
  return null
}

function provincialFallbackZoneCode(province: string | null): string | null {
  if (!province || !CANADIAN_PROVINCES.has(province)) return null
  return `${PROVINCIAL_FALLBACK_ZONE_PREFIX}${province}`
}

function normalizeProvince(input: unknown): string | null {
  const p = upperTrim(input).slice(0, 2)
  return CANADIAN_PROVINCES.has(p) ? p : null
}

function normalizeRegionBand(input: unknown): string | null {
  if (typeof input !== "string") return null
  const v = input.trim().toLowerCase()
  if (!v) return null
  if (!REGION_BANDS.has(v)) {
    throw new Error(`region_band must be one of: ${Array.from(REGION_BANDS).join(", ")}`)
  }
  return v
}

function normalizeUrbanRural(input: unknown): string {
  const v = requireNonEmpty(input, "Urban/rural").toLowerCase()
  if (!URBAN_RURAL_VALUES.has(v)) {
    throw new Error(`urban_rural must be one of: ${Array.from(URBAN_RURAL_VALUES).join(", ")}`)
  }
  return v
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

export async function listShippingZones(params?: URLSearchParams) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const search = params ?? new URLSearchParams()
    const q = search.get("q")?.trim()
    const province = normalizeProvince(search.get("province"))
    const urbanRural = search.get("urbanRural")?.trim().toLowerCase()
    const regionBand = search.get("regionBand")?.trim().toLowerCase()
    const activeRaw = search.get("active")
    const where: Prisma.ShippingZoneWhereInput = {}
    if (province) where.province = province
    if (urbanRural) where.urbanRural = urbanRural
    if (regionBand) where.regionBand = regionBand
    if (activeRaw === "true" || activeRaw === "false") where.active = activeRaw === "true"
    if (q) {
      where.OR = [
        { zoneCode: { contains: q, mode: "insensitive" } },
        { zoneName: { contains: q, mode: "insensitive" } },
      ]
    }

    return prisma.shippingZone.findMany({
      where,
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
        urbanRural: normalizeUrbanRural(input.urbanRural),
        regionBand: normalizeRegionBand(input.regionBand),
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
    if (input.urbanRural !== undefined) data.urbanRural = normalizeUrbanRural(input.urbanRural)
    if (input.regionBand !== undefined) data.regionBand = normalizeRegionBand(input.regionBand)
    if (input.flatRate !== undefined) data.flatRate = moneyDecimal(input.flatRate)
    if (input.freeShippingThreshold !== undefined) data.freeShippingThreshold = moneyDecimal(input.freeShippingThreshold, 150)
    if (input.active !== undefined) data.active = input.active
    if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder) || 0
    const after = await prisma.shippingZone.update({ where: { id }, data })
    await writeAudit({ action: "update", entityType: "shipping_zone", entityId: id, before, after, changedBy })
    return after
  })
}

export async function deleteShippingZone(id: string, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.shippingZone.findUnique({ where: { id } })
    if (!before) throw new Error("Shipping zone not found")
    if (before.zoneCode === FALLBACK_ZONE_CODE) {
      throw new Error("Cannot delete FALLBACK_CANADA. Update or deactivate it instead.")
    }

    const [regionCount, overrideCount] = await Promise.all([
      prisma.postalFsaRegion.count({ where: { shippingZoneCode: before.zoneCode } }),
      prisma.shippingFsaOverride.count({ where: { overrideZoneCode: before.zoneCode } }),
    ])
    if (regionCount > 0 || overrideCount > 0) {
      throw new Error(
        `Zone ${before.zoneCode} is in use (${regionCount} FSA regions, ${overrideCount} overrides). Reassign them before deleting.`,
      )
    }

    await prisma.shippingZone.delete({ where: { id } })
    await writeAudit({
      action: "delete",
      entityType: "shipping_zone",
      entityId: id,
      before,
      changedBy,
    })
    return { id, deleted: true }
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
      take: Math.min(Number(params.get("limit")) || 5000, 5000),
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
    const regionBand = normalizeRegionBand(input.regionBand)
    if (!regionBand) throw new Error("Region band is required")
    const zoneCode = requireNonEmpty(input.shippingZoneCode, "Shipping zone").toUpperCase()
    await assertZoneExists(zoneCode)
    const row = await prisma.postalFsaRegion.create({
      data: {
        fsa,
        province,
        city: cleanNullable(input.city),
        urbanRural: normalizeUrbanRural(input.urbanRural),
        regionBand,
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
    if (input.urbanRural !== undefined) data.urbanRural = normalizeUrbanRural(input.urbanRural)
    if (input.regionBand !== undefined) data.regionBand = normalizeRegionBand(input.regionBand)
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

export async function deleteFsaRegion(id: string, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.postalFsaRegion.findUnique({ where: { id } })
    if (!before) throw new Error("FSA region not found")
    await prisma.postalFsaRegion.delete({ where: { id } })
    await writeAudit({
      action: "delete",
      entityType: "postal_fsa_region",
      entityId: id,
      before,
      changedBy,
    })
    return { id, deleted: true }
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

export async function deleteFsaOverride(id: string, changedBy?: string | null) {
  return runAdminDbQuery(async () => {
    const prisma = prismaOrThrow()
    const before = await prisma.shippingFsaOverride.findUnique({ where: { id } })
    if (!before) throw new Error("FSA override not found")
    await prisma.shippingFsaOverride.delete({ where: { id } })
    await writeAudit({
      action: "delete",
      entityType: "shipping_fsa_override",
      entityId: id,
      before,
      changedBy,
    })
    return { id, deleted: true }
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

export function buildZoneImportTemplateCsv(): string {
  const header = [
    "zone_code",
    "zone_name",
    "province",
    "urban_rural",
    "region_band",
    "flat_rate",
    "free_shipping_threshold",
    "active",
    "sort_order",
  ]
  const sampleRows = [
    ["ON_SOUTH_URBAN", "Ontario South Urban", "ON", "urban", "south", "9.99", "150.00", "true", "261"],
    ["ON_CENTRAL_RURAL", "Ontario Central Rural", "ON", "rural", "central", "16.99", "150.00", "true", "264"],
    ["FALLBACK_CANADA", "Canada Fallback", "", "fallback", "fallback", "24.99", "150.00", "true", "999"],
  ]
  return [header.join(","), ...sampleRows.map((row) => row.map(csvCell).join(","))].join("\n")
}

export function buildFsaImportTemplateCsv(): string {
  const header = [
    "fsa",
    "province",
    "city",
    "urban_rural",
    "region_band",
    "shipping_zone_code",
    "active",
    "notes",
  ]
  const sampleRows = [
    ["M5V", "ON", "Toronto", "urban", "south", "ON_SOUTH_URBAN", "true", "Downtown core"],
    ["P7B", "ON", "Thunder Bay", "urban", "north", "ON_NORTH_URBAN", "true", "Northern ON"],
    ["V0A", "BC", "Kootenay Region", "rural", "central", "BC_CENTRAL_RURAL", "true", ""],
  ]
  return [header.join(","), ...sampleRows.map((row) => row.map(csvCell).join(","))].join("\n")
}

export async function importShippingZonesCsv(csv: string, changedBy?: string | null): Promise<CsvImportSummary> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  const summary: CsvImportSummary = { inserted: 0, updated: 0, skipped: 0, errors: [] }
  if (lines.length === 0) return summary

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const required = ["zone_code", "zone_name", "urban_rural", "flat_rate"]
  for (const h of required) {
    if (!headers.includes(h)) {
      return {
        inserted: 0,
        updated: 0,
        skipped: Math.max(lines.length - 1, 0),
        errors: [{ row: 1, error: `Missing required column: ${h}` }],
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const rowNo = i + 1
    const cells = parseCsvLine(lines[i])
    if (cells.every((c) => !c.trim())) {
      summary.skipped++
      continue
    }

    const record: Record<string, string> = {}
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? "").trim()
    })

    try {
      const zoneCode = requireNonEmpty(record.zone_code, "Zone code").toUpperCase()
      const zoneName = requireNonEmpty(record.zone_name, "Zone name")
      const province = normalizeProvince(record.province) ?? null
      const urbanRural = normalizeUrbanRural(record.urban_rural)
      const regionBand = normalizeRegionBand(record.region_band)
      const flatRate = moneyDecimal(record.flat_rate)
      const freeShippingThreshold = moneyDecimal(record.free_shipping_threshold, 150)
      const active = boolFromUnknown(record.active, true)
      const sortOrder = Number(record.sort_order)
      const normalizedSort = Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0

      const prisma = prismaOrThrow()
      const before = await prisma.shippingZone.findUnique({ where: { zoneCode } })
      const after = await prisma.shippingZone.upsert({
        where: { zoneCode },
        create: {
          zoneCode,
          zoneName,
          province,
          urbanRural,
          regionBand,
          flatRate,
          freeShippingThreshold,
          active,
          sortOrder: normalizedSort,
        },
        update: {
          zoneName,
          province,
          urbanRural,
          regionBand,
          flatRate,
          freeShippingThreshold,
          active,
          sortOrder: normalizedSort,
        },
      })

      await writeAudit({
        action: before ? "update" : "create",
        entityType: "shipping_zone",
        entityId: after.id,
        before,
        after,
        changedBy,
      })
      if (before) summary.updated++
      else summary.inserted++
    } catch (err) {
      summary.errors.push({
        row: rowNo,
        error: err instanceof Error ? err.message : "Unknown row error",
      })
      summary.skipped++
    }
  }

  return summary
}

export async function importFsaRegionsCsv(csv: string, changedBy?: string | null): Promise<CsvImportSummary> {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  const summary: CsvImportSummary = { inserted: 0, updated: 0, skipped: 0, errors: [] }
  if (lines.length === 0) return summary
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const required = ["fsa", "province", "urban_rural", "region_band", "shipping_zone_code"]
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
      const regionBand = normalizeRegionBand(input.regionBand)
      if (!regionBand) throw new Error("Invalid region band")
      const urbanRural = normalizeUrbanRural(input.urbanRural)
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
          urbanRural,
          regionBand,
          shippingZoneCode: zoneCode,
          active: input.active ?? true,
          notes: cleanNullable(input.notes),
        },
        update: {
          province,
          city: cleanNullable(input.city),
          urbanRural,
          regionBand,
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

    const fallback = async (reason: string, inferredProvince: string | null): Promise<ShippingRateResponse> => {
      const provincialFallbackCode = provincialFallbackZoneCode(inferredProvince)
      const provinceZone =
        provincialFallbackCode
          ? await prisma.shippingZone.findUnique({ where: { zoneCode: provincialFallbackCode } })
          : null
      const zone = provinceZone?.active
        ? provinceZone
        : await prisma.shippingZone.findUnique({ where: { zoneCode: FALLBACK_ZONE_CODE } })
      if (!zone) return { success: false, error: "Fallback shipping zone is missing." }
      if (!zone.active) return { success: false, error: "Fallback shipping zone is inactive." }
      if (params.recordFallbackUsage) {
        await writeAudit({
          action: "fallback_used",
          entityType: "shipping_rate",
          after: { fsa, reason, inferredProvince, zoneCode: zone.zoneCode },
        })
      }
      return rateResult({
        postalCode,
        fsa,
        zone,
        province: inferredProvince,
        urbanRural: zone.urbanRural || "fallback",
        regionBand: zone.regionBand || "fallback",
        orderSubtotal,
        overrideUsed: false,
        fallbackUsed: true,
        fallbackReason:
          provinceZone?.active
            ? `${reason} Using provincial fallback zone ${provinceZone.zoneCode}.`
            : reason,
      })
    }

    const inferredProvince = inferProvinceFromFsa(fsa)

    if (!isValidFsa(fsa)) {
      return fallback("Postal code did not contain a valid Canadian FSA.", inferredProvince)
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

    return fallback("No active FSA mapping was found for this postal code.", inferredProvince)
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

function csvCell(value: unknown): string {
  if (value == null) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, "\"\"")}"`
  }
  return s
}

export async function exportShippingCsv(
  type: "zones" | "regions" | "overrides",
  params?: URLSearchParams,
): Promise<string> {
  if (type === "zones") {
    const zones = await listShippingZones(params)
    const header = [
      "zone_code",
      "zone_name",
      "province",
      "urban_rural",
      "region_band",
      "flat_rate",
      "free_shipping_threshold",
      "active",
      "sort_order",
    ]
    const rows = zones.map((z) =>
      [
        z.zoneCode,
        z.zoneName,
        z.province ?? "",
        z.urbanRural,
        z.regionBand ?? "",
        moneyNumber(z.flatRate),
        moneyNumber(z.freeShippingThreshold),
        z.active,
        z.sortOrder,
      ].map(csvCell).join(","),
    )
    return [header.join(","), ...rows].join("\n")
  }

  if (type === "regions") {
    const search = params ?? new URLSearchParams()
    const regions = await listFsaRegions(search)
    const header = [
      "fsa",
      "province",
      "city",
      "urban_rural",
      "region_band",
      "shipping_zone_code",
      "active",
      "notes",
    ]
    const rows = regions.map((r) =>
      [
        r.fsa,
        r.province,
        r.city ?? "",
        r.urbanRural,
        r.regionBand ?? "",
        r.shippingZoneCode,
        r.active,
        r.notes ?? "",
      ].map(csvCell).join(","),
    )
    return [header.join(","), ...rows].join("\n")
  }

  const overrides = await listFsaOverrides()
  const header = ["fsa", "override_zone_code", "reason", "active"]
  const rows = overrides.map((o) =>
    [o.fsa, o.overrideZoneCode, o.reason ?? "", o.active].map(csvCell).join(","),
  )
  return [header.join(","), ...rows].join("\n")
}
