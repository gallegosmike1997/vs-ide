<#
.SYNOPSIS
  Signs the built VS-IDE artifacts (app exe + installers) so Windows stops
  flagging them as "from another computer" / an unknown publisher.

.DESCRIPTION
  Windows SmartScreen decides by two things: a valid code signature and a
  reputation for that exact file. A signature from a certificate the machine
  does not trust is worth little, so:

    * Self-signed certificate (the bundled dev cert, default) - cryptographically
      valid and tamper-evident, and machines that TRUST the cert (your own, or
      anyone you install the .cer on) show a clean publisher. Everyone else
      still sees the warning.
    * A real CA certificate (OV is enough; Microsoft retired the old
      "EV gets instant reputation" benefit in 2021) - this is the only thing
      that fixes SmartScreen for the general public.

  Timestamping matters more than people expect: without a TSA timestamp the
  signature breaks the day the certificate expires.

.EXAMPLE
  pwsh tools/sign-release.ps1
  pwsh tools/sign-release.ps1 -Pfx C:\certs\mzsg.pfx -Password (Read-Host -AsSecureString)
#>
[CmdletBinding()]
param(
  # Certificate to sign with. Defaults to the rotated dev cert in src-tauri.
  [string]$Pfx = "$PSScriptRoot\..\src-tauri\vs-ide-signing.pfx",
  [SecureString]$Password,
  [string]$TimestampUrl = "http://timestamp.digicert.com",
  [switch]$SkipTimestamp
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$bundle = Join-Path $repo "src-tauri\target\release\bundle"
$appExe = Join-Path $repo "src-tauri\target\release\vs_ide.exe"

# The password is NOT hardcoded. It used to default to a literal that was also
# committed, which meant anyone with the repo could sign as this publisher. Now
# it is read from a gitignored file, or you are prompted for it.
$pwFile = Join-Path $repo "src-tauri\signing-password.txt"
if (-not $Password) {
  if (Test-Path $pwFile) {
    $Password = ConvertTo-SecureString (Get-Content $pwFile -Raw).Trim() -Force -AsPlainText
  }
  else {
    $Password = Read-Host "PFX password for $(Split-Path -Leaf $Pfx)" -AsSecureString
  }
}
if (-not (Test-Path $Pfx)) { throw "Certificate not found: $Pfx" }

# signtool from the Windows SDK; fall back to the PowerShell signer.
$signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Filter signtool.exe -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match '\\x64\\' } | Select-Object -First 1 -ExpandProperty FullName

$plain = [System.Net.NetworkCredential]::new("", $Password).Password
$targets = @()
$targets += $appExe
$targets += (Get-ChildItem $bundle -Recurse -Include *.exe, *.msi -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)

if (-not $targets.Count) { throw "Nothing to sign - build first (npm run build:exe)." }

foreach ($file in $targets) {
  if (-not (Test-Path $file)) { continue }
  Write-Host "signing $(Split-Path -Leaf $file)" -ForegroundColor Cyan
  if ($signtool) {
    $args = @("sign", "/fd", "SHA256", "/f", $Pfx, "/p", $plain)
    if (-not $SkipTimestamp) { $args += @("/tr", $TimestampUrl, "/td", "SHA256") }
    $args += $file
    & $signtool @args | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warning "signtool failed for $file" }
  }
  else {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($Pfx, $plain)
    $sig = Set-AuthenticodeSignature -FilePath $file -Certificate $cert -HashAlgorithm SHA256
    "  -> $($sig.Status)"
  }
}

Write-Host ""
Write-Host "verification:" -ForegroundColor Green
foreach ($file in $targets) {
  if (-not (Test-Path $file)) { continue }
  $s = Get-AuthenticodeSignature $file
  $sizer = "{0,7:N1} MB  {1,-12} {2}" -f ((Get-Item $file).Length / 1MB), $s.Status, (Split-Path -Leaf $file)
  Write-Host $sizer
}
