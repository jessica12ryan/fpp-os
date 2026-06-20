# FPP-OS — Falcon Player Operating System

FPP-OS is a Debian-based bootable ISO that performs an automated installation of Falcon Player (FPP).

## Project structure

- `scripts/build-iso.sh` — orchestration script that downloads a Debian Trixie netinst ISO, mounts it, injects the preseed file, patches boot menus (BIOS + UEFI), and repacks into `fpp-os-amd64.iso`
- `scripts/patch-isolinux.py` — patches BIOS isolinux boot menu for automated install
- `scripts/patch-grub.py` — patches UEFI GRUB boot menu for automated install
- `preseed/fpp.template.preseed` — Debian preseed template with `envsubst` variables (`${VERSION}`, `${FPP_INSTALL_BRANCH}`)
- `isolinux/` — BIOS boot config and splash image
- `SD/` — FPP install scripts downloaded from upstream FalconChristmas/fpp
- `vmscripts/` — one-click VM creation scripts for Proxmox, VirtualBox, VMware, Parallels, Hyper-V
- `flasher/` — Electron desktop app for writing ISO to USB or FPP to SD card

## Build commands

### ISO
```bash
sudo apt-get install -y xorriso isolinux syslinux-common curl gpg python3 cpio gzip
bash scripts/build-iso.sh
```

### Flasher
```bash
cd flasher && npm ci && npm start
npm run lint
npx electron-builder
```

## Guidelines

- Shell scripts: use shellcheck (`find . -name '*.sh' -not -path './.git/*' -not -path './flasher/*' -not -path './SD/FPP_Install.sh' | xargs shellcheck -x --severity=error`).
- Flasher JS: use ESLint (`npx eslint src/`).
- Version is in `VERSION.txt`; auto-incremented during CI builds.
- Preseed uses `envsubst` — do not hardcode version or branch.
- Boot menu patchers (Python) use only standard library.
- All VM scripts should be self-contained with no external dependencies beyond the hypervisor CLI.
