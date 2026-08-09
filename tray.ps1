Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "server.js"

# Detect local network IPv4 address
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi","Ethernet" -ErrorAction SilentlyContinue | 
            Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } | 
            Select-Object -ExpandProperty IPAddress -First 1)

if (-not $localIp) {
    $localIp = ([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
                Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -ne '127.0.0.1' } | 
                Select-Object -ExpandProperty IPAddressToString -First 1)
}

if (-not $localIp) { $localIp = "localhost" }
$networkUrl = "http://${localIp}:3000"

# Start Node process hidden
$nodeProcess = Start-Process -FilePath "node" -ArgumentList "`"$nodeScript`"" -WindowStyle Hidden -PassThru

# Setup Tray Icon
$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "Print Station ($networkUrl)"
$notifyIcon.Visible = $true

# Create Context Menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Non-clickable header displaying the network address
$headerLabel = $contextMenu.Items.Add("URL: $networkUrl")
$headerLabel.Enabled = $false
$headerLabel.Font = New-Object System.Drawing.Font($headerLabel.Font, [System.Drawing.FontStyle]::Bold)

$contextMenu.Items.Add("-") | Out-Null

$itemOpen = $contextMenu.Items.Add("Open Local Station")
$itemOpen.add_Click({
    [System.Diagnostics.Process]::Start("http://localhost:3000")
})

$itemRestart = $contextMenu.Items.Add("Restart Server")
$itemRestart.add_Click({
    try {
        Invoke-RestMethod -Uri "http://localhost:3000/restart" -Method Post -ErrorAction SilentlyContinue
        $notifyIcon.ShowBalloonTip(1500, "Print Station", "Server restarted.", [System.Windows.Forms.ToolTipIcon]::Info)
    } catch {}
})

$contextMenu.Items.Add("-") | Out-Null

$itemExit = $contextMenu.Items.Add("Stop & Exit")
$itemExit.add_Click({
    if ($nodeProcess -and -not $nodeProcess.HasExited) {
        Stop-Process -Id $nodeProcess.Id -Force -ErrorAction SilentlyContinue
    }
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.ContextMenuStrip = $contextMenu

# Double-click tray icon to open local browser
$notifyIcon.add_DoubleClick({
    [System.Diagnostics.Process]::Start("http://localhost:3000")
})

# Show startup notification with the exact network URL
$notifyIcon.ShowBalloonTip(2500, "Print Station Live", "Network URL: $networkUrl", [System.Windows.Forms.ToolTipIcon]::Info)

# Keep message loop active
[System.Windows.Forms.Application]::Run()