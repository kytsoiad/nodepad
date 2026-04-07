#!/usr/bin/env pwsh
# Sync with upstream repository

$ErrorActionPreference = "Stop"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host " Sync with upstream (mskayyali/nodepad)" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

try {
    Write-Host "[1/4] Fetching upstream updates..." -ForegroundColor Yellow
    git fetch upstream
    Write-Host "✓ Done" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[2/4] Checking out main branch..." -ForegroundColor Yellow
    git checkout main | Out-Null
    Write-Host "✓ Done" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[3/4] Merging upstream/main..." -ForegroundColor Yellow
    git merge upstream/main
    Write-Host "✓ Done" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "[4/4] Pushing to origin..." -ForegroundColor Yellow
    git push origin main
    Write-Host "✓ Done" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host " Sync completed successfully!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Cyan
}
catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Sync failed!" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit"
