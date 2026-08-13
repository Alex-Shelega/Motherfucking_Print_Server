# 🖨️ Local Color Print Server

A zero-external-dependency, headless local print server solution built with Node.js, PowerShell, and Native VBS scripts. Bypasses restrictive legacy printing setups to enable seamless, direct full-color printing through a lightweight local web dashboard.

---

## ⚡ Features

* **Zero `npm` Dependencies:** Runs on pure, native Node.js core modules.
* **System Tray Control:** Smooth background control powered by native PowerShell.
* **Headless Background Process:** Silent launch and termination via pure VBScript.
* **Dynamic Local IP Display:** Displays accessible network endpoints directly on launch.
* **Mobile & Browser Dashboard:** Intuitive web interface featuring an embedded Kopimi & WTFPL footer.

---

## 📂 Project Structure

```text
├── server.js      # Core Node.js print server & web dashboard
├── tray.ps1       # System tray controls and GUI automation
├── launch.vbs     # Silent background launcher
├── stop.vbs       # Background process killer script
├── README.md      # Documentation
├── LICENSE        # WTFPL text file
├── server.pid     # Appears after the first time launch, contains the process ID (PID) so stop.vbs kills
                     only the server without needing to terminate Node runtime which may result in
                     other processes being killed
└── tray.pid       # Same as server.pid but for the tray so it doesn't stay hanging as a dummy UI
```

---

## 🚀 Quick Start

1. **Launch Server:** Double-click `launch.vbs` to run the server headlessly in the background.
2. **Access Dashboard:** Open your browser and navigate to the IP address printed on screen or shown in your network details (`http://localhost:3000` or local network IP).
3. **Stop Server:** Double-click `stop.vbs` or use the System Tray menu to terminate background tasks cleanly.

---

## 📜 License & Copyleft

**Kopimi 2026** — All media wants to be free. Copying, sharing, and tweaking is encouraged.

Licensed under the **DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL)**:

```text
            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                    Version 2, December 2004

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.
```
