# obsidian-tunnel-setup.ps1 — ONE-TIME setup for permanent named Cloudflare tunnel
# Run this once. After it completes, use obsidian-tunnel-permanent.ps1 to start the tunnel.

$CLOUDFLARED  = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$TUNNEL_NAME  = "apex-obsidian"
$HOSTNAME     = "obsidian.apex-ai-os-cos.uk"
$OBSIDIAN_PORT = 27123
$CONFIG_DIR   = "$env:USERPROFILE\.cloudflared"
$CONFIG_FILE  = "$CONFIG_DIR\apex-obsidian.yml"
$RENDER_API_KEY = "rnd_poEy8YVAjARsZbL8caje8wfezvpH"
$RENDER_SVC_ID  = "srv-d7idj1gsfn5c738hpsc0"

function Write-Log($msg) {
    $ts = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Write-Host "$ts  $msg"
}

Write-Log "=== Apex Obsidian — Permanent Tunnel Setup ==="

# Step 1: Login (opens browser — select apex-ai-os-cos.uk)
Write-Log "STEP 1: Logging into Cloudflare. A browser window will open — log in and select apex-ai-os-cos.uk"
& $CLOUDFLARED tunnel login
if ($LASTEXITCODE -ne 0) { Write-Log "ERROR: Login failed. Exiting."; exit 1 }
Write-Log "Login OK"

# Step 2: Create named tunnel
Write-Log "STEP 2: Creating named tunnel '$TUNNEL_NAME'..."
$createOutput = & $CLOUDFLARED tunnel create $TUNNEL_NAME 2>&1
Write-Log $createOutput

# Extract tunnel ID from output
$tunnelId = $null
if ($createOutput -match 'Created tunnel .+ with id ([a-f0-9\-]{36})') {
    $tunnelId = $Matches[1]
} elseif ($createOutput -match '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})') {
    $tunnelId = $Matches[1]
}

if (-not $tunnelId) {
    # Tunnel may already exist — list to find ID
    $listOutput = & $CLOUDFLARED tunnel list 2>&1 | Select-String $TUNNEL_NAME
    if ($listOutput -match '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})') {
        $tunnelId = $Matches[1]
        Write-Log "Tunnel '$TUNNEL_NAME' already exists with ID $tunnelId"
    }
}

if (-not $tunnelId) { Write-Log "ERROR: Could not determine tunnel ID."; exit 1 }
Write-Log "Tunnel ID: $tunnelId"

# Step 3: Create config file
Write-Log "STEP 3: Writing tunnel config to $CONFIG_FILE..."
$config = @"
tunnel: $tunnelId
credentials-file: $CONFIG_DIR\$tunnelId.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$OBSIDIAN_PORT
  - service: http_status:404
"@
Set-Content -Path $CONFIG_FILE -Value $config -Encoding UTF8
Write-Log "Config written"

# Step 4: Create DNS route
Write-Log "STEP 4: Creating DNS route $HOSTNAME → tunnel..."
& $CLOUDFLARED tunnel route dns $TUNNEL_NAME $HOSTNAME 2>&1 | ForEach-Object { Write-Log $_ }
Write-Log "DNS route created (may take 1-2 min to propagate)"

# Step 5: Set OBSIDIAN_URL on Render to the permanent URL
Write-Log "STEP 5: Setting OBSIDIAN_URL=https://$HOSTNAME on Render..."
try {
    $headers = @{ Authorization = "Bearer $RENDER_API_KEY"; "Content-Type" = "application/json" }
    $resp = Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/env-vars?limit=100" `
        -Headers $headers -UseBasicParsing -ErrorAction Stop
    $vars = ($resp.Content | ConvertFrom-Json) | ForEach-Object { $_.envVar }
    $updated = $vars | ForEach-Object {
        if ($_.key -eq "OBSIDIAN_URL") { @{ key = "OBSIDIAN_URL"; value = "https://$HOSTNAME" } }
        else { @{ key = $_.key; value = $_.value } }
    }
    $body = $updated | ConvertTo-Json -Depth 3
    Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/env-vars" `
        -Method PUT -Headers $headers -Body $body -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Log "Render OBSIDIAN_URL set to https://$HOSTNAME"

    # Trigger deploy
    Invoke-WebRequest -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/deploys" `
        -Method POST -Headers $headers -Body '{"clearCache":"do_not_clear"}' -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Log "Render deploy triggered"
} catch {
    Write-Log "WARNING: Could not update Render: $_"
}

Write-Log ""
Write-Log "=== SETUP COMPLETE ==="
Write-Log "Permanent URL: https://$HOSTNAME"
Write-Log "Tunnel ID:     $tunnelId"
Write-Log ""
Write-Log "To START the tunnel: run obsidian-tunnel-permanent.ps1"
Write-Log "Add it to Task Scheduler to auto-start at login."
