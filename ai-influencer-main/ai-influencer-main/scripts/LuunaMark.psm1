# Luuna Mark — mark the page, ship the code.
# PowerShell module for AI Influencer Studio dev engine.

$script:LuunaMarkBaseUrl = $env:LUUNA_MARK_URL
if (-not $script:LuunaMarkBaseUrl) {
  $port = if ($env:LUUNA_MARK_PORT) { $env:LUUNA_MARK_PORT } else { '5173' }
  $script:LuunaMarkBaseUrl = "http://localhost:$port"
}

function Get-LuunaMarkBaseUrl {
  $script:LuunaMarkBaseUrl.TrimEnd('/')
}

function Connect-LuunaMark {
  [CmdletBinding()]
  param(
    [string]$Url,
    [int]$Port = 5173
  )
  if ($Url) {
    $script:LuunaMarkBaseUrl = $Url.TrimEnd('/')
  } else {
    $script:LuunaMarkBaseUrl = "http://localhost:$Port"
  }
  Write-Host "Luuna Mark connected → $(Get-LuunaMarkBaseUrl)" -ForegroundColor Magenta
}

function Invoke-LuunaMark {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string[]]$Args
  )
  $repoRoot = Split-Path $PSScriptRoot -Parent
  $cli = Join-Path $repoRoot 'bin\luuna.mjs'
  if (-not (Test-Path $cli)) {
    throw "Luuna Mark CLI not found: $cli"
  }
  $env:LUUNA_MARK_URL = Get-LuunaMarkBaseUrl
  & node $cli @Args
}

function Get-LuunaMarkHelp {
  Invoke-LuunaMark @('help')
}

function Test-LuunaMarkDoctor {
  Invoke-LuunaMark @('doctor')
}

function Get-LuunaMarkRegistry {
  [CmdletBinding()]
  param(
    [string]$Route = '/'
  )
  Invoke-LuunaMark @('registry', 'list', '--route', $Route)
}

Export-ModuleMember -Function @(
  'Connect-LuunaMark',
  'Get-LuunaMarkBaseUrl',
  'Invoke-LuunaMark',
  'Get-LuunaMarkHelp',
  'Test-LuunaMarkDoctor',
  'Get-LuunaMarkRegistry'
)