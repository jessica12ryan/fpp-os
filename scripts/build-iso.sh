#!/usr/bin/env bash
# =============================================================================
# build-iso.sh — Build FPP-OS ISO
# =============================================================================
# Strategy:
#   1. Download latest Debian 13 (Trixie) netinst ISO
#   2. Mount it via loop device, rsync contents to a working directory
#   3. Inject preseed into initrd and place it at ISO root
#   4. Patch isolinux (BIOS) and GRUB (UEFI) boot menus
#   5. Repack using xorriso, cloning the original El Torito boot config
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
DEBIAN_VERSION="13"
ARCH="amd64"
OUTPUT_ISO="fpp-os-${ARCH}.iso"
WORK_DIR="$(mktemp -d /tmp/fpp-build.XXXXXX)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOUNT_DIR="${WORK_DIR}/mnt"
ISO_DIR="${WORK_DIR}/iso-contents"
ORIGINAL_ISO="${WORK_DIR}/debian-original.iso"

# ── Colour helpers ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Version ───────────────────────────────────────────────────────────────────
if [[ -z "${NEW_VERSION:-}" ]]; then
    if [[ -f "${SCRIPT_DIR}/VERSION.txt" ]]; then
        NEW_VERSION=$(cat "${SCRIPT_DIR}/VERSION.txt")
        warn "NEW_VERSION not set — falling back to VERSION.txt: ${NEW_VERSION}"
    else
        error "NEW_VERSION is not set and VERSION.txt was not found. Pass it as: NEW_VERSION=x.y.z sudo bash scripts/build-iso.sh"
    fi
fi

