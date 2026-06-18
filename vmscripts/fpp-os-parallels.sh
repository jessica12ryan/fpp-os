#!/bin/bash

# Exit immediately if a command fails
set -e

# --- User Prompts ---
printf "Enter VM Name: "
read -r VM_NAME

printf "Enter RAM size in GB (e.g., 1, 2, 4): "
read -r RAM_SIZE_GB

printf "Enter Disk size in GB (e.g., 16, 32, 64): "
read -r DISK_SIZE_GB

# Convert GB to MB for Parallels CLI
RAM_SIZE=$(( RAM_SIZE_GB * 1024 ))
DISK_SIZE_MB=$(( DISK_SIZE_GB * 1024 ))

# Downloads the ISO to your Downloads folder using the original filename
ISO_URL="https://github.com/jessica12ryan/fpp-os/releases/latest/download/fpp-os-amd64.iso"
ISO_NAME=$(basename "$ISO_URL")
DOWNLOAD_PATH="$HOME/Downloads/$ISO_NAME"
printf "\nDownloading latest ISO...\n"
curl -L -o "$DOWNLOAD_PATH" "$ISO_URL"

# --- VM Provisioning ---
printf "\nStarting VM creation for: %s...\n" "$VM_NAME"

# 1. Create the VM Shell and remove the default hard drive
prlctl create "$VM_NAME" -o linux --dst ~/Parallels/
prlctl set "$VM_NAME" --device-del hdd0

# 2. Configure Hardware Resources
prlctl set "$VM_NAME" --memsize "$RAM_SIZE" --cpus 2 --cpu-hotplug off

# 3. Configure Network to Bridged Mode
# 'bridged' tells Parallels to bind to the default active network adapter (Wi-Fi or Ethernet)
prlctl set "$VM_NAME" --device-set net0 --type bridged

# 4. Add your custom Hard Drive
prlctl set "$VM_NAME" --device-add hdd --type plain --size "$DISK_SIZE_MB"

# 5. Attach Downloaded ISO
prlctl set "$VM_NAME" --device-set cdrom0 --image "$DOWNLOAD_PATH" --connect

# 6. Boot the VM
printf "\nSetup complete. Starting %s...\n" "$VM_NAME"
prlctl start "$VM_NAME"
printf "\nOpen Parallels to continue the VM installation...\n"
