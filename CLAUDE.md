# FPP-OS

Bootable Debian-based ISO that installs Falcon Player (FPP) automatically.

## Quick links

- **Build ISO:** `bash scripts/build-iso.sh`
- **Run flasher:** `cd flasher && npm ci && npm start`
- **Lint shell:** `find . -name '*.sh' -not -path './.git/*' -not -path './flasher/*' -not -path './SD/FPP_Install.sh' | xargs shellcheck -x --severity=error`
- **Lint JS:** `cd flasher && npx eslint src/`

## Key files

| File | Purpose |
|---|---|
| `scripts/build-iso.sh` | ISO build orchestration |
| `preseed/fpp.template.preseed` | Debian auto-install config |
| `flasher/src/main.js` | Electron main process |
| `flasher/src/index.html` | Flasher UI |
| `VERSION.txt` | Current version |

For full details see `.claude/claude.md` or the README.
