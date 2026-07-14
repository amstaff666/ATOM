# Creates or updates the desktop shortcut for AI Influencer Studio.
$ErrorActionPreference = 'Stop'

$LauncherDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $LauncherDir
$StartScript = Join-Path $LauncherDir 'Start-AI-Influencer-Studio.ps1'
$IconPath = Join-Path $LauncherDir 'app-icon.ico'
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'AI Influencer Studio.lnk'

if (-not (Test-Path $IconPath)) {
    python (Join-Path $LauncherDir 'make-icon.py')
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$StartScript`""
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.IconLocation = "$IconPath,0"
$shortcut.Description = 'Start AI Influencer Studio and open in your browser'
$shortcut.Save()

Write-Host "Desktop shortcut created: $ShortcutPath" -ForegroundColor Green