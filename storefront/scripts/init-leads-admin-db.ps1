#!/usr/bin/env pwsh
<#
Applies storefront/scripts/init-leads-db.sql to hungerhankeringsadmin (or -DatabaseName).

Connection (first match wins):
  1) Environment variables already set when you run this script:
       LEADS_DATABASE_URL  (preferred) or DATABASE_URL
     Use the same private connection string as App Platform (must include database name).
  2) Those variables inside the env file (if not already set in the shell).
  3) DB_HOST, DB_PORT, DB_USER, DB_PASSWORD + -DatabaseName from the env file.

Loading from file never overwrites variables you already exported in the shell — so you can
paste DATABASE_URL from DigitalOcean → App → your web component without editing apps/vendure/.env.

Usage (repo root):
  powershell -NoProfile -File storefront/scripts/init-leads-admin-db.ps1

With URI (recommended if vendure .env is stale):
  $env:LEADS_DATABASE_URL = "postgresql://doadmin:...@host:25060/hungerhankeringsadmin?sslmode=require"
  powershell -NoProfile -File storefront/scripts/init-leads-admin-db.ps1

Optional env file:
  powershell -NoProfile -File storefront/scripts/init-leads-admin-db.ps1 -EnvFile "C:\secrets\prod.env"

Optional: create database (DB_* mode only; or create DB in DO console first):
  ... -CreateDatabase
#>
param(
  [string]$EnvFile = "",
  [string]$DatabaseName = "hungerhankeringsadmin",
  [switch]$CreateDatabase
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Strip-EnvQuotes([string]$s) {
  $t = $s.Trim()
  if (
    ($t.Length -ge 2) -and (
      ($t.StartsWith('"') -and $t.EndsWith('"')) -or
      ($t.StartsWith("'") -and $t.EndsWith("'"))
    )
  ) {
    return $t.Substring(1, $t.Length - 2)
  }
  return $t
}

function Add-SslModeRequire([string]$Uri) {
  if ($Uri -match "[\?\&]sslmode=") {
    return $Uri
  }
  if ($Uri -match "\?") {
    return "$Uri&sslmode=require"
  }
  return "$Uri?sslmode=require"
}

function Import-DotEnv([string]$Path) {
  Get-Content $Path | ForEach-Object {
    if ($_ -match "^\s*#" -or $_ -notmatch "=") {
      return
    }
    $i = $_.IndexOf("=")
    if ($i -gt 0) {
      $k = $_.Substring(0, $i).Trim()
      $v = Strip-EnvQuotes ($_.Substring($i + 1).Trim())
      $cur = [Environment]::GetEnvironmentVariable($k, "Process")
      if ([string]::IsNullOrEmpty($cur)) {
        [Environment]::SetEnvironmentVariable($k, $v, "Process")
      }
    }
  }
}

function Get-FirstConnectionUri {
  foreach ($key in @("LEADS_DATABASE_URL", "DATABASE_URL")) {
    $v = [Environment]::GetEnvironmentVariable($key, "Process")
    if ($v -and $v.Trim()) {
      return @{ Uri = $v.Trim(); Key = $key }
    }
  }
  return $null
}

$sqlFile = Join-Path $repoRoot "storefront\scripts\init-leads-db.sql"
if (-not (Test-Path $sqlFile)) {
  throw "Missing $sqlFile"
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql not found. Install PostgreSQL client tools or add psql to PATH."
}

$defaultEnvFile = Join-Path $repoRoot "apps\vendure\.env"
if (-not $EnvFile) {
  $EnvFile = $defaultEnvFile
}

if (Test-Path $EnvFile) {
  Import-DotEnv $EnvFile
}

$conn = Get-FirstConnectionUri
if ($conn) {
  $env:PGSSLMODE = "require"
  Write-Host "Using $($conn.Key) (sslmode ensured for DigitalOcean)."
  Write-Host "Applying init-leads-db.sql ..."
  & psql (Add-SslModeRequire $conn.Uri) -v ON_ERROR_STOP=1 -f $sqlFile
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed (exit $LASTEXITCODE). Confirm the URI targets database '$DatabaseName' and your IP is a trusted source."
  }
  Write-Host "Done."
  exit 0
}

if (-not (Test-Path $EnvFile)) {
  throw @"
No LEADS_DATABASE_URL or DATABASE_URL set, and env file missing: $EnvFile

Fix one of:
  - Export LEADS_DATABASE_URL with your hungerhankeringsadmin connection string (copy from App Platform / DO), then re-run.
  - Or restore apps/vendure/.env with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD matching the cluster.
"@
}

foreach ($r in @("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD")) {
  if (-not [Environment]::GetEnvironmentVariable($r, "Process")) {
    throw "Missing $r in $EnvFile (or set LEADS_DATABASE_URL / DATABASE_URL in the shell)."
  }
}

$env:PGPASSWORD = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Process")
$env:PGSSLMODE = "require"

if ($CreateDatabase) {
  $exists = & psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d postgres -tAc `
    "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed checking database (exit $LASTEXITCODE). Wrong DB_PASSWORD in $EnvFile vs App Platform? Export DATABASE_URL from the web service and re-run."
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

Write-Host "Applying init-leads-db.sql to database $DatabaseName (from DB_* in $EnvFile) ..."
& psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $DatabaseName -v ON_ERROR_STOP=1 -f $sqlFile
if ($LASTEXITCODE -ne 0) {
  throw "psql failed (exit $LASTEXITCODE). Your web service password may differ from apps/vendure/.env — export DATABASE_URL from App Platform and run again."
}
Write-Host "Done."
