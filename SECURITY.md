# Security Policy

## Supported Versions

Only the latest release of FPP-OS is supported with security updates.
Users are strongly encouraged to keep up to date with the latest release.

| Version | Supported          |
|---------|--------------------|
| latest  | :white_check_mark: |
| < latest| :x:                |

## Reporting a Vulnerability

If you discover a security issue in this repo, please open a private issue or
contact the maintainer via the GitHub repository at
https://github.com/jessica12ryan/fpp-os/security/advisories

Please do **not** report security issues through the public issue tracker if they
could be exploited before a fix is released.

## Security Considerations

- FPP-OS should only be deployed on trusted, isolated networks.
- Do not expose the FPP web interface or SSH to the public internet.
- Default credentials (`root`/`fpp` : `falcon`) should be changed
  immediately after installation.
- Keep your system updated with the latest FPP-OS release to receive
  security fixes.
