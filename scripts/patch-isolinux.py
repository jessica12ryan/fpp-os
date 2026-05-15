#!/usr/bin/env python3
"""
patch-isolinux.py — Inject a single FPP entry into the correct isolinux config
and set it as the default.

Debian isolinux layout:
  isolinux.cfg  → sets DEFAULT/TIMEOUT, includes menu.cfg
  menu.cfg      → includes txt.cfg and gtk.cfg
  txt.cfg       → actual LABEL blocks for text mode
  gtk.cfg       → actual LABEL blocks for graphical mode

Strategy:
  - In txt.cfg / gtk.cfg:   add ONE 'fpp' LABEL block at the top (if not present)
  - In isolinux.cfg:        set DEFAULT to 'fpp' and TIMEOUT to 50 (5 s)
  - Leave menu.cfg alone

Usage: python3 patch-isolinux.py <cfg_file> <preseed_append_string>
"""

import sys
import re
import os


def patch_txt_or_gtk(cfg_file: str, preseed_append: str) -> None:
    """Add one FPP LABEL block at the top of txt.cfg or gtk.cfg."""
    with open(cfg_file, 'r', errors='replace') as f:
        content = f.read()

    if 'LABEL fpp' in content:
        print(f"  Already has fpp entry: {cfg_file}")
        return

    # Find the kernel and initrd used by the existing install entry so we can clone them
    kernel = '/install.amd/vmlinuz'
    initrd  = '/install.amd/initrd.gz'

    kernel_m = re.search(r'(?im)^\s*KERNEL\s+(\S+)', content)
    if kernel_m:
        kernel = kernel_m.group(1)

    initrd_m = re.search(r'(?i)initrd=(\S+)', content)
    if initrd_m:
        initrd = initrd_m.group(1)

    fpp_block = (
        "LABEL fpp\n"
        "  MENU LABEL FPP Install\n"
        f"  KERNEL {kernel}\n"
        f"  APPEND initrd={initrd} {preseed_append} ---\n"
        "\n"
    )

    with open(cfg_file, 'w') as f:
        f.write(fpp_block + content)

    print(f"  ✓ Added fpp entry: {cfg_file}")


def patch_isolinux_cfg(cfg_file: str) -> None:
    """Set DEFAULT fpp and a short TIMEOUT in isolinux.cfg."""
    with open(cfg_file, 'r', errors='replace') as f:
        content = f.read()

    # Replace or insert DEFAULT
    if re.search(r'(?im)^DEFAULT\s+', content):
        content = re.sub(r'(?im)^DEFAULT\s+\S+', 'DEFAULT fpp', content)
    else:
        content = 'DEFAULT fpp\n' + content

    # Replace or insert TIMEOUT (50 = 5 seconds)
    if re.search(r'(?im)^TIMEOUT\s+', content):
        content = re.sub(r'(?im)^TIMEOUT\s+\S+', 'TIMEOUT 50', content)
    else:
        content = 'TIMEOUT 50\n' + content

    with open(cfg_file, 'w') as f:
        f.write(content)

    print(f"  ✓ Set DEFAULT=fpp TIMEOUT=50: {cfg_file}")


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <cfg_file> <preseed_append>")
        sys.exit(1)

    cfg_file      = sys.argv[1]
    preseed_append = sys.argv[2]
    basename      = os.path.basename(cfg_file)

    if basename in ('txt.cfg', 'gtk.cfg'):
        patch_txt_or_gtk(cfg_file, preseed_append)
    elif basename == 'isolinux.cfg':
        patch_isolinux_cfg(cfg_file)
    else:
        # menu.cfg or unknown — leave alone
        print(f"  Skipping (not patching {basename})")


if __name__ == '__main__':
    main()
