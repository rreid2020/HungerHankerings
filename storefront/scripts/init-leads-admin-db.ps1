#!/usr/bin/env pwsh
<#
Applies init-leads-db.sql to the hungerhankeringsadmin database (or -DatabaseName).

Loads DB_HOST, DB_PORT, DB_USER, DB_PASSWORD from apps/vendure/.env by default.
Requires SSL (DigitalOcean managed Postgres): sets PGSSLMODE=require.

Usage (repo root):
  pwsh -File storefront/scripts/init-leads-admin-db.ps1

Optional: create the database first if it does not exist (connects to `postgres`):
  pwsh -File storefront/scripts/init-leads-admin-db.ps1 -CreateDatabase

If psql hangs, add your current IP under DigitalOcean → Database → Trusted sources.
#>
param(
  [string]$EnvFile = "",
  [string]$DatabaseName = "hungerhankeringsadmin",
  [switch]$CreateDatabase
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

if (-not $EnvFile) {
  $EnvFile = Join-Path $repoRoot "apps\vendure\.env"
}
if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

Get-Content $EnvFile | ForEach-Object {
  if ($_ -match "^\s*#" -or $_ -notmatch "=") {
    return
  }
  $i = $_.IndexOf("=")
  if ($i -gt 0) {
    $k = $_.Substring(0, $i).Trim()
    $v = $_.Substring($i + 1).Trim()
    [Environment]::SetEnvironmentVariable($k, $v, "Process")
  }
}

foreach ($r in @("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD")) {
  if (-not [Environment]::GetEnvironmentVariable($r, "Process")) {
    throw "Missing $r in $EnvFile"
  }
}

# psql reads PGPASSWORD, not DB_PASSWORD — without this it prompts and ignores .env.
$env:PGPASSWORD = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
$env:PGSSLMODE = "require"

$sqlFile = Join-Path $repoRoot "storefront\scripts\init-leads-db.sql"
if (-not (Test-Path $sqlFile)) {
  throw "Missing $sqlFile"
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql not found. Install PostgreSQL client tools or add psql to PATH."
}

if ($CreateDatabase) {
  $exists = & psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d postgres -tAc `
    "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed checking database (exit $LASTEXITCODE). Wrong password? Update DB_PASSWORD in $EnvFile from DigitalOcean → Database → Users."
  }
  if (-not ($exists -match "1")) {
    Write-Host "Creating database $DatabaseName ..."
    & psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d postgres -v ON_ERROR_STOP=1 `
      -c "CREATE DATABASE $DatabaseName;"
    if ($LASTEXITCODE -ne 0) {
      throw "psql CREATE DATABASE failed (exit $LASTEXITCODE)."
    }
  }
}

Write-Host "Applying init-leads-db.sql to database $DatabaseName ..."
& psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $DatabaseName -v ON_ERROR_STOP=1 -f $sqlFile
if ($LASTEXITCODE -ne 0) {
  throw "psql failed applying schema (exit $LASTEXITCODE). If auth failed, reset doadmin password in DigitalOcean and update DB_PASSWORD in $EnvFile."
}
Write-Host "Done."
