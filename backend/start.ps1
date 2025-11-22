# Backend Start Script
# Navigate to backend directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Checking files..." -ForegroundColor Yellow

if (Test-Path "cmd/server/main.go") {
    Write-Host "✓ main.go found" -ForegroundColor Green
} else {
    Write-Host "✗ main.go NOT found!" -ForegroundColor Red
    exit 1
}

if (Test-Path "config.env") {
    Write-Host "✓ config.env found" -ForegroundColor Green
} else {
    Write-Host "⚠ config.env NOT found - using system environment variables" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Go server..." -ForegroundColor Cyan
go run cmd/server/main.go

