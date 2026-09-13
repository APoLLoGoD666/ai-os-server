# obsidian-tunnel.ps1 - Start Obsidian tunnel (run this whenever Obsidian is open)
$CLOUDFLARED = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$CONFIG = "$env:USERPROFILE\.cloudflared\apex-obsidian.yml"

Write-Host "Starting Obsidian tunnel -> https://obsidian.apex-ai-os-cos.uk"

Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

& $CLOUDFLARED tunnel --config $CONFIG run apex-obsidian
