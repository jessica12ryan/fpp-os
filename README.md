# FPP-OS - Falcon Player OS (Beta)

> **Automated Debian-based ISO builder for [Falcon Player (FPP)](https://github.com/FalconChristmas/fpp)**

This repository automatically builds a bootable FPP-OS ISO that will automatically install FPP on a PC or virtual machine.

**WARNING: All data will be wiped on local drive during the OS installation**

The current version of FPP-OS uses the master branch of FPP which contains the unstable version of FPP 10. Once FPP 10 is released, we will switch to stable builds.

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
Use [Etcher](https://etcher.balena.io). Select the ISO, choose your USB drive, and write.

OR

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

## Global Requirements

 - CPU: Must be 64-Bit
 - Memory (RAM): Atleast 512MB (Recommended 2GB-4GB) depending on size of show
 - Disk Size: Atleast 4GB (Recommended 16-64GB) depending on size of show
 - Network: Must have an internet connection
 - Physical machine or VM instance must be dedicated to FPP
 - Hardware must be compatible with Debian 13

---

## Installation Guide

This guide covers installation on:
- [Physical PC (bare metal)](#1-installation-on-a-physical-pc-bare-metal)
- [Proxmox VE (VM)](#2-installation-on-proxmox-ve-vm)
- [VirtualBox](#3-installation-on-virtualbox)
- [VMware Workstation or Player](#4-installation-on-vmware-workstation--player)
- [VMware Fusion](#5-installation-on-vmware-fusion)
- [Parallels Desktop](#6-installation-on-parallels)
- [Hyper-V](#7-installation-on-hyper-v--still-requires-testing-)

----

### 1. Installation on a Physical PC (Bare Metal)

#### Requirements
- USB drive (4GB+)
- ISO image
- A computer with [Rufus](https://rufus.ie) or Balena [Balena Etcher](https://etcher.balena.io) installed

#### Steps

1. Download the latest ISO file.
2. Create a bootable USB:
   - Windows: Use Rufus or Balena Etcher
   - macOS/Linux: Use Balena Etcher or `dd`
3. Insert USB into the target PC.
4. Boot into BIOS/UEFI (usually `F2`, `DEL`, or `F12`).
5. Select USB as boot device.
6. Installation will start
7. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
8. Installation of OS finishes and warns to remove install media and the system shuts down
9. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
10. System will reboot when completed
11. See [Post-Installation](#post-installation) for next steps


---

### 2. Installation on Proxmox VE (VM)

#### Requirements
- Proxmox VE installed

#### Steps

1. Log into Proxmox web UI.
2. Open your host shell
3. Run the following command
```
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-proxmox.sh)"
```
4. Follow the prompts to create a VM
5. Install will start in VM
6. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
7. Installation of OS finishes and warns to remove install media and the system shuts down
8. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
9. System will reboot when completed
10. See [Post-Installation](#post-installation) for next steps


---

### 3. Installation on VirtualBox

#### Requirements
- Oracle VirtualBox installed

#### Steps

1. Open macOS Terminal, Linux Terminal, or Windows PowerShell
2. Run the following command
```
python3 -c "import urllib.request; exec(urllib.request.urlopen('https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-vbox.py').read())"
```
3. Follow the prompts to create a VM
4. Install will start in VM
5. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
6. Installation of OS and warns to remove install media and the system shuts down (VirtualBox usually does this automatically)
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed
9. See [Post-Installation](#post-installation) for next steps


---

### 4. Installation on VMware (Workstation / Player)

#### Requirements
- VMware Workstation or Player installed

#### Steps

1. Open PowerShell as Administrator (WIN+X, Select PowerShell (Admin) or Terminal (Admin))
2. Run the following command
```
iex (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-vmwarewks.ps1" -UseBasicParsing).Content
```
3. Follow the prompts to create a VM
4. Install will start in VM
5. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
6. Installation of OS and warns to remove install media and the system shuts down (VMware usually does this automatically)
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed
9. See [Post-Installation](#post-installation) for next steps


---

### 5. Installation on VMware Fusion

#### Requirements
- VMware Fusion installed

#### Steps

1. Open macOS Terminal
2. Run the following command
```
curl -fsSL https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-vmfusion.sh | bash
```
3. Follow the prompts to create a VM
4. Install will start in VM
5. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
6. Installation of OS and warns to remove install media and the system shuts down (VMware usually does this automatically)
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed
9. After reboot, login as root with password falcon, and run the following command
```
sudo apt update && sudo apt install open-vm-tools -y
```
10. See [Post-Installation](#post-installation) for next steps


---

### 6. Installation on Parallels

#### Requirements
- Parallels Desktop installed

#### Steps

1. Open macOS Terminal
2. Run the following command
```
curl -fsSL https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-parallels.sh | bash
```
3. Follow the prompts to create a VM
4. Install will start in VM. Open Parallels Desktop to continue
5. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
6. Installation of OS and warns to remove install media and the system shuts down (Parallels usually does this automatically)
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed
9. See [Post-Installation](#post-installation) for next steps


---

### 7. Installation on Hyper-V ( STILL REQUIRES TESTING )

#### Requirements
- Windows with Hyper-V installed

#### Steps

1. Open PowerShell as Administrator (WIN+X, Select PowerShell (Admin) or Terminal (Admin))
2. Run the following command
```
iex (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/vmscripts/fpp-os-hyperv.ps1" -UseBasicParsing).Content
```
3. Follow the prompts to create a VM
4. Install will start in VM
5. Confirm VM disk will be overwritten by selecting yes, then wait for OS to finish installing
6. Installation of OS and warns to remove install media and the system shuts down (Hyper-V usually does this automatically)
7. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
8. System will reboot when completed
9. See [Post-Installation](#post-installation) for next steps


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
