# Ensure the script is running as Administrator
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as an Administrator!"
    Exit
}

# --- 1. User Prompts ---
$VMName    = Read-Host -Prompt "Enter Virtual Machine Name"
$RAMInput  = Read-Host -Prompt "Enter RAM size in GB (e.g., 1, 2, 4)"
$DiskInput = Read-Host -Prompt "Enter Disk size in GB (e.g., 16, 32, 64)"

# Convert GB Input to MB for VMware VMX configuration
$CleanRAMInput = $RAMInput.ToString().Trim().Replace('GB','').Replace('gb','')
$RAMInMB = [int]$CleanRAMInput * 1024

# Base Paths
$ISOInput       = "https://github.com/jessica12ryan/fpp-os/releases/latest/download/fpp-os-amd64.iso"
$VMBaseLocation = "C:\VMware-VMs"
$VMLocation     = "$VMBaseLocation\$VMName"
$VMXPath        = "$VMLocation\$VMName.vmx"
$LocalISOFolder = "$VMBaseLocation\ISOs"

# Locate vmrun.exe (Check both 64-bit and 32-bit Program Files paths)
$VMRunPath = $null
$VMPaths = @(
    "C:\Program Files\VMware\VMware Workstation\vmrun.exe",
    "C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe"
)
foreach ($p in $VMPaths) {
    if (Test-Path $p) { $VMRunPath = $p; break }
}
if (-not $VMRunPath) {
    Write-Error "VMware Workstation (vmrun.exe) could not be found. Please ensure it is installed."
    Exit
}

# --- 2. Handle HTTP/HTTPS ISO Path (with fast BITS download & overwrite) ---
$FinalISOPath = $ISOInput
if ($ISOInput -like "http://*" -or $ISOInput -like "https://*") {
    if (-not (Test-Path $LocalISOFolder)) { New-Item -ItemType Directory -Path $LocalISOFolder | Out-Null }
    
    $FileName = [System.IO.Path]::GetFileName([System.Uri]$ISOInput).Split('?')[0]
    if (-not $FileName) { $FileName = "fpp-os-vmware.iso" }
    
    $FinalISOPath = Join-Path $LocalISOFolder $FileName
    
    if (Test-Path $FinalISOPath) {
        Write-Host "Existing ISO found. Deleting it to force a fresh download..." -ForegroundColor Yellow
        Remove-Item -Path $FinalISOPath -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Downloading FPP ISO from latest release..." -ForegroundColor Cyan
    Import-Module BitsTransfer
    Start-BitsTransfer -Source $ISOInput -Destination $FinalISOPath
    Write-Host "Download complete: $FinalISOPath" -ForegroundColor Green
}

# --- 3. Setup Directories ---
if (-not (Test-Path $VMLocation)) { New-Item -ItemType Directory -Path $VMLocation | Out-Null }

# --- 4. Create and Configure VMware Configuration File (.vmx) ---
Write-Host "Generating VMware Configuration File..." -ForegroundColor Cyan

# Define the VMX configuration settings matching your requirements
$VMXContent = @"
.encoding = "UTF-8"
config.version = "8"
virtualHW.version = "21"
vmx.genid.enable = "TRUE"

# Identity
displayName = "$VMName"
guestOS = "otherlinux-64"

# Hardware Specs (Now using converted MB value)
# 2/2 on CPU sets for 2 cores on a single socket
memsize = "$RAMInMB"
numvcpus = "2"
cpuid.coresPerSocket = "2"

# Firmware & Secure Boot (Microsoft UEFI CA equivalent)
firmware = "efi"
uefi.secureBoot.enabled = "TRUE"

# Network (Bridged to Physical Network with PCIe Support)
ethernet0.present = "TRUE"
ethernet0.connectionType = "bridged"
ethernet0.virtualDev = "e1000e"
ethernet0.addressType = "generated"

# PCIe Slot Topology Definitions for e1000e
pciBridge0.present = "TRUE"
pciBridge4.present = "TRUE"
pciBridge4.virtualDev = "pcieRootPort"
pciBridge4.functions = "8"
ethernet0.pciSlotNumber = "160"

# Storage Controllers
scsi0.present = "TRUE"
scsi0.virtualDev = "lsilogic"

# Virtual Hard Disk Mapping
scsi0:0.present = "TRUE"
scsi0:0.fileName = "$VMName.vmdk"
scsi0:0.deviceType = "scsi-hardDisk"

# CD-ROM Mapping
ide1:0.present = "TRUE"
ide1:0.fileName = "$FinalISOPath"
ide1:0.deviceType = "cdrom-image"
ide1:0.autodetect = "TRUE"

# Floppy Drive Settings (Disabled)
floppy0.present = "FALSE"
floppy0.autodetect = "FALSE"
floppy0.fileType = "device"
filePort.present = "FALSE"

# Guest Services (Enable VMware Tools Time Sync / Features)
tools.syncTime = "TRUE"
tools.upgrade.policy = "upgradeAtPowerCycle"

# Disable Checkpoints (Snapshots)
snapshot.disabled = "TRUE"

# Automatic Stop Action (Graceful Guest Shutdown)
powerType.powerOff = "soft"
powerType.suspend = "soft"
powerType.reset = "soft"
"@

$VMXContent | Out-File -FilePath $VMXPath -Encoding utf8 -Force

# --- 4.5 Create Virtual Hard Disk using VMware Virtual Disk Manager ---
$VDMPath = Join-Path (Split-Path $VMRunPath) "vmware-vdiskmanager.exe"
if (Test-Path $VDMPath) {
    # Ensure any trailing spaces/letters are stripped so it appends properly as e.g. "32GB"
    $CleanDiskSize = "$($DiskInput.ToString().Trim().Replace('GB','').Replace('gb',''))GB"
    
    Write-Host "Creating Virtual Hard Disk ($CleanDiskSize)..." -ForegroundColor Cyan
    $DiskArgs = @("-c", "-s", $CleanDiskSize, "-a", "lsilogic", "-t", "0", "$VMLocation\$VMName.vmdk")
    Start-Process -FilePath $VDMPath -ArgumentList $DiskArgs -Wait -NoNewWindow
} else {
    Write-Warning "vmware-vdiskmanager.exe not found. Virtual disk creation skipped."
}

# --- 5. Launch VM ---
Write-Host "Starting $VMName in VMware Workstation..." -ForegroundColor Green
& $VMRunPath -T ws start $VMXPath gui