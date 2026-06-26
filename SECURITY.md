# Security Policy

## Supported Versions

Only the latest release of FPP-OS is supported with security updates.
Users are strongly encouraged to keep up to date with the latest release.

| Version | Supported          |
|---------|--------------------|
| latest  | :white_check_mark: |
| < latest| :x:                |

## Reporting a Vulnerability

FPP-OS is designed to run as an appliance on a secured network and is not
intended to be exposed directly to the internet.

Security vulnerabilities can be reported by opening a public issue on
GitHub. Fixes should be proposed via the standard Pull Request process.

Vulnerabilities reported through other channels will not be triaged.

## Security Considerations

- FPP-OS should only be deployed on trusted, isolated networks.
- Do not expose the FPP web interface or SSH to the public internet.
- Default credentials (`root`/`fpp` : `falcon`) should be changed
  immediately after installation.
- Keep your system updated with the latest FPP-OS release to receive
  security fixes.
