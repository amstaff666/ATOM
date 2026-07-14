param(
  [string]$BaseUrl = "http://localhost:4491"
)

$ErrorActionPreference = "Stop"

$routes = @(
  "/",
  "/agents",
  "/documents",
  "/automations",
  "/center/pdf-orchestrator",
  "/center/nexuspdf-alchemy"
)

$passed = 0
$failed = 0

function Get-Preview {
  param([AllowNull()][object]$Content)

  $text = [string]$Content
  $text = $text -replace "\s+", " "
  if ($text.Length -gt 300) {
    return $text.Substring(0, 300)
  }
  return $text
}

foreach ($route in $routes) {
  $url = "$BaseUrl$route"

  try {
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 20 -UseBasicParsing
    $statusCode = [int]$response.StatusCode
    $contentType = [string]$response.Headers["Content-Type"]
    $preview = Get-Preview $response.Content
    $ok = $statusCode -ge 200 -and $statusCode -lt 300

    if ($ok) {
      $passed++
      $result = "PASS"
    } else {
      $failed++
      $result = "FAIL"
    }

    Write-Host "[$result] GET $url"
    Write-Host "  status: $statusCode"
    Write-Host "  content-type: $contentType"
    Write-Host "  preview: $preview"
  } catch {
    $webResponse = $_.Exception.Response
    if ($webResponse -and $webResponse.StatusCode) {
      $statusCode = [int]$webResponse.StatusCode
      $contentType = [string]$webResponse.Headers["Content-Type"]
      $body = ""

      try {
        $stream = $webResponse.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        $reader.Close()
      } catch {
        $body = ""
      }

      $failed++
      Write-Host "[FAIL] GET $url"
      Write-Host "  status: $statusCode"
      Write-Host "  content-type: $contentType"
      Write-Host "  preview: $(Get-Preview $body)"
    } else {
      $failed++
      Write-Host "[FAIL] GET $url"
      Write-Host "  error: $($_.Exception.Message)"
    }
  }
}

Write-Host ""
Write-Host "Summary: PASS=$passed FAIL=$failed"

if ($failed -gt 0) {
  exit 1
}
