# ---------------------------------------------------------------------------
# Removes the "Mark of the Web" that Windows puts on every downloaded file.
#
# You cannot stop the zone identifier from the producer side - Windows writes
# it when a browser saves the file. What you CAN do is clear it, either here or
# at download time (curl / bitsadmin do not set it at all).
#
#   pwsh tools/unblock.ps1                       # this download folder
#   pwsh tools/unblock.ps1 -Path C:\Users\me\Downloads
#   pwsh tools/unblock.ps1 -AllFiles              # every file in the folder
# ---------------------------------------------------------------------------
param(
  [string]$Path = $PSScriptRoot,
  [switch]$AllFiles
)

$ErrorActionPreference = "Stop"
$item = Get-Item -LiteralPath $Path

$files = if ($item.PSIsContainer) {
  Get-ChildItem -LiteralPath $Path -File -Recurse:$AllFiles -ErrorAction SilentlyContinue
} else {
  @($item)
}

$pattern = $AllFiles ? @("*") : @("*.exe", "*.msi", "*.zip")
$cleared = 0
foreach ($f in $files) {
  if ($pattern -notcontains "*" -and ($pattern | Where-Object { $f.Name -like $_ }).Count -eq 0) { continue }
  try {
    Unblock-File -LiteralPath $f.FullName -ErrorAction Stop
    $cleared++
  } catch {
    # Not blocked (no zone identifier) is the normal case - not an error.
  }
}

Write-Host "cleared the download mark on $cleared file(s) under $($item.FullName)"
Write-Host "SmartScreen can still warn about an unsigned file: see tools/sign-release.ps1."
