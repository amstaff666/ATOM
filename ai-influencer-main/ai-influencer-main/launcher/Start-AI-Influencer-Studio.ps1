# Launch AI Influencer Studio — starts the Vite dev server and opens the browser.
$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'AI Influencer Studio'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Port = 5173
$Url = "http://localhost:$Port"

function Test-ServerReady {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Set-Location $ProjectRoot

Write-Host ''
Write-Host '  AI Influencer Studio' -ForegroundColor Magenta
Write-Host '  --------------------' -ForegroundColor DarkGray
Write-Host ''

if (-not (Test-Path (Join-Path $ProjectRoot 'node_modules'))) {
    Write-Host 'Installing dependencies (first run)...' -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ''
}

if (Test-ServerReady) {
    Write-Host "Dev server already running at $Url" -ForegroundColor Green
    Start-Process $Url
    Write-Host ''
    Write-Host 'Browser opened. Close this window when finished.' -ForegroundColor DarkGray
    Read-Host 'Press Enter to exit'
    exit 0
}

Write-Host "Starting dev server at $Url ..." -ForegroundColor Cyan
Write-Host 'Keep this window open while you use the app.' -ForegroundColor DarkGray
Write-Host ''

$browserJob = Start-Job -ScriptBlock {
    param($targetUrl)
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri $targetUrl -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) {
                Start-Process $targetUrl
                return
            }
        } catch {}
    }
} -ArgumentList $Url

npm run dev
Remove-Job $browserJob -Force -ErrorAction SilentlyContinue