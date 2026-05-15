#!/usr/bin/env python3
"""
patch-grub.py — Completely overhaul grub.cfg to ensure an un-bypasable
automated FPP installation on UEFI environments.
"""

import sys
import os

def patch_grub(cfg_file: str, preseed_append: str) -> None:
    if not os.path.exists(cfg_file):
        return

    # Modern Debian 13 netinst kernels use these exact paths inside the ISO
    kernel = '/install.amd/vmlinuz'
    initrd = '/install.amd/initrd.gz'

    # Build an explicitly reliable, clean FPP entry
    fpp_block = f"""
set default=0
set timeout=5
set theme=

menuentry 'FPP Install (Automated)' --class debian --class gnu-linux --class gnu --class os {{
    set background_color=black
    linux  {kernel} {preseed_append} locale=en_US.UTF-8 keymap=us DEBIAN_FRONTEND=text text --- quiet
    initrd {initrd}
}}
"""

    # Read the original entries
    with open(cfg_file, 'r', errors='replace') as f:
        original_content = f.read()

    # If we already patched it, skip
    if 'FPP Install (Automated)' in original_content:
        print(f"   Already patched: {cfg_file}")
        return

    # Prepend our clean entry right at the very top of the boot instructions
    new_content = fpp_block + "\n" + original_content

    with open(cfg_file, 'w') as f:
        f.write(new_content)

    print(f"  ✓ Force Patched UEFI Boot: {cfg_file}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <grub.cfg> <preseed_append>")
        sys.exit(1)
    patch_grub(sys.argv[1], sys.argv[2])
