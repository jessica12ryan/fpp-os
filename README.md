# FPP-OS - Falcon Player OS (EARLY BETA)

> **Automated Debian-based ISO builder for [Falcon Player (FPP)](https://github.com/FalconChristmas/fpp)**

This repository automatically builds a bootable FPP-OS ISO that will automatically install FPP on a PC or virtual machine.

**WARNING: All data will be wiped on local drive automatically once booted from the ISO**

This version of FPP is not officially supported by the FalconChristmas/FPP team. All issues from this installation should be logged to THIS repo. We will test and confirm whether the issue is isolated to our repo, and recreate the ticket on the FPP repo if necessary. The FPP team will not respond to any issues from this installation.

This ISO uses a network installer. You must have an internet connection to run and install the ISO.

The installer will boot using UEFI (preferred) or Legacy BIOS. If your BIOS is set to UEFI, a gray screen will be seen during the OS install. If your BIOS is set to Legacy Boot, a blue screen will be seen during the OS install. Both work - but UEFI is preferred as it is modern and provides an extra level of security.

---

## 📥 Download

Grab the latest ISO from the [**Releases**](../../releases/latest) page.

---

## 🚀 Usage

### Flash to USB

**Linux / macOS:**
```bash
dd if=fpp-os-amd64.iso of=/dev/sdX bs=4M status=progress
sync
```
Replace `/dev/sdX` with your USB device (e.g. `/dev/sdb`). **Double-check the device — this will erase it.**

**Windows:**
Use [Rufus](https://rufus.ie) or [Etcher](https://etcher.balena.io). Select the ISO, choose your USB drive, and write.

---

### Default credentials

| User   | Password |
|--------|----------|
| `root` | `falcon` |
| `fpp`  | `falcon` |

---

## Installation Guide

This guide covers installation on:
- Physical PC (bare metal)
- Proxmox VE (VM)
- VirtualBox
- VMware

----

### 1. Installation on a Physical PC (Bare Metal)

#### Requirements
- USB drive (4GB+)
- ISO image
- Tool like Rufus or Balena Etcher

#### Steps

1. Download the latest ISO file.
2. Create a bootable USB:
   - Windows: Use Rufus
   - macOS/Linux: Use Balena Etcher or `dd`
3. Insert USB into the target PC.
4. Boot into BIOS/UEFI (usually `F2`, `DEL`, or `F12`).
5. Select USB as boot device.
6. Wait for installation.
7. Installation of OS finishes and warns to remove install media and the system shuts down
8. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
9. System will reboot when completed

---

### 2. Installation on Proxmox VE (VM)

#### Requirements
- Proxmox VE installed
- ISO uploaded to Proxmox storage

#### Steps

1. Log into Proxmox web UI.
2. Open your host shell
3. Run the following command
```
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/proxmox/fpp-os.sh)"
```
4. Follow the prompts to create a VM
5. Install will start in VM
6. Installation of OS finishes and warns to remove install media and the system shuts down
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed


---

### 3. Installation on VirtualBox

#### Requirements
- Oracle VirtualBox installed
- ISO file

#### Steps

1. Open VirtualBox → Click **New**
2. Name and Operating System:
   - Name: your choice
   - ISO Image: Select FPP-OS ISO
   - Type: Linux
   - Subtype: Debian
   - Version: Debian (64-bit)
   - Skip Unattended Install: Check
3. Hardware:
   - Base Memory: Minimum 2048MB (recommended 4096MB)
   - Enable EFI: Check
4. Hard Disk:
   - Size: 10GB+ (Recommended atleast 32GB, 64GB for larger shows)
   - Type: VDI (VirtualBox Disk Image
   - Size: 10GB+ (Recommended atleast 32GB, 64GB for larger shows)
5. Click Finish (Do not start VM yet)
6. Go to VM Settings > Network
7. Change "Attached to: NAT" to "Attached to: Bridged Adapter"
8. Click OK
9. Start VM
10. Installation of OS and warns to remove install media and the system shuts down
11. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
12. System will reboot when completed


---

### 4. Installation on VMware (Workstation / Player)

#### Requirements
- VMware Workstation or Player
- ISO file

#### Steps

1. Open VMware → Create New Virtual Machine
2. Choose:
   - Installer disc image (ISO)
3. Select OS type:
   - Linux → Debian 64-bit (or Other Linux)
4. Name your VM and choose location
5. Allocate resources:
   - CPU: 2 cores minimum
   - RAM: 2GB–4GB recommended
6. Create virtual disk:
   - 10GB+ recommended
   - Split or single file (either is fine)
7. Start VM
8. Follow installer prompts
9. Installation of OS and warns to remove install media and the system shuts down
10. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
11. System will reboot when completed


---

### Post-Installation

#### FPP Setup

Browse to the web directory presented on your console screen after install, or open a webbrowser and browse to fpp.local
Complete the FPP setup in your browser

---

## 🐛 Troubleshooting

**FPP install fails on first boot**
Check the journal: `journalctl -u fpp-install.service`
The FPP Install Script requires internet access. Make sure your machine is connected via ethernet.

---

## 📄 License

This repository is MIT licensed. FPP itself is licensed under its own terms — see [FalconChristmas/fpp](https://github.com/FalconChristmas/fpp).
