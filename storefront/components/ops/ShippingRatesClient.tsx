"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"

type Zone = {
  id: string
  zoneCode: string
  zoneName: string
  province: string | null
  urbanRural: string
  regionBand: string | null
  flatRate: string | number
  freeShippingThreshold: string | number
  active: boolean
  sortOrder: number
}

type FsaRegion = {
  id: string
  fsa: string
  province: string
  city: string | null
  urbanRural: string
  regionBand: string | null
  shippingZoneCode: string
  active: boolean
  notes: string | null
}

type FsaOverride = {
  id: string
  fsa: string
  overrideZoneCode: string
  reason: string | null
  active: boolean
}

type RateResult = Record<string, unknown> & { success?: boolean; error?: string }
type SortDirection = "asc" | "desc"

const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
const buttonClass =
  "rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
const ghostButtonClass =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"

const provinceOptions = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const
const urbanRuralOptions = ["urban", "rural", "north", "far_north", "remote", "fallback"] as const
const regionBandOptions = ["south", "central", "north", "far_north", "remote", "interior", "atlantic", "fallback"] as const

function money(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : "0.00"
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`)
  return data
}

export default function ShippingRatesClient() {
  const [tab, setTab] = useState("zones")
  const [zones, setZones] = useState<Zone[]>([])
  const [regions, setRegions] = useState<FsaRegion[]>([])
  const [overrides, setOverrides] = useState<FsaOverride[]>([])
  const [fallback, setFallback] = useState<{ zone: Zone | null; fallbackUsageCount: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [zoneFilters, setZoneFilters] = useState({ q: "", province: "", urbanRural: "", regionBand: "", active: "" })
  const [regionFilters, setRegionFilters] = useState({ q: "", province: "", zone: "", urbanRural: "", active: "" })
  const [regionLimit, setRegionLimit] = useState("250")
  const [zoneBulk, setZoneBulk] = useState({ flatRate: "", freeShippingThreshold: "" })
  const [zoneTopTab, setZoneTopTab] = useState<"filters" | "bulk" | "importExport" | "create">("filters")
  const [regionTopTab, setRegionTopTab] = useState<"filters" | "importExport" | "import" | "create">("filters")
  const [testResult, setTestResult] = useState<RateResult | null>(null)
  const [zoneSort, setZoneSort] = useState<{ key: string; dir: SortDirection }>({ key: "zoneCode", dir: "asc" })
  const [regionSort, setRegionSort] = useState<{ key: string; dir: SortDirection }>({ key: "fsa", dir: "asc" })
  const [overrideSort, setOverrideSort] = useState<{ key: string; dir: SortDirection }>({ key: "fsa", dir: "asc" })

  const zoneCodes = useMemo(() => zones.map((z) => z.zoneCode), [zones])

  function buildZoneQueryString() {
    const zoneQs = new URLSearchParams()
    Object.entries(zoneFilters).forEach(([k, v]) => {
      if (v) zoneQs.set(k, v)
    })
    return zoneQs.toString()
  }

  function buildRegionQueryString() {
    const regionQs = new URLSearchParams()
    Object.entries(regionFilters).forEach(([k, v]) => {
      if (v) regionQs.set(k, v)
    })
    regionQs.set("limit", regionLimit)
    return regionQs.toString()
  }

  async function refreshZones() {
    setLoading(true)
    setError(null)
    try {
      const z = await api<{ zones: Zone[] }>(`/api/ops/shipping/zones?${buildZoneQueryString()}`)
      setZones(z.zones)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shipping zones")
    } finally {
      setLoading(false)
    }
  }

  async function refreshRegions() {
    setLoading(true)
    setError(null)
    try {
      const r = await api<{ regions: FsaRegion[] }>(`/api/ops/shipping/fsa-regions?${buildRegionQueryString()}`)
      setRegions(r.regions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load FSA regions")
    } finally {
      setLoading(false)
    }
  }

  async function refreshAll() {
    setLoading(true)
    setError(null)
    try {
      const [z, r, o, f] = await Promise.all([
        api<{ zones: Zone[] }>(`/api/ops/shipping/zones?${buildZoneQueryString()}`),
        api<{ regions: FsaRegion[] }>(`/api/ops/shipping/fsa-regions?${buildRegionQueryString()}`),
        api<{ overrides: FsaOverride[] }>("/api/ops/shipping/overrides"),
        api<{ zone: Zone | null; fallbackUsageCount: number }>("/api/ops/shipping/fallback"),
      ])
      setZones(z.zones)
      setRegions(r.regions)
      setOverrides(o.overrides)
      setFallback(f)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load shipping rates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitJson(url: string, body: unknown, method = "POST") {
    setMessage(null)
    setError(null)
    try {
      await api(url, { method, body: JSON.stringify(body) })
      setMessage("Saved.")
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  async function removeItem(url: string, label: string) {
    if (!confirm(`Delete ${label}? This cannot be undone.`)) return
    setMessage(null)
    setError(null)
    try {
      await api(url, { method: "DELETE" })
      setMessage("Deleted.")
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function createZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    await submitJson("/api/ops/shipping/zones", Object.fromEntries(f.entries()))
    event.currentTarget.reset()
  }

  async function applyBulkZoneRates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)
    const payload: Record<string, unknown> = { filters: zoneFilters }
    if (zoneBulk.flatRate.trim()) payload.flatRate = zoneBulk.flatRate
    if (zoneBulk.freeShippingThreshold.trim()) payload.freeShippingThreshold = zoneBulk.freeShippingThreshold
    if (!("flatRate" in payload) && !("freeShippingThreshold" in payload)) {
      setError("Enter at least one rate value for mass update.")
      return
    }
    try {
      const result = await api<{ summary: { matched: number; updated: number } }>("/api/ops/shipping/zones/bulk", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setMessage(`Bulk update complete: ${result.summary.updated} zones updated (${result.summary.matched} matched).`)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed")
    }
  }

  async function saveZone(zone: Zone) {
    await submitJson(`/api/ops/shipping/zones/${zone.id}`, zone, "PATCH")
  }

  async function createRegion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    await submitJson("/api/ops/shipping/fsa-regions", Object.fromEntries(f.entries()))
    event.currentTarget.reset()
  }

  async function saveRegion(region: FsaRegion) {
    await submitJson(`/api/ops/shipping/fsa-regions/${region.id}`, region, "PATCH")
  }

  async function createOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    await submitJson("/api/ops/shipping/overrides", Object.fromEntries(f.entries()))
    event.currentTarget.reset()
  }

  async function saveOverride(override: FsaOverride) {
    await submitJson(`/api/ops/shipping/overrides/${override.id}`, override, "PATCH")
  }

  async function importCsv(event: FormEvent<HTMLFormElement>, type: "regions" | "zones") {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    f.set("type", type)
    setError(null)
    try {
      const result = await api<{ summary: { inserted: number; updated: number; skipped: number; errors: Array<{ row: number; error: string }> } }>(
        "/api/ops/shipping/import",
        { method: "POST", body: f },
      )
      setMessage(
        `Import complete: ${result.summary.inserted} inserted, ${result.summary.updated} updated, ${result.summary.skipped} skipped.`,
      )
      if (result.summary.errors.length) {
        setError(result.summary.errors.slice(0, 8).map((e) => `Row ${e.row}: ${e.error}`).join(" | "))
      }
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    }
  }

  async function testRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
    setError(null)
    try {
      setTestResult(
        await api<RateResult>("/api/ops/shipping/test", {
          method: "POST",
          body: JSON.stringify(Object.fromEntries(f.entries())),
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rate test failed")
    }
  }

  function compareValues(a: unknown, b: unknown, dir: SortDirection) {
    const aNum = Number(a)
    const bNum = Number(b)
    let result = 0
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
      result = aNum - bNum
    } else if (typeof a === "boolean" || typeof b === "boolean") {
      result = Number(Boolean(a)) - Number(Boolean(b))
    } else {
      result = String(a ?? "").localeCompare(String(b ?? ""), "en", { sensitivity: "base" })
    }
    return dir === "asc" ? result : -result
  }

  function sortZonesBy(key: keyof Zone) {
    const dir: SortDirection = zoneSort.key === key ? (zoneSort.dir === "asc" ? "desc" : "asc") : "asc"
    setZoneSort({ key, dir })
    setZones((rows) => [...rows].sort((a, b) => compareValues(a[key], b[key], dir)))
  }

  function sortRegionsBy(key: keyof FsaRegion) {
    const dir: SortDirection = regionSort.key === key ? (regionSort.dir === "asc" ? "desc" : "asc") : "asc"
    setRegionSort({ key, dir })
    setRegions((rows) => [...rows].sort((a, b) => compareValues(a[key], b[key], dir)))
  }

  function sortOverridesBy(key: keyof FsaOverride) {
    const dir: SortDirection = overrideSort.key === key ? (overrideSort.dir === "asc" ? "desc" : "asc") : "asc"
    setOverrideSort({ key, dir })
    setOverrides((rows) => [...rows].sort((a, b) => compareValues(a[key], b[key], dir)))
  }

  async function downloadCsv(type: "zones" | "regions" | "overrides", fileName: string) {
    setError(null)
    try {
      const params = type === "zones" ? zoneFilters : regionFilters
      const res = await fetch(`/api/ops/shipping/export?type=${type}&${new URLSearchParams(params).toString()}`)
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Export failed")
      }
      const text = await res.text()
      const blob = new Blob([text], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    }
  }

  async function downloadTemplate(type: "regions" | "zones") {
    setError(null)
    try {
      const res = await fetch(`/api/ops/shipping/import/template?type=${type}`)
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Template download failed")
      }
      const text = await res.text()
      const blob = new Blob([text], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = type === "zones" ? "shipping-zones-template.csv" : "shipping-fsa-template.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template download failed")
    }
  }

  const tabs = [
    ["zones", "Shipping Zones"],
    ["regions", "FSA Regions"],
    ["overrides", "FSA Overrides"],
    ["tester", "Rate Tester"],
    ["fallback", "Fallback Settings"],
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Shipping Rates</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Canadian postal-code/FSA flat-rate shipping backed by the ops database. Rates are live once saved.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-2 text-sm transition ${
              tab === id ? "bg-brand-500 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {loading ? <p className="text-sm text-slate-500">Loading shipping settings...</p> : null}

      {tab === "zones" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className={zoneTopTab === "filters" ? buttonClass : ghostButtonClass} onClick={() => setZoneTopTab("filters")}>Filters</button>
              <button type="button" className={zoneTopTab === "bulk" ? buttonClass : ghostButtonClass} onClick={() => setZoneTopTab("bulk")}>Bulk Update</button>
              <button type="button" className={zoneTopTab === "importExport" ? buttonClass : ghostButtonClass} onClick={() => setZoneTopTab("importExport")}>Import / Export</button>
              <button type="button" className={zoneTopTab === "create" ? buttonClass : ghostButtonClass} onClick={() => setZoneTopTab("create")}>Create Zone</button>
            </div>

            {zoneTopTab === "filters" ? (
              <div className="grid gap-3 md:grid-cols-6">
                <input className={inputClass} placeholder="Postal Code" value={zoneFilters.q} onChange={(e) => setZoneFilters((f) => ({ ...f, q: e.target.value }))} />
                <select className={inputClass} value={zoneFilters.province} onChange={(e) => setZoneFilters((f) => ({ ...f, province: e.target.value }))}>
                  <option value="">Any province</option>
                  {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className={inputClass} value={zoneFilters.urbanRural} onChange={(e) => setZoneFilters((f) => ({ ...f, urbanRural: e.target.value }))}>
                  <option value="">Any type</option>
                  {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className={inputClass} value={zoneFilters.regionBand} onChange={(e) => setZoneFilters((f) => ({ ...f, regionBand: e.target.value }))}>
                  <option value="">Any band</option>
                  {regionBandOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className={inputClass} value={zoneFilters.active} onChange={(e) => setZoneFilters((f) => ({ ...f, active: e.target.value }))}>
                  <option value="">Any active</option><option value="true">Active</option><option value="false">Inactive</option>
                </select>
                <button className={buttonClass} onClick={refreshZones}>Search</button>
              </div>
            ) : null}

            {zoneTopTab === "bulk" ? (
              <form onSubmit={applyBulkZoneRates} className="grid gap-3 md:grid-cols-4">
                <input
                  className={inputClass}
                  placeholder="Set flat rate (optional)"
                  value={zoneBulk.flatRate}
                  onChange={(e) => setZoneBulk((v) => ({ ...v, flatRate: e.target.value }))}
                />
                <input
                  className={inputClass}
                  placeholder="Set free threshold (optional)"
                  value={zoneBulk.freeShippingThreshold}
                  onChange={(e) => setZoneBulk((v) => ({ ...v, freeShippingThreshold: e.target.value }))}
                />
                <p className="self-center text-sm text-slate-600 md:col-span-1">
                  Applies to current zone filters.
                </p>
                <button className={buttonClass}>Apply to matched zones</button>
              </form>
            ) : null}

            {zoneTopTab === "importExport" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={ghostButtonClass} onClick={() => downloadCsv("zones", "shipping-zones.csv")}>
                    Export zones CSV
                  </button>
                  <button type="button" className={ghostButtonClass} onClick={() => downloadTemplate("zones")}>
                    Download zone template
                  </button>
                </div>
                <form onSubmit={(e) => importCsv(e, "zones")} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Zone CSV import</label>
                  <input name="file" type="file" accept=".csv,text/csv" className="text-sm text-slate-700" />
                  <p className="text-xs text-slate-500">Columns: zone_code, zone_name, province, urban_rural, region_band, flat_rate, free_shipping_threshold, active, sort_order</p>
                  <button className={buttonClass}>Import zones CSV</button>
                </form>
              </div>
            ) : null}

            {zoneTopTab === "create" ? (
              <form onSubmit={createZone} className="grid gap-3 md:grid-cols-4">
                <input name="zoneCode" placeholder="ZONE_CODE" className={inputClass} required />
                <input name="zoneName" placeholder="Zone name" className={inputClass} required />
                <select name="province" className={inputClass} defaultValue="">
                  <option value="">Province (optional)</option>
                  {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select name="urbanRural" className={inputClass} defaultValue="urban" required>
                  {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="regionBand" className={inputClass} defaultValue="">
                  <option value="">Region band (optional)</option>
                  {regionBandOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <input name="flatRate" placeholder="Flat rate" className={inputClass} required />
                <input name="freeShippingThreshold" placeholder="Free threshold" defaultValue="150.00" className={inputClass} />
                <input name="sortOrder" placeholder="Sort" defaultValue="0" className={inputClass} />
                <button className={buttonClass}>Create zone</button>
              </form>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3"><button type="button" onClick={() => sortZonesBy("zoneCode")}>Code</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("zoneName")}>Name</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("province")}>Province</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("urbanRural")}>Type</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("regionBand")}>Band</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("flatRate")}>Rate</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("freeShippingThreshold")}>Free over</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("active")}>Active</button></th>
                  <th><button type="button" onClick={() => sortZonesBy("sortOrder")}>Sort</button></th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {zones.map((z, i) => (
                  <tr key={z.id} className="border-t border-slate-200">
                    <td className="p-3 font-mono text-xs text-slate-700">{z.zoneCode}</td>
                    <td><input className={inputClass} value={z.zoneName} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, zoneName: e.target.value } : r))} /></td>
                    <td>
                      <select className={inputClass} value={z.province ?? ""} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, province: e.target.value || null } : r))}>
                        <option value="">None</option>
                        {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className={inputClass} value={z.urbanRural} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, urbanRural: e.target.value } : r))}>
                        {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className={inputClass} value={z.regionBand ?? ""} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, regionBand: e.target.value || null } : r))}>
                        <option value="">None</option>
                        {regionBandOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td><input className={inputClass} value={String(z.flatRate ?? "")} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, flatRate: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={String(z.freeShippingThreshold ?? "")} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, freeShippingThreshold: e.target.value } : r))} /></td>
                    <td className="text-center"><input type="checkbox" checked={z.active} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, active: e.target.checked } : r))} /></td>
                    <td><input className={inputClass} value={z.sortOrder} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, sortOrder: Number(e.target.value) || 0 } : r))} /></td>
                    <td className="p-3">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        <button type="button" className={ghostButtonClass} onClick={() => saveZone(z)}>Save</button>
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
                          onClick={() => removeItem(`/api/ops/shipping/zones/${z.id}`, `zone ${z.zoneCode}`)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "regions" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <button type="button" className={regionTopTab === "filters" ? buttonClass : ghostButtonClass} onClick={() => setRegionTopTab("filters")}>Filters</button>
              <button type="button" className={regionTopTab === "importExport" ? buttonClass : ghostButtonClass} onClick={() => setRegionTopTab("importExport")}>Import / Export</button>
              <button type="button" className={regionTopTab === "import" ? buttonClass : ghostButtonClass} onClick={() => setRegionTopTab("import")}>Import CSV</button>
              <button type="button" className={regionTopTab === "create" ? buttonClass : ghostButtonClass} onClick={() => setRegionTopTab("create")}>Create Mapping</button>
            </div>

            {regionTopTab === "filters" ? (
              <div className="grid gap-3 md:grid-cols-6">
                <input className={inputClass} placeholder="Postal Code" value={regionFilters.q} onChange={(e) => setRegionFilters((f) => ({ ...f, q: e.target.value }))} />
                <select className={inputClass} value={regionFilters.province} onChange={(e) => setRegionFilters((f) => ({ ...f, province: e.target.value }))}>
                  <option value="">Any province</option>
                  {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className={inputClass} value={regionFilters.zone} onChange={(e) => setRegionFilters((f) => ({ ...f, zone: e.target.value }))}>
                  <option value="">Any zone</option>
                  {zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
                <select className={inputClass} value={regionFilters.urbanRural} onChange={(e) => setRegionFilters((f) => ({ ...f, urbanRural: e.target.value }))}>
                  <option value="">Any type</option>
                  {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select className={inputClass} value={regionFilters.active} onChange={(e) => setRegionFilters((f) => ({ ...f, active: e.target.value }))}>
                  <option value="">Any active</option><option value="true">Active</option><option value="false">Inactive</option>
                </select>
                <select className={inputClass} value={regionLimit} onChange={(e) => setRegionLimit(e.target.value)}>
                  <option value="100">100 rows</option>
                  <option value="250">250 rows</option>
                  <option value="500">500 rows</option>
                  <option value="1000">1000 rows</option>
                </select>
                <button className={buttonClass} onClick={refreshRegions}>Search</button>
              </div>
            ) : null}

            {regionTopTab === "importExport" ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" className={ghostButtonClass} onClick={() => downloadCsv("regions", "shipping-regions.csv")}>
                  Export regions CSV
                </button>
                <button type="button" className={ghostButtonClass} onClick={() => downloadTemplate("regions")}>
                  Download import template
                </button>
              </div>
            ) : null}

            {regionTopTab === "import" ? (
              <form onSubmit={(e) => importCsv(e, "regions")} className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">CSV import</label>
                <input name="file" type="file" accept=".csv,text/csv" className="text-sm text-slate-700" />
                <p className="text-xs text-slate-500">Columns: fsa, province, city, urban_rural, region_band, shipping_zone_code, active, notes</p>
                <button className={buttonClass}>Import CSV</button>
              </form>
            ) : null}

            {regionTopTab === "create" ? (
              <form onSubmit={createRegion} className="grid gap-3 md:grid-cols-4">
                <input name="fsa" placeholder="FSA" className={inputClass} required />
                <select name="province" className={inputClass} defaultValue="ON" required>
                  {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input name="city" placeholder="City" className={inputClass} />
                <select name="urbanRural" className={inputClass} defaultValue="urban" required>
                  {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="regionBand" className={inputClass} defaultValue="south" required>
                  {regionBandOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <select name="shippingZoneCode" className={inputClass} required>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select>
                <input name="notes" placeholder="Notes" className={inputClass} />
                <button className={buttonClass}>Create FSA mapping</button>
              </form>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3"><button type="button" onClick={() => sortRegionsBy("fsa")}>FSA</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("province")}>Province</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("city")}>City</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("urbanRural")}>Type</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("regionBand")}>Band</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("shippingZoneCode")}>Zone</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("active")}>Active</button></th>
                  <th><button type="button" onClick={() => sortRegionsBy("notes")}>Notes</button></th>
                  <th />
                </tr>
              </thead>
              <tbody>{regions.map((r, i) => (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="p-3 font-mono text-xs">{r.fsa}</td>
                  <td>
                    <select className={inputClass} value={r.province} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, province: e.target.value } : x))}>
                      {provinceOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td><input className={inputClass} value={r.city ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, city: e.target.value } : x))} /></td>
                  <td>
                    <select className={inputClass} value={r.urbanRural} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, urbanRural: e.target.value } : x))}>
                      {urbanRuralOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className={inputClass} value={r.regionBand ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, regionBand: e.target.value || null } : x))}>
                      <option value="">None</option>
                      {regionBandOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      className={inputClass}
                      list="zone-code-list"
                      value={r.shippingZoneCode}
                      onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, shippingZoneCode: e.target.value } : x))}
                    />
                  </td>
                  <td className="text-center"><input type="checkbox" checked={r.active} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, active: e.target.checked } : x))} /></td>
                  <td><input className={inputClass} value={r.notes ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))} /></td>
                  <td className="p-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <button type="button" className={ghostButtonClass} onClick={() => saveRegion(r)}>Save</button>
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
                        onClick={() => removeItem(`/api/ops/shipping/fsa-regions/${r.id}`, `FSA mapping ${r.fsa}`)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "overrides" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButtonClass} onClick={() => downloadCsv("overrides", "shipping-overrides.csv")}>
              Export overrides CSV
            </button>
          </div>
          <form onSubmit={createOverride} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
            <input name="fsa" placeholder="FSA" className={inputClass} required />
            <select name="overrideZoneCode" className={inputClass} required>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select>
            <input name="reason" placeholder="Reason" className={inputClass} />
            <button className={buttonClass}>Create override</button>
          </form>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3"><button type="button" onClick={() => sortOverridesBy("fsa")}>FSA</button></th>
                  <th><button type="button" onClick={() => sortOverridesBy("overrideZoneCode")}>Zone</button></th>
                  <th><button type="button" onClick={() => sortOverridesBy("reason")}>Reason</button></th>
                  <th><button type="button" onClick={() => sortOverridesBy("active")}>Active</button></th>
                  <th />
                </tr>
              </thead>
              <tbody>{overrides.map((o, i) => (
                <tr key={o.id} className="border-t border-slate-200">
                  <td className="p-3 font-mono text-xs">{o.fsa}</td>
                  <td><select className={inputClass} value={o.overrideZoneCode} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, overrideZoneCode: e.target.value } : x))}>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select></td>
                  <td><input className={inputClass} value={o.reason ?? ""} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, reason: e.target.value } : x))} /></td>
                  <td className="text-center"><input type="checkbox" checked={o.active} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, active: e.target.checked } : x))} /></td>
                  <td className="p-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <button type="button" className={ghostButtonClass} onClick={() => saveOverride(o)}>Save</button>
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 transition hover:bg-red-50"
                        onClick={() => removeItem(`/api/ops/shipping/overrides/${o.id}`, `FSA override ${o.fsa}`)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}

      <datalist id="zone-code-list">
        {zoneCodes.map((z) => <option key={z} value={z} />)}
      </datalist>

      {tab === "tester" ? (
        <section className="space-y-4">
          <form onSubmit={testRate} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
            <input name="postalCode" placeholder="Postal code (N6G 1A1)" className={inputClass} required />
            <input name="orderSubtotal" placeholder="Order subtotal" defaultValue="75.00" className={inputClass} />
            <button className={buttonClass}>Test rate</button>
          </form>
          {testResult ? (
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-800">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}

      {tab === "fallback" ? (
        <section className="space-y-4">
          {!fallback?.zone ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Fallback zone is missing. Checkout fallback will fail until FALLBACK_CANADA exists.</div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              {!fallback.zone.active ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Warning: fallback zone is disabled.</div> : null}
              <p className="text-sm text-slate-600">Fallback usage count: <span className="font-mono text-slate-800">{fallback.fallbackUsageCount}</span></p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <input className={inputClass} value={fallback.zone.zoneName} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, zoneName: e.target.value } } : f)} />
                <input className={inputClass} value={String(fallback.zone.flatRate ?? "")} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, flatRate: e.target.value } } : f)} />
                <input className={inputClass} value={String(fallback.zone.freeShippingThreshold ?? "")} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, freeShippingThreshold: e.target.value } } : f)} />
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={fallback.zone.active} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, active: e.target.checked } } : f)} /> Active</label>
              </div>
              <button type="button" className={`${buttonClass} mt-4`} onClick={() => fallback.zone && submitJson("/api/ops/shipping/fallback", fallback.zone, "PATCH")}>Save fallback</button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

