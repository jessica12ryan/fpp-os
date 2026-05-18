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

## Requirements

 - The machine (or VM) you are installing on must be dedicated to FPP. There is a risk of drives being wiped if they are in the same machine or attached to the same VM. The script will attempt to use the first drive available.
 - You must have a network adapter (NIC) and an available internet connection. If using ethernet or a VM, the network connection must be configured prior to installing the ISO. If you are using WI-FI, you will be prompted to enter your credentials during the ISO install. Your NIC must be compatible with Debian 13.
 - In fact, your machine (or VM) must be compatible with Debian 13. Most systems are, even older machines. However, if there are components in your PC that do not have Debian 13 compatibility, there is nothing we can do to change that.

---

## Installation Guide

This guide covers installation on:
- [Physical PC (bare metal)](#1-installation-on-a-physical-pc-bare-metal)
- [Proxmox VE (VM)](#2-installation-on-proxmox-ve-vm)
- [VirtualBox](#3-installation-on-virtualbox)
- [VMware Workstation or Player](#4-installation-on-vmware-workstation--player)
- [VMware Fusion](#5-installation-on-vmware-fusion)
- [Parallels Desktop](#6-installation-on-parallels)

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
bash -c "$(curl -fsSL https://raw.githubusercontent.com/jessica12ryan/fpp-os/latest/proxmox/fpp-os.sh)"
```
4. Follow the prompts to create a VM
5. Install will start in VM
6. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
7. Installation of OS finishes and warns to remove install media and the system shuts down
8. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
9. System will reboot when completed
10. See [Post-Installation](#post-installation) for next steps


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
   - Type: VDI (VirtualBox Disk Image)
   - Size: 10GB+ (Recommended atleast 32GB, 64GB for larger shows)
5. Click Finish (Do not start VM yet)
6. Go to VM Settings > Network
7. Change "Attached to: NAT" to "Attached to: Bridged Adapter"
8. (Optional) Select General on the left, then specify how much RAM you want to assign to the VM. This can be changed at any time
9. Click OK
10. Start VM and installation will start
11. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
12. Installation of OS and warns to remove install media and the system shuts down (VirtualBox usually does this automatically)
13. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
14. System will reboot when completed
15. See [Post-Installation](#post-installation) for next steps


---

### 4. Installation on VMware (Workstation / Player)

#### Requirements
- VMware Workstation or Player installed
- ISO file

#### Steps

1. Open VMware → Create New Virtual Machine
2. Choose Typical, then click Next
3. Choose ISO option, then browse and select the ISO file, then click Next
4. Name your VM and choose location
5. Create virtual disk:
   - 10GB+ (Recommended atleast 32GB, 64GB for larger shows)
   - Split or single file (either is fine)
   - Click Next
6. Click "Customize Hardware", select Network Adapter on the left, then select Bridged
7. (Optional) Select Memory on the left, then specify how much RAM you want to assign to the VM. This can be changed at any time
8. Click Close and then finish
9. Start VM and installation will start
10. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
11. Installation of OS and warns to remove install media and the system shuts down
12. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
13. System will reboot when completed
14. See [Post-Installation](#post-installation) for next steps


---

### 5. Installation on VMware Fusion

#### Requirements
- VMware Fusion installed
- ISO file

#### Steps

1. Open VMware Fusion
2. Select File > New (If not prompted to create a VM)
3. Drag the downloaded ISO on to the VMware window and click Continue
5. Select UEFI (If applicable) and click Continue
6. Click Customise Settings
7. Give the VM a Name and click Save
8. Select Network Adapter
9. Click the dot next to Autodetect under Bridged Networking
10. Click Show All on the title bar
11. Click Hard Drive - Resize to what you need (Recommended atleast 32GB, 64GB for larger shows)
12. (Optional) Click Show All on the title bar, click Processors and Memory, then specify how much RAM you want to assign to the VM. This can be changed at any time
13. Close the Settings Panel
14. Start VM and installation will start
15. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
16. Installation of OS and warns to remove install media and the system shuts down
17. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
18. System will reboot when completed
19. See [Post-Installation](#post-installation) for next steps


---

### 6. Installation on Parallels

#### Requirements
- Parallels Desktop installed
- ISO file

#### Steps

1. Open Parallels → Install Windows, Linux, or macOS from an image file → Continue
2. Locate and select the ISO file, then click Continue
3. Name your VM, choose location, select "customize settings before installation", then click Create
4. Select the Hardware tab, select Network on the left, then select Default Adapter under Bridged Network
5. Select Hard Disk on the left, click Advanced, then click Properties
6. Specify your disk size:
   - 10GB+ (Recommended atleast 32GB, 64GB for larger shows)
   - If you made changes: Click Apply → Continue
   - Click Close → OK
7. Select Boot Order on the left, click advanced, and change BIOS to EFI (64 Bit) if available
8. (Optional) Select Memory on the left, then specify how much RAM you want to assign to the VM. This can be changed at any time
9. Close the window and click Continue
10. The VM will start automatically and installation will begin
11. Confirm hard drive contents will be overwritten by selecting yes, then wait for OS to finish installing
12. Installation of OS and warns to remove install media and the system shuts down (Parallels usually does this automatically)
13. On first boot, FPP is installed automatically — this may take 10–30 minutes depending on internet speed
14. System will reboot when completed
15. See [Post-Installation](#post-installation) for next steps


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
