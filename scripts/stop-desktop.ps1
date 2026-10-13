$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$recordPath = Join-Path $projectRoot '.launcher-process.json'
if (!(Test-Path -LiteralPath $recordPath)) { Write-Host 'No launcher-managed service is running.'; exit 0 }
$record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$expectedScript = Join-Path $projectRoot 'launcher.mjs'
$appProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $([int]$record.pid)"
if (!$appProcess) { Write-Host 'The service has already stopped.'; exit 0 }
if ($record.script -ne $expectedScript -or $appProcess.ExecutablePath -ne $record.executable -or !$appProcess.CommandLine.Contains('"' + $expectedScript + '"')) { throw 'Process identity does not match. No process was stopped.' }
# Stop only this launcher's verified process tree, including its PDF workers.
Set-Content -LiteralPath (Join-Path $projectRoot '.launcher-stopping') -Value ([string]$record.pid)
& taskkill.exe /PID ([string]$record.pid) /T /F
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the service.' }
