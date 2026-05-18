#!/bin/bash
VMWARE_PATH="/Applications/VMware Fusion.app/Contents/Library"
VMRUN="/Applications/VMware Fusion.app/Contents/Library/vmrun"

# Prompt user for VM inputs
read -p "Enter VM Name (no spaces): " VM_NAME

# Prompt for RAM in GB and convert it to MB (RAM * 1024)
read -p "Enter RAM size in GB (e.g., 1, 2, 4): " RAM_GB
VM_RAM=$((RAM_GB * 1024))

# Prompt for Disk size (appends 'GB' automatically if the user omits it)
read -p "Enter Disk size in GB (e.g., 16, 32, 64): " HDD_INPUT
if [[ ! $HDD_INPUT =~ [Gg][Bb]$ ]]; then
    VM_HDD="${HDD_INPUT}GB"
else
    VM_HDD=$HDD_INPUT
fi

# --- 2. Verification Outputs (Optional) ---
echo "Configured RAM: ${VM_RAM}MB"
echo "Configured HDD: ${VM_HDD}"

ISO_URL="https://github.com/jessica12ryan/fpp-os/releases/latest/download/"
ISO_FILE="fpp-os-amd64.iso"
VM_DIR="$HOME/Virtual Machines/$VM_NAME.vmwarevm"
VMX_PATH="$VM_DIR/$VM_NAME.vmx"
mkdir -p "$VM_DIR"
cd "$VM_DIR"
echo "Creating VM in: $VM_DIR"

# Download the main ISO
echo "Downloading ISO..."
curl -L --progress-bar -o "$VM_DIR/$ISO_FILE" "${ISO_URL}${ISO_FILE}"
echo "ISO saved to: $VM_DIR/$ISO_FILE"

# Create the virtual disk
"$VMWARE_PATH/vmware-vdiskmanager" -c -s "$VM_HDD" -t 0 "$VM_NAME.vmdk"

# Generate .vmx with BOTH ISOs attached
cat <<EOF > "$VM_NAME.vmx"
config.version = "8"
virtualHW.version = "19"
virtualHW.productCompatibility = "hosted"
vmci0.present = "TRUE"
displayName = "$VM_NAME"
memsize = "$VM_RAM"
numvcpus = "2"
guestOS = "ubuntu-64"
firmware = "efi"
sata0.present = "TRUE"
sata0:0.present = "TRUE"
sata0:0.fileName = "$VM_NAME.vmdk"
sata0:1.present = "TRUE"
sata0:1.fileName = "$VM_DIR/$ISO_FILE"
sata0:1.deviceType = "cdrom-image"
sata0:1.startConnected = "TRUE"
usb.present = "TRUE"
ethernet0.present = "TRUE"
ethernet0.connectionType = "bridged"
ethernet0.addressType = "generated"
ethernet0.virtualDev = "e1000"
floppy0.present = "FALSE"
msg.autoAnswer = "TRUE"
EOF

echo "VMX created with FPP ISO."

# Start the VM
echo "Starting VM..."
"$VMRUN" -T fusion start "$VMX_PATH"

# Wait 10 seconds for VM to start before telling it to remove ISO on next boot
sleep 10

# Prevent ISO reconnect on next boot
sed -i '' 's/sata0:1.startConnected = "TRUE"/sata0:1.startConnected = "FALSE"/' "$VMX_PATH"

echo "Done! VM '$VM_NAME' is now running."