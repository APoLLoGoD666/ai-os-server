# obsidian-tunnel-permanent.ps1 - Start the permanent named Cloudflare tunnel
# Run after obsidian-tunnel-setup.ps1 has been completed once.
# Add to Task Scheduler to auto-start at login (with Obsidian already running).

$CLOUDFLARED  = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$TUNNEL_NAME  = "apex-obsidian"
$CONFIG_FILE  = "$env:USERPROFILE\.cloudflared\apex-obsidian.yml"
$OBSIDIAN_PORT = 27123
$HOSTNAME     = "obsidian.apex-ai-os-cos.uk"
$LOG_FILE     = "$PSScriptRoot\obsidian-tunnel-permanent.log"

function Write-Log($msg) {
    $ts = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    "$ts  $msg" | Tee-Object -Append -FilePath $LOG_FILE
}

Write-Log "=== Permanent tunnel start: $HOSTNAME ==="

if (-not (Test-Path $CONFIG_FILE)) {
    Write-Log "ERROR: Config not found at $CONFIG_FILE"
    Write-Log "Run obsidian-tunnel-setup.ps1 first."
    exit 1
}

# Wait for Obsidian REST API to be up (max 60s)
$ready = $false
for ($i = 0; $i -lt 12; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:$OBSIDIAN_PORT" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null
        $ready = $true
        break
    } catch { }
    Write-Log "Waiting for Obsidian on port $OBSIDIAN_PORT... ($i)"
    Start-Sleep -Seconds 5
}

if (-not $ready) {
    Write-Log "WARN: Obsidian REST API not responding. Starting tunnel anyway."
}

Write-Log "Starting named tunnel '$TUNNEL_NAME' → https://$HOSTNAME"

# Kill any lingering cloudflared processes
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Run named tunnel (permanent - URL never changes)
& $CLOUDFLARED tunnel --config $CONFIG_FILE run $TUNNEL_NAME

# If cloudflared exits, restart after 10s
Write-Log "cloudflared exited - restarting in 10s..."
Start-Sleep -Seconds 10
Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NonInteractive -File `"$PSScriptRoot\obsidian-tunnel-permanent.ps1`"" `
    -NoNewWindow
