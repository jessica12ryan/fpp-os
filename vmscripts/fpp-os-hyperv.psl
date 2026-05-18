# Ensure the script is running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as an Administrator!"
    Exit
}

# --- 1. User Prompts ---
$VMName    = Read-Host -Prompt "Enter Virtual Machine Name"
$RAMInput  = Read-Host -Prompt "Enter RAM size (e.g., 4GB, 8GB)"
$DiskInput = Read-Host -Prompt "Enter Disk size (e.g., 40GB, 100GB)"
$ISOInput  = Read-Host -Prompt "Enter ISO Path (Local path or HTTP URL)"

# Convert string inputs to proper bytes for Hyper-V cmdlets
$RAM      = [long](Invoke-Expression $RAMInput)
$VHDSize  = [long](Invoke-Expression $DiskInput)

# Base Paths
$VMLocation = "C:\Hyper-V"
$VHDPath    = "$VMLocation\$VMName\$VMName.vhdx"
$LocalISOFolder = "$VMLocation\ISOs"

# --- 2. Handle HTTP/HTTPS ISO Path ---
$FinalISOPath = $ISOInput
if ($ISOInput -like "http://*" -or $ISOInput -like "https://*") {
    if (-not (Test-Path $LocalISOFolder)) { New-Item -ItemType Directory -Path $LocalISOFolder | Out-Null }
    
    $FileName = [System.IO.Path]::GetFileName([System.Uri]$ISOInput).Split('?')[0]
    if (-not $FileName) { $FileName = "downloaded_media.iso" }
    
    $FinalISOPath = Join-Path $LocalISOFolder $FileName
    
    Write-Host "Downloading ISO from web link to local storage..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $ISOInput -OutFile $FinalISOPath -UserAgent "Mozilla/5.0"
    Write-Host "Download complete: $FinalISOPath" -ForegroundColor Green
}

# --- 3. Identify and Bridge to the Physical Network ---
# Finds an existing External (bridged) switch, or identifies the active physical adapter to create one
$ExternalSwitch = Get-VMSwitch | Where-Object { $_.SwitchType -eq 'External' } | Select-Object -First 1

if ($null -eq $ExternalSwitch) {
    Write-Host "No bridged (External) switch found. Attempting to create one..." -ForegroundColor Yellow
    $ActiveNetAdapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.PhysicalMediaType -like "*802.3*" -or $_.PhysicalMediaType -like "*Wireless*" } | Select-Object -First 1
    
    if ($null -eq $ActiveNetAdapter) {
        Write-Error "No active physical network adapter found to bridge."
        Exit
    }
    
    $SwitchName = "Bridged-External-Switch"
    Write-Host "Creating External Switch attached to: $($ActiveNetAdapter.Name)" -ForegroundColor Cyan
    $ExternalSwitch = New-VMSwitch -Name $SwitchName -NetAdapterName $ActiveNetAdapter.Name -AllowManagementOS $true
} else {
    $SwitchName = $ExternalSwitch.Name
    Write-Host "Using existing bridged switch: $SwitchName" -ForegroundColor Green
}

# --- 4. Create and Configure Virtual Machine ---
Write-Host "Creating Virtual Machine..." -ForegroundColor Cyan
New-VM -Name $VMName `
       -MemoryStartupBytes $RAM `
       -Generation 2 `
       -Path $VMLocation `
       -NewVHDPath $VHDPath `
       -NewVHDSizeBytes $VHDSize `
       -SwitchName $SwitchName | Out-Null

# Adjust CPU count (Default to 2)
Set-VM -Name $VMName -ProcessorCount 2

# --- 5. Attach ISO and Set Boot Priority ---
if (Test-Path $FinalISOPath) {
    Write-Host "Attaching ISO to VM..." -ForegroundColor Cyan
    Add-VMDvdDrive -VMName $VMName -Path $FinalISOPath | Out-Null
    $DVD = Get-VMDvdDrive -VMName $VMName
    Set-VMFirmware -VMName $VMName -FirstBootDevice $DVD
} else {
    Write-Warning "ISO file could not be found or verified at $FinalISOPath."
}

# --- 6. Launch VM ---
Write-Host "Starting $VMName..." -ForegroundColor Green
Start-VM -Name $VMName
vmconnect localhost $VMName