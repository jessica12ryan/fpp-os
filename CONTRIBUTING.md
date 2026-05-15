# FPP-OS

> **CONTRIBUTING.md**

## 🏗️ Build locally

### Requirements

```bash
sudo apt-get install -y xorriso isolinux syslinux-common curl gpg python3 cpio gzip
```

### Build

```bash
git clone https://github.com/YOUR_USERNAME/fpp-debian.git
cd fpp-debian
bash scripts/build-iso.sh
```

The output ISO will be in the repo root: `fpp-os-amd64.iso`

---

## 📁 Repository structure

```
fpp-debian/
├── .github/
│   └── workflows/
│       └── build-release.yml   # GitHub Actions: build + release ISO
├── SD/
│   ├── FPP_Install.sh          # FPP_Install.sh script from FPP repo (cached)
│   └── FPP_Post_Install.sh     # Commands to be run after FPP_Install.sh has completed
├── isolinux/
│   └── README.txt              # Placeholder for splash screen
├── preseed/
│   └── fpp.preseed             # Debian preseed (automates install, skips partitioning)
├── proxmox/
│   └── fpp-os.sh               # Proxmox Helper Script
├── scripts/
│   ├── build-iso.sh            # Main ISO build script
│   ├── patch-isolinux.py       # Patches BIOS boot menu
│   └── patch-grub.py           # Patches UEFI GRUB menu
├── isolinux/                   # Optional: custom splash/branding
└── README.md
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
