# Motherfucking_Print_Server
A non-native print server based on Node.js leveraging SumatraPDF and headless printing on Windows. Allows sharing the host's printers whether physical, virtual or even ones it's connected through the network (Currently untested)

Vibecoded with Google Gemini. Sorry not sorry.

This project is posted as is and is not going to be updated or work on as it satisfies my needs, if you need to add features you have to make them yourself, my apologies.

## 🖨️ Local Color Print Server

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

## 📝 Tutorial

Prerequisites:  
[Node.js](https://github.com/nodejs/node) - Self explanatory  
[SumatraPDF](https://github.com/sumatrapdfreader/sumatrapdf) - May be changed to your preferred pdf program if they support command line printing, ask your local AI for details.

1. **THE RELEASE!!!:** Download the zip file from the release tab and unpack anywhere comfortable.
2. **launch.vbs:** Double click on it to start the server, it'll flash a notification and the system tray icon (just an exe icon, uncreative) will appear. double clicking opens the print menu and right click will show the IP access for other devices and some quick actions.

---

## 🖨  How to operate

1. Go to the dashboard and select a file (currently known to work with pdf, jpg, png, and perhaps whatever SumatraPDF supports),
2. Preview: Powered by CDN-ed PDF.js and some CSS styling it should theoretically show an accurate representation of the printed outcome on A4 paper. Hard to predict when messing around with paper size menu as it depends on the printer driver (tested on EPSON L3060 Series)
3. Settings:
    - Printers: The server automatically pulls all the printers (theoretically even shared ones it's connected to) of the host, Open in Server formerly used to be "Default printer" which theoretically doesn't exist, the OS just preselects whatever deemed the default. If selected will just open the file in SumatraPDF on the server. Left thinking may be useful.
    - Paper Size: This option maps the content to the selected paper size, the preview is an approximate representation of it printed on an A4 paper.
    - Color Mode: Full color or Monochrome, most color printers default to color printing unless told otherwise, non color printers either will throw an error or fallback to monochrome automatically.
    - Copies: Self explanatory, how many copies of the file to print.
    - Pages: Accepts both select pages and page ranges, the preview adjusts accordingly.

## ⚠️ Limitations

**IP Access Only:** To keep it dependency-free the dashboard can be accessed only through the exact IPv4 address of the host or through mDNS with the Host's name with a .local link. Unless you don't mind your PC being renamed into `printer` you will be using IP access, conveniently displayed in the tray menu by right clicking the icon. 

**Auto Orientation:** SumatraPDF just flips the pages of PDFs with the contents so in the end nothing changes. If feed it a properly made PDF (each page can have it's own orientation and paper size) SumatraPDF will obey and print as is in the PDF with the default settings, I know it's a hassle, but if you have a better solution you're very welcome to make it.

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
