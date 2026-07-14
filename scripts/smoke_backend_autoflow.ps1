param(
  [string]$BaseUrl = "http://127.0.0.1:4490"
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{ Method = "GET"; Url = "$BaseUrl/health" },
  @{ Method = "GET"; Url = "$BaseUrl/healthz" },
  @{ Method = "GET"; Url = "$BaseUrl/api/documents" },
  @{ Method = "GET"; Url = "$BaseUrl/api/agents/" },
  @{ Method = "GET"; Url = "$BaseUrl/api/workflows/executions" },
  @{ Method = "GET"; Url = "$BaseUrl/api/autoflow/health" },
  @{ Method = "GET"; Url = "$BaseUrl/api/autoflow/providers" },
  @{
    Method = "POST"
    Url = "$BaseUrl/api/autoflow/tasks"
    Body = @{
      goal = "Loo PDF editor, mis teeb laenutaotluse põhja ja loeb pangaväljavõtteid"
      mode = "plan_only"
      domain = "pdf"
      approval_required = $true
    }
  }
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

foreach ($check in $checks) {
  $method = $check.Method
  $url = $check.Url

  try {
    $params = @{
      Uri = $url
      Method = $method
      TimeoutSec = 20
      UseBasicParsing = $true
    }

    if ($method -eq "POST") {
      $params.ContentType = "application/json"
      $params.Body = ($check.Body | ConvertTo-Json -Depth 8)
    }

    $response = Invoke-WebRequest @params
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

    Write-Host "[$result] $method $url"
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
      Write-Host "[FAIL] $method $url"
      Write-Host "  status: $statusCode"
      Write-Host "  content-type: $contentType"
      Write-Host "  preview: $(Get-Preview $body)"
    } else {
      $failed++
      Write-Host "[FAIL] $method $url"
      Write-Host "  error: $($_.Exception.Message)"
    }
  }
}

Write-Host ""
Write-Host "Summary: PASS=$passed FAIL=$failed"

if ($failed -gt 0) {
  exit 1
}
