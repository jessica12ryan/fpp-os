# FPP-OS

> **CONTRIBUTING.md**

## 🏗️ Build locally

### Requirements

```bash
sudo apt-get install -y xorriso isolinux syslinux-common curl gpg python3 cpio gzip
```

### Build

```bash
git clone https://github.com/jessica12ryan/fpp-os.git
cd fpp-os
bash scripts/build-iso.sh
```

The output ISO will be in the repo root: `fpp-os-amd64.iso`

---

## 📁 Repository structure

```
fpp-os/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── workflows/
│   │   └── build-release.yml   # GitHub Actions: build + release ISO
│   ├── dependabot.yml
│   └── FUNDING.yml
├── flasher/
│   └── *              #Contains files for building the USB Flasher
├── isolinux/
│   └── README.txt              # Placeholder for custom splash/branding
├── preseed/
│   └── fpp.template.preseed             # Debian preseed (automates install, skips partitioning)
├── scripts/
│   ├── build-iso.sh            # Main ISO build script
│   ├── patch-isolinux.py       # Patches BIOS boot menu
│   └── patch-grub.py           # Patches UEFI GRUB menu
├── SD/
│   ├── FPP_Install.sh          # FPP_Install.sh script from FPP repo (cached)
│   ├── FPP_Post_Install.sh     # Commands to be run after FPP_Install.sh has completed
│   └── FPP_Pre_Install.sh     # Commands to be run after FPP_Install.sh has completed
├── vmscripts/
│   ├── fpp-os-hyperv.ps1
│   ├── fpp-os-parallels.sh
│   ├── fpp-os-proxmox.sh               # Proxmox Helper Script
│   ├── fpp-os-vbox.py
│   ├── fpp-os-vmfusion.sh
│   └── fpp-os-vmwarewks.ps1
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE.md
├── README.md
├── SECURITY.md
└── VERSION.txt
```

---

## 🔧 What the preseed does

| Setting | Value |
|---|---|
| Locale | `en_US.UTF-8` |
| Keyboard | US |
| Hostname | `fpp` |
| Mirror | `deb.debian.org` (latest Debian 13) |
| Root password | `fpp` |
| User | `fpp` / `fpp` |
| Timezone | `America/New_York` |
| Packages | `openssh-server`, `curl` (minimal) |
| GUI | None |
| Partitioning | **Uses 1st Disk - user confirms** |
| FPP-Install | `FPP_Install.sh` Script runs on first boot
| FPP-Install | `FPP_Post_Install.sh` Script runs immediately after FPP_Install has finished running

---

## 🔄 Automated releases

The GitHub Actions workflow (`build-release.yml`) triggers on:
- Every push to `master`
- Manual trigger (Actions tab → Run workflow)

Each release is tagged with version and includes:
- `fpp-os-amd64.iso`
- `fpp-os-amd64.iso.sha256`
- `fpp-os-amd64.iso.md5`
