Param(
    [string]$DirectUrl = $env:DIRECT_URL,
    [string]$ShadowUrl = $env:SHADOW_DATABASE_URL
)

if ([string]::IsNullOrWhiteSpace($DirectUrl)) {
    Write-Error "DIRECT_URL environment variable must be set before generating a baseline."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($ShadowUrl)) {
    Write-Error "SHADOW_DATABASE_URL environment variable must be set before generating a baseline."
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$targetDir = "prisma/migrations/${timestamp}_baseline"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

npx prisma migrate diff --from-empty --to-url "$DirectUrl" --script |
    Set-Content -Encoding UTF8 "$targetDir/migration.sql"

Write-Host "Baseline migration created at $targetDir/migration.sql"
