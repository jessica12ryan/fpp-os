#!/bin/bash
# Proxmox VE VM Creator from ISO
set -e

read -p "Enter VM ID (e.g., 105): " VMID
read -p "Enter VM Name: " VMNAME
read -p "Enter Memory in GB (e.g., 1, 2, 4): " MEM_GB
read -p "Enter Disk Size in GB (e.g., 16, 32, 64): " DISK_SIZE
read -p "Enter Storage Pool (e.g., local-lvm): " STORAGE

# Strip out "GB" or "gb" if the user accidentally typed it
MEM_GB=$(echo "$MEM_GB" | sed -E 's/[Gg][Bb]//g' | tr -d ' ')

# Convert to MB (GB * 1024)
MEMORY=$((MEM_GB * 1024))

ISO_URL="https://github.com/jessica12ryan/fpp-os/releases/latest/download/fpp-os-amd64.iso"
ISO_NAME=$(basename "$ISO_URL")
ISO_PATH="/var/lib/vz/template/iso/$ISO_NAME"

echo "Downloading ISO..."
wget -O "$ISO_PATH" "$ISO_URL"

echo "Creating VM $VMID..."
# Create VM — only called ONCE
qm create "$VMID" \
  --name "$VMNAME" \
  --memory "$MEMORY" \
  --cores 2 \
  --sockets 1 \
  --net0 virtio,bridge=vmbr0 \
  --scsihw virtio-scsi-pci

# Configure machine/firmware
qm set "$VMID" --ostype l26
qm set "$VMID" --machine q35
qm set "$VMID" --bios ovmf
qm set "$VMID" --efidisk0 "$STORAGE:1,efitype=4m,pre-enrolled-keys=1"

# Add a blank disk for the OS
qm set "$VMID" --scsi0 "$STORAGE:$DISK_SIZE"

# Attach the ISO as a CD-ROM using Proxmox storage syntax (not raw path)
qm set "$VMID" --ide2 "local:iso/$ISO_NAME,media=cdrom"

# Boot from CD first, then disk
qm set "$VMID" --boot "order=ide2\;scsi0"

echo "VM $VMID created. Starting..."
qm start "$VMID"
echo "Access the VM console to proceed with installation."
