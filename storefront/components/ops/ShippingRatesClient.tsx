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

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-brand-400"
const buttonClass =
  "rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-zinc-950 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
const ghostButtonClass =
  "rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800"

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
  const [filters, setFilters] = useState({ q: "", province: "", zone: "", urbanRural: "", active: "" })
  const [testResult, setTestResult] = useState<RateResult | null>(null)

  const zoneCodes = useMemo(() => zones.map((z) => z.zoneCode), [zones])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v) qs.set(k, v)
      })
      const [z, r, o, f] = await Promise.all([
        api<{ zones: Zone[] }>("/api/ops/shipping/zones"),
        api<{ regions: FsaRegion[] }>(`/api/ops/shipping/fsa-regions?${qs.toString()}`),
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
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitJson(url: string, body: unknown, method = "POST") {
    setMessage(null)
    setError(null)
    try {
      await api(url, { method, body: JSON.stringify(body) })
      setMessage("Saved.")
      await refresh()
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
      await refresh()
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

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const f = new FormData(event.currentTarget)
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
      await refresh()
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
        <h1 className="text-2xl font-semibold tracking-tight text-white">Shipping Rates</h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
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
              tab === id ? "bg-brand-500 text-zinc-950" : "border border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message ? <div className="rounded-md border border-emerald-900 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">{message}</div> : null}
      {error ? <div className="rounded-md border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</div> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading shipping settings...</p> : null}

      {tab === "zones" ? (
        <section className="space-y-4">
          <form onSubmit={createZone} className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 md:grid-cols-4">
            <input name="zoneCode" placeholder="ZONE_CODE" className={inputClass} required />
            <input name="zoneName" placeholder="Zone name" className={inputClass} required />
            <input name="province" placeholder="Province (optional)" className={inputClass} />
            <input name="urbanRural" placeholder="urban/rural/north" className={inputClass} required />
            <input name="regionBand" placeholder="region band" className={inputClass} />
            <input name="flatRate" placeholder="Flat rate" className={inputClass} required />
            <input name="freeShippingThreshold" placeholder="Free threshold" defaultValue="150.00" className={inputClass} />
            <input name="sortOrder" placeholder="Sort" defaultValue="0" className={inputClass} />
            <button className={buttonClass}>Create zone</button>
          </form>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr><th className="p-3">Code</th><th>Name</th><th>Province</th><th>Type</th><th>Band</th><th>Rate</th><th>Free over</th><th>Active</th><th>Sort</th><th /></tr>
              </thead>
              <tbody>
                {zones.map((z, i) => (
                  <tr key={z.id} className="border-t border-zinc-800">
                    <td className="p-3 font-mono text-xs text-zinc-300">{z.zoneCode}</td>
                    <td><input className={inputClass} value={z.zoneName} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, zoneName: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={z.province ?? ""} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, province: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={z.urbanRural} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, urbanRural: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={z.regionBand ?? ""} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, regionBand: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={String(z.flatRate ?? "")} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, flatRate: e.target.value } : r))} /></td>
                    <td><input className={inputClass} value={String(z.freeShippingThreshold ?? "")} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, freeShippingThreshold: e.target.value } : r))} /></td>
                    <td className="text-center"><input type="checkbox" checked={z.active} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, active: e.target.checked } : r))} /></td>
                    <td><input className={inputClass} value={z.sortOrder} onChange={(e) => setZones((rows) => rows.map((r, idx) => idx === i ? { ...r, sortOrder: Number(e.target.value) || 0 } : r))} /></td>
                    <td className="p-3">
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        <button type="button" className={ghostButtonClass} onClick={() => saveZone(z)}>Save</button>
                        <button
                          type="button"
                          className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/40"
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
          <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 md:grid-cols-6">
            {(["q", "province", "zone", "urbanRural"] as const).map((k) => (
              <input key={k} className={inputClass} placeholder={k} value={filters[k]} onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))} />
            ))}
            <select className={inputClass} value={filters.active} onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value }))}>
              <option value="">Any active</option><option value="true">Active</option><option value="false">Inactive</option>
            </select>
            <button className={buttonClass} onClick={refresh}>Search</button>
          </div>
          <form onSubmit={createRegion} className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 md:grid-cols-4">
            <input name="fsa" placeholder="FSA" className={inputClass} required />
            <input name="province" placeholder="Province" className={inputClass} required />
            <input name="city" placeholder="City" className={inputClass} />
            <input name="urbanRural" placeholder="urban/rural/north" className={inputClass} required />
            <input name="regionBand" placeholder="region band" className={inputClass} />
            <select name="shippingZoneCode" className={inputClass} required>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select>
            <input name="notes" placeholder="Notes" className={inputClass} />
            <button className={buttonClass}>Create FSA mapping</button>
          </form>
          <form onSubmit={importCsv} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
            <label className="block text-sm font-medium text-zinc-300">CSV import</label>
            <input name="file" type="file" accept=".csv,text/csv" className="mt-2 text-sm text-zinc-300" />
            <p className="mt-2 text-xs text-zinc-500">Columns: fsa, province, city, urban_rural, region_band, shipping_zone_code, active, notes</p>
            <button className={`${buttonClass} mt-3`}>Import CSV</button>
          </form>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500"><tr><th className="p-3">FSA</th><th>Province</th><th>City</th><th>Type</th><th>Band</th><th>Zone</th><th>Active</th><th>Notes</th><th /></tr></thead>
              <tbody>{regions.map((r, i) => (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="p-3 font-mono text-xs">{r.fsa}</td>
                  <td><input className={inputClass} value={r.province} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, province: e.target.value } : x))} /></td>
                  <td><input className={inputClass} value={r.city ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, city: e.target.value } : x))} /></td>
                  <td><input className={inputClass} value={r.urbanRural} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, urbanRural: e.target.value } : x))} /></td>
                  <td><input className={inputClass} value={r.regionBand ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, regionBand: e.target.value } : x))} /></td>
                  <td><select className={inputClass} value={r.shippingZoneCode} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, shippingZoneCode: e.target.value } : x))}>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select></td>
                  <td className="text-center"><input type="checkbox" checked={r.active} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, active: e.target.checked } : x))} /></td>
                  <td><input className={inputClass} value={r.notes ?? ""} onChange={(e) => setRegions((rows) => rows.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))} /></td>
                  <td className="p-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <button type="button" className={ghostButtonClass} onClick={() => saveRegion(r)}>Save</button>
                      <button
                        type="button"
                        className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/40"
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
          <form onSubmit={createOverride} className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 md:grid-cols-4">
            <input name="fsa" placeholder="FSA" className={inputClass} required />
            <select name="overrideZoneCode" className={inputClass} required>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select>
            <input name="reason" placeholder="Reason" className={inputClass} />
            <button className={buttonClass}>Create override</button>
          </form>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500"><tr><th className="p-3">FSA</th><th>Zone</th><th>Reason</th><th>Active</th><th /></tr></thead>
              <tbody>{overrides.map((o, i) => (
                <tr key={o.id} className="border-t border-zinc-800">
                  <td className="p-3 font-mono text-xs">{o.fsa}</td>
                  <td><select className={inputClass} value={o.overrideZoneCode} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, overrideZoneCode: e.target.value } : x))}>{zoneCodes.map((z) => <option key={z} value={z}>{z}</option>)}</select></td>
                  <td><input className={inputClass} value={o.reason ?? ""} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, reason: e.target.value } : x))} /></td>
                  <td className="text-center"><input type="checkbox" checked={o.active} onChange={(e) => setOverrides((rows) => rows.map((x, idx) => idx === i ? { ...x, active: e.target.checked } : x))} /></td>
                  <td className="p-3">
                    <div className="flex flex-nowrap items-center justify-end gap-2">
                      <button type="button" className={ghostButtonClass} onClick={() => saveOverride(o)}>Save</button>
                      <button
                        type="button"
                        className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950/40"
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

      {tab === "tester" ? (
        <section className="space-y-4">
          <form onSubmit={testRate} className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 md:grid-cols-3">
            <input name="postalCode" placeholder="Postal code (N6G 1A1)" className={inputClass} required />
            <input name="orderSubtotal" placeholder="Order subtotal" defaultValue="75.00" className={inputClass} />
            <button className={buttonClass}>Test rate</button>
          </form>
          {testResult ? (
            <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-200">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          ) : null}
        </section>
      ) : null}

      {tab === "fallback" ? (
        <section className="space-y-4">
          {!fallback?.zone ? (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-100">Fallback zone is missing. Checkout fallback will fail until FALLBACK_CANADA exists.</div>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
              {!fallback.zone.active ? <div className="mb-4 rounded-md border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-100">Warning: fallback zone is disabled.</div> : null}
              <p className="text-sm text-zinc-400">Fallback usage count: <span className="font-mono text-zinc-200">{fallback.fallbackUsageCount}</span></p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <input className={inputClass} value={fallback.zone.zoneName} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, zoneName: e.target.value } } : f)} />
                <input className={inputClass} value={String(fallback.zone.flatRate ?? "")} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, flatRate: e.target.value } } : f)} />
                <input className={inputClass} value={String(fallback.zone.freeShippingThreshold ?? "")} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, freeShippingThreshold: e.target.value } } : f)} />
                <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={fallback.zone.active} onChange={(e) => setFallback((f) => f ? { ...f, zone: { ...fallback.zone!, active: e.target.checked } } : f)} /> Active</label>
              </div>
              <button type="button" className={`${buttonClass} mt-4`} onClick={() => fallback.zone && submitJson("/api/ops/shipping/fallback", fallback.zone, "PATCH")}>Save fallback</button>
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

