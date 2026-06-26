MIT License

Copyright (c) 2026 jessica12ryan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Third-Party Components

The software in this repository (build scripts, preseed configurations,
VM scripts, and the FPP Flasher application) is original work and
licensed under the MIT terms above.

However, the **generated FPP-OS ISO** incorporates third-party
components with separate licenses.  When building and distributing
the ISO, you must comply with the applicable license terms for each
component.

### Falcon Player (FPP)

FPP is downloaded and installed by the ISO.  FPP is multi-licensed:

- **Core library** — LGPL v2.1+ (`LICENSE.LGPL` in the FPP repo)
- **Channel outputs** — GPL v2+ (`LICENSE.GPL` in the FPP repo)
- **Non-GPL components** — CC-BY-ND (`LICENSE.CC-BY-ND` in the FPP repo)
- **All other code** — GPL v2+ (`LICENSE.GPL` in the FPP repo)

See [github.com/FalconChristmas/fpp](https://github.com/FalconChristmas/fpp)
for the full license texts.

### Debian GNU/Linux

The ISO installs a Debian base system.  Debian is distributed under
various open-source licenses; see
[https://www.debian.org/legal/licenses/](https://www.debian.org/legal/licenses/)
for details.

### Additional Dependencies

The FPP Flasher (Electron app in `flasher/`) depends on npm packages,
each with its own license.  See `flasher/node_modules/` for details.

See [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) for full
license texts of components referenced above.
