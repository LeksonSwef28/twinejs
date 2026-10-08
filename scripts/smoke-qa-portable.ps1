$ErrorActionPreference = 'Stop'
$qaRoot = Join-Path $env:APPDATA '93 Days QA'
$twineRoot = Join-Path $env:APPDATA 'Twine'
$twineMarker = Join-Path $twineRoot '93-days-qa-smoke-preserve.txt'
$documents = [Environment]::GetFolderPath('MyDocuments')
$twineDocuments = Join-Path $documents 'Twine'
$twineDocumentsMarker = Join-Path $twineDocuments '93-days-qa-smoke-preserve.txt'
$qaDocuments = Join-Path $documents '93 Days QA'
$exe = Get-ChildItem 'dist/electron-qa' -Filter '93-Days-QA-*-Windows.exe' -File | Select-Object -First 1
if (-not $exe) { throw 'Expected 93 Days QA portable executable was not produced.' }
New-Item -ItemType Directory -Force -Path $twineRoot, $twineDocuments | Out-Null
Set-Content -Path $twineMarker -Value 'do-not-touch-qa' -NoNewline
Set-Content -Path $twineDocumentsMarker -Value 'do-not-touch-qa' -NoNewline
if (Test-Path $qaRoot) { Remove-Item -Recurse -Force $qaRoot }
if (Test-Path $qaDocuments) { Remove-Item -Recurse -Force $qaDocuments }
Write-Output "Launching packaged QA executable: $($exe.Name)"
$started = Start-Process -FilePath $exe.FullName -PassThru
$deadline = (Get-Date).AddSeconds(150)
$profileReady = $false
$windowReady = $false
try {
  while ((Get-Date) -lt $deadline) {
    $profileReady = (Test-Path $qaRoot) -and (Test-Path $qaDocuments)
    $possibleWindows = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
      $_.MainWindowHandle -ne 0 -and ($_.ProcessName -match '93.?Days' -or $_.ProcessName -match '93-Days-QA')
    })
    if ($possibleWindows.Count -gt 0) { $windowReady = $true }
    if ($profileReady -and $windowReady) { break }
    Start-Sleep -Seconds 3
  }
  if (-not $profileReady) { throw 'Packaged application did not initialize the isolated QA userData and Documents roots.' }
  if (-not $windowReady) { throw 'Packaged application did not expose a visible top-level 93 Days window on the Windows runner.' }
  if ((Get-Content -Raw $twineMarker) -ne 'do-not-touch-qa') { throw 'Existing Twine userData marker changed.' }
  if ((Get-Content -Raw $twineDocumentsMarker) -ne 'do-not-touch-qa') { throw 'Existing Twine Documents marker changed.' }
  Write-Output 'Packaged QA smoke PASS: QA profile and window detected; Twine markers unchanged.'
} finally {
  $started.Refresh()
  if (-not $started.HasExited) {
    & taskkill.exe /T /F /PID $started.Id 2>&1 | Out-Host
  }
}
