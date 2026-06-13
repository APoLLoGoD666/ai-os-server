# obsidian-tunnel.ps1 — Auto-start Obsidian tunnel and update Render OBSIDIAN_URL
# Run at login via Task Scheduler. Keeps Obsidian permanently connected.

$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$OBSIDIAN_PORT = 27123
$LOG_FILE = "$PSScriptRoot\obsidian-tunnel.log"
$RENDER_API_KEY = "rnd_poEy8YVAjARsZbL8caje8wfezvpH"
$RENDER_SVC_ID = "srv-d7idj1gsfn5c738hpsc0"

function Write-Log($msg) {
    $ts = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "$ts  $msg" | Tee-Object -Append -FilePath $LOG_FILE
}

Write-Log "=== Obsidian tunnel start ==="

# Wait for Obsidian REST API to be up (max 60s)
$ready = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$OBSIDIAN_PORT" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        $ready = $true
        break
    } catch { }
    Write-Log "Waiting for Obsidian on port $OBSIDIAN_PORT... ($i)"
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Log "WARN: Obsidian REST API not responding on port $OBSIDIAN_PORT. Tunnel will start anyway."
}

# Kill any existing cloudflared quick-tunnel processes
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" -and ($_.CommandLine -like "*tunnel*" -or $_.CommandLine -like "*trycloudflare*")
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Start cloudflared quick tunnel, capture output to temp file
$tmpLog = "$env:TEMP\cloudflared-obsidian-$((Get-Date).Ticks).log"
$proc = Start-Process -FilePath $CLOUDFLARED `
    -ArgumentList "tunnel", "--url", "http://localhost:$OBSIDIAN_PORT" `
    -RedirectStandardError $tmpLog `
    -NoNewWindow -PassThru

Write-Log "cloudflared PID=$($proc.Id), output: $tmpLog"

# Wait for tunnel URL to appear in output (max 30s)
$tunnelUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $tmpLog) {
        $content = Get-Content $tmpLog -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-z0-9\-]+\.trycloudflare\.com') {
            $tunnelUrl = $Matches[0]
            break
        }
    }
}

if (-not $tunnelUrl) {
    Write-Log "ERROR: Failed to get tunnel URL after 30s"
    exit 1
}

Write-Log "Tunnel URL: $tunnelUrl"

# Update Render OBSIDIAN_URL env var
try {
    # Fetch all current env vars
    $headers = @{ Authorization = "Bearer $RENDER_API_KEY"; "Content-Type" = "application/json" }
    $resp = Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/env-vars?limit=100" `
        -Headers $headers -UseBasicParsing -ErrorAction Stop
    $vars = ($resp.Content | ConvertFrom-Json) | ForEach-Object { $_.envVar }

    # Update OBSIDIAN_URL
    $payload = $vars | ForEach-Object {
        if ($_.key -eq "OBSIDIAN_URL") {
            @{ key = "OBSIDIAN_URL"; value = $tunnelUrl }
        } else {
            @{ key = $_.key; value = $_.value }
        }
    }

    $body = $payload | ConvertTo-Json -Depth 3
    $putResp = Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/env-vars" `
        -Method PUT -Headers $headers -Body $body -UseBasicParsing -ErrorAction Stop
    Write-Log "Render env updated: $($putResp.StatusCode)"

    # Trigger redeploy
    $deployBody = '{"clearCache":"do_not_clear"}'
    $depResp = Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/deploys" `
        -Method POST -Headers $headers -Body $deployBody -UseBasicParsing -ErrorAction Stop
    $depId = ($depResp.Content | ConvertFrom-Json).id
    Write-Log "Render deploy triggered: $depId"

} catch {
    Write-Log "ERROR updating Render: $_"
}

# Update local .env OBSIDIAN_URL
$envFile = "$PSScriptRoot\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    $envContent = $envContent -replace 'OBSIDIAN_URL=.*', "OBSIDIAN_URL=$tunnelUrl"
    Set-Content $envFile $envContent -Encoding UTF8 -NoNewline
    Write-Log "Local .env updated"
}

Write-Log "Setup complete. Keeping tunnel alive..."

# Keep script alive while cloudflared runs
$proc.WaitForExit()
Write-Log "cloudflared exited, restarting in 10s..."
Start-Sleep -Seconds 10
# Re-launch self to restart everything
Start-Process -FilePath "powershell.exe" -ArgumentList "-NonInteractive -File `"$PSScriptRoot\obsidian-tunnel.ps1`"" -NoNewWindow
