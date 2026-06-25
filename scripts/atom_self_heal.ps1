# Atom Self-Heal launcher (Windows)
# Usage: .\scripts\atom_self_heal.ps1 [-CheckOnly] [-Json]

param(
    [switch]$CheckOnly,
    [switch]$Json,
    [int]$MaxRounds = 5
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$args_list = @("scripts/atom_self_heal.py")
if ($CheckOnly) { $args_list += "--check-only" }
if ($Json) { $args_list += "--json" }
$args_list += @("--max-rounds", $MaxRounds)

python @args_list
exit $LASTEXITCODE