# ── Cleanup (unmount first) ────────────────────────────────────────────────────
cleanup() {
    if mountpoint -q "${MOUNT_DIR}" 2>/dev/null; then
        umount "${MOUNT_DIR}" 2>/dev/null || true
    fi
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

# ── Dependency check ───────────────────────────────────────────────────────────
check_deps() {
    info "Checking dependencies..."
    local missing=()
    for cmd in xorriso curl rsync cpio gzip python3 sha256sum dd file; do
        command -v "$cmd" &>/dev/null || missing+=("$cmd")
    done
    if [[ ${#missing[@]} -gt 0 ]]; then
        error "Missing tools: ${missing[*]}"
    fi
    [[ $EUID -eq 0 ]] || error "Must run as root (needed for loop mount): sudo bash scripts/build-iso.sh"
    info "All dependencies present."
}

# ── Download latest Debian 13 netinst ISO ──────────────────────────────────────
download_iso() {
    info "Fetching latest Debian ${DEBIAN_VERSION} (trixie) netinst ISO..."

    local iso_url=""

    # Try stable release first
    local stable_base="https://cdimage.debian.org/cdimage/release/current/${ARCH}/iso-cd"
    local stable_iso
    stable_iso=$(curl -sf "${stable_base}/" 2>/dev/null \
        | grep -oP "debian-[\d.]+-${ARCH}-netinst\.iso" | head -1 || true)
    if [[ -n "$stable_iso" ]]; then
        iso_url="${stable_base}/${stable_iso}"
        info "Found stable ISO: $stable_iso"
    fi

    # Fall back to daily build (Debian 13 not yet stable released)
    if [[ -z "$iso_url" ]]; then
        warn "Stable trixie not yet released — using daily build..."
        local daily_base="https://cdimage.debian.org/cdimage/daily-builds/daily/arch-latest/${ARCH}/iso-cd"
        iso_url="${daily_base}/debian-testing-${ARCH}-netinst.iso"
    fi

    info "Downloading: $iso_url"
    curl -L --progress-bar -o "${ORIGINAL_ISO}" "$iso_url" \
        || error "Download failed."

    # Basic sanity check
    file "${ORIGINAL_ISO}" | grep -qi "ISO 9660\|CD-ROM\|ISO image" \
        || warn "Downloaded file may not be a valid ISO — proceeding anyway."

    info "Downloaded: $(du -sh "${ORIGINAL_ISO}" | cut -f1)"
}

# ── Mount ISO and rsync contents ───────────────────────────────────────────────
extract_iso() {
    info "Mounting ISO and copying contents..."
    mkdir -p "${MOUNT_DIR}" "${ISO_DIR}"

    mount -o loop,ro "${ORIGINAL_ISO}" "${MOUNT_DIR}" \
        || error "Failed to mount ISO."

    rsync -a --chmod=u+w "${MOUNT_DIR}/" "${ISO_DIR}/"
    umount "${MOUNT_DIR}"

    info "✓ Copied $(find "${ISO_DIR}" | wc -l) items from ISO"
}

embed_preseed() {
    info "Embedding preseed to ISO root..."
    local preseed_src="${SCRIPT_DIR}/preseed/fpp.preseed"
    [[ -f "$preseed_src" ]] || error "Preseed not found: $preseed_src"

    # Copy to ISO root as preseed.cfg (accessible at /cdrom/preseed.cfg)
    cp "$preseed_src" "${ISO_DIR}/preseed.cfg"
    info "✓ Preseed placed at ISO root directory."
}

# ── Patch boot menus ───────────────────────────────────────────────────────────
patch_boot_menus() {
    info "Patching boot menus..."
    local PRESEED_APPEND="preseed/file=/cdrom/preseed.cfg auto=true priority=critical"

    for cfg in \
        "${ISO_DIR}/isolinux/isolinux.cfg" \
        "${ISO_DIR}/isolinux/menu.cfg" \
        "${ISO_DIR}/isolinux/txt.cfg" \
        "${ISO_DIR}/isolinux/gtk.cfg"; do
        [[ -f "$cfg" ]] || continue
        info "  BIOS: $(basename "$cfg")"
        python3 "${SCRIPT_DIR}/scripts/patch-isolinux.py" "$cfg" "$PRESEED_APPEND"
    done

    for cfg in \
        "${ISO_DIR}/boot/grub/grub.cfg" \
        "${ISO_DIR}/EFI/boot/grub.cfg"; do
        [[ -f "$cfg" ]] || continue
        info "  UEFI: $cfg"
        python3 "${SCRIPT_DIR}/scripts/patch-grub.py" "$cfg" "$PRESEED_APPEND"
    done
}

# ── Repack ISO ─────────────────────────────────────────────────────────────────
repack_iso() {
    local output_path="${SCRIPT_DIR}/${OUTPUT_ISO}"
    info "Repacking ISO → ${output_path}"

    # Extract the 432-byte MBR boot code from original ISO
    local mbr_bin="${WORK_DIR}/mbr.bin"
    dd if="${ORIGINAL_ISO}" bs=1 count=432 of="${mbr_bin}" status=none

    # Query xorriso for the exact mkisofs-compatible boot options from the original
    # This tells us exactly how the original was built
    local boot_report
    boot_report=$(xorriso -indev "${ORIGINAL_ISO}" -report_el_torito as_mkisofs 2>/dev/null || true)
    info "  Original boot report: $boot_report"

    # Detect whether original has EFI partition image
    local efi_img="${ISO_DIR}/boot/grub/efi.img"
    local has_efi=false
    [[ -f "$efi_img" ]] && has_efi=true

    # Build the xorriso command dynamically
    local xorriso_args=(
        -as mkisofs
        -r
        -V "FPP-OS-${NEW_VERSION}"
        -o "${output_path}"
        -J -joliet-long
        -iso-level 3
        --grub2-mbr "${mbr_bin}"
        -partition_offset 16
        --mbr-force-bootable
        -c '/boot.catalog'
        -b '/isolinux/isolinux.bin'
        -no-emul-boot -boot-load-size 4 -boot-info-table --grub2-boot-info
    )

    if [[ "$has_efi" == true ]]; then
        xorriso_args+=(
            -append_partition 2 28732AC11FF8D211BA4B00A0C93EC93B "${efi_img}"
            -appended_part_as_gpt
            -eltorito-alt-boot
            -e '--interval:appended_partition_2:::' 
            -no-emul-boot
        )
    fi

    xorriso_args+=( "${ISO_DIR}" )

    info "Running xorriso repack..."
    xorriso "${xorriso_args[@]}" 2>&1 | grep -v "^xorriso : NOTE\|^xorriso : UPDATE\|^xorriso : DEBUG" || true

    if [[ ! -f "${output_path}" ]]; then
        warn "Primary repack failed, trying fallback..."
        _repack_fallback "${output_path}" "${mbr_bin}"
    fi

    [[ -f "${output_path}" ]] || error "ISO build failed — output not created"
    info "✓ Built: ${output_path} ($(du -sh "${output_path}" | cut -f1))"
}

_repack_fallback() {
    local output_path="$1"
    local mbr_bin="$2"

    warn "Fallback repack (basic BIOS boot)..."
    xorriso -as mkisofs \
        -r -V "FPP-OS-${NEW_VERSION}" \
        -o "${output_path}" \
        -J -joliet-long -iso-level 3 \
        --grub2-mbr "${mbr_bin}" \
        -c '/boot.catalog' \
        -b '/isolinux/isolinux.bin' \
        -no-emul-boot -boot-load-size 4 -boot-info-table \
        "${ISO_DIR}" 2>&1 | grep -v "^xorriso : NOTE" || true
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
    info "════════════════════════════════════════"
    info "  FPP-OS AMD64 ISO Builder"
    info "════════════════════════════════════════"
    check_deps
    download_iso
    extract_iso
    embed_preseed
    patch_boot_menus
    repack_iso
    info "════════════════════════════════════════"
    info "  Done! → ${SCRIPT_DIR}/${OUTPUT_ISO}"
    info "════════════════════════════════════════"
}

main "$@"
