# Ensure the script is running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as an Administrator!"
    Exit
}

# --- 1. User Prompts ---
$VMName    = Read-Host -Prompt "Enter Virtual Machine Name"
$RAMInput  = Read-Host -Prompt "Enter RAM size in GB (e.g., 1, 2, 4)"
$DiskInput = Read-Host -Prompt "Enter Disk size in GB (e.g., 16, 32, 64)"

# Clean RAM input and ensure it cleanly ends with "GB" (e.g., 4 becomes 4GB)
$CleanRAM  = $RAMInput.ToString().Trim().Replace('GB','').Replace('gb','')
$RAMInMB   = "${CleanRAM}GB"

# Clean Disk input and ensure it cleanly ends with "GB" (e.g., 32 becomes 32GB)
$CleanDisk = $DiskInput.ToString().Trim().Replace('GB','').Replace('gb','')
$DiskSize  = "${CleanDisk}GB"

# Validate and convert to bytes for Hyper-V cmdlets
if (-not ($CleanRAM -match '^\d+$') -or -not ($CleanDisk -match '^\d+$')) {
    Write-Error "RAM and Disk size must be whole numbers (e.g. 4, 32). Exiting."
    Exit
}
$RAM     = [long]::Parse($CleanRAM)  * 1GB
$VHDSize = [long]::Parse($CleanDisk) * 1GB

# Base Paths
$ISOInput  = "https://github.com/jessica12ryan/fpp-os/releases/latest/download/fpp-os-amd64.iso"
$VMLocation = "C:\Hyper-V"
$VHDPath    = "$VMLocation\$VMName\$VMName.vhdx"
$LocalISOFolder = "$VMLocation\ISOs"

# --- 2. Handle HTTP/HTTPS ISO Path ---
$FinalISOPath = $ISOInput
if ($ISOInput -like "http://*" -or $ISOInput -like "https://*") {
    if (-not (Test-Path $LocalISOFolder)) { New-Item -ItemType Directory -Path $LocalISOFolder | Out-Null }
    
    $FileName = [System.IO.Path]::GetFileName([System.Uri]$ISOInput).Split('?')[0]
    if (-not $FileName) { $FileName = "fpp-os-hyperv.iso" }
    
    $FinalISOPath = Join-Path $LocalISOFolder $FileName
    
    # Check if the file already exists; if so, delete it to force an overwrite
    if (Test-Path $FinalISOPath) {
        Write-Host "Existing ISO found. Deleting it to force a fresh download..." -ForegroundColor Yellow
        Remove-Item -Path $FinalISOPath -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Downloading FPP ISO from latest release..." -ForegroundColor Cyan
    Import-Module BitsTransfer
    Start-BitsTransfer -Source $ISOInput -Destination $FinalISOPath
    Write-Host "Download complete: $FinalISOPath" -ForegroundColor Green
}

# --- 3. Identify and Bridge to the Physical Network ---
# Finds an existing External (bridged) switch, or identifies the active physical adapter to create one
$ExternalSwitch = Get-VMSwitch | Where-Object { $_.SwitchType -eq 'External' } | Select-Object -First 1

if ($null -eq $ExternalSwitch) {
    Write-Host "No bridged (External) switch found. Attempting to create one..." -ForegroundColor Yellow
    $ActiveNetAdapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and ($_.PhysicalMediaType -like "*802.3*" -or $_.PhysicalMediaType -like "*Wireless*") } | Select-Object -First 1
    
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

# --- 4.5. Custom VM Configurations ---
Write-Host "Applying custom configurations (Guest Services, Checkpoints, Stop Action, Secure Boot)..." -ForegroundColor Cyan

# Enable Guest Services (Integration Services)
Enable-VMIntegrationService -VMName $VMName -Name "Guest Service Interface"

# Disable Checkpoints, set Automatic Stop Action to ShutDown
Set-VM -Name $VMName -CheckpointType Disabled -AutomaticStopAction ShutDown

# Set Secure Boot Template to Microsoft UEFI Certificate Authority
Set-VMFirmware -VMName $VMName -SecureBootTemplate "MicrosoftUEFICertificateAuthority"


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
