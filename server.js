const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = 3000;
const PID_FILE = path.join(__dirname, 'server.pid');

// Track PID & handle process cleanup
try { fs.writeFileSync(PID_FILE, process.pid.toString()); } catch (e) {}

function cleanupPid() {
  if (fs.existsSync(PID_FILE)) {
    try { fs.unlinkSync(PID_FILE); } catch (e) {}
  }
}

process.on('exit', cleanupPid);
process.on('SIGINT', () => { cleanupPid(); process.exit(0); });
process.on('SIGTERM', () => { cleanupPid(); process.exit(0); });

function getSumatraPath() {
  const possiblePaths = [
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    'D:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'D:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    'D:\\SumatraPDF\\SumatraPDF.exe',
    path.join(process.env.LOCALAPPDATA || '', 'SumatraPDF', 'SumatraPDF.exe'),
    path.join(__dirname, 'SumatraPDF.exe'),
    path.join(__dirname, 'bin', 'SumatraPDF.exe')
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }

  return 'SumatraPDF.exe';
}

const SUMATRA_PATH = getSumatraPath();

function safeDecode(val, fallback = '') {
  if (!val) return fallback;
  try {
    return decodeURIComponent(val);
  } catch (err) {
    return val;
  }
}

function safeUnlink(filePath, retries = 5, delay = 2000) {
  fs.unlink(filePath, (err) => {
    if (err && (err.code === 'EBUSY' || err.code === 'EPERM') && retries > 0) {
      setTimeout(() => safeUnlink(filePath, retries - 1, delay), delay);
    }
  });
}

process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTED] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH PREVENTED] Unhandled Rejection:', reason);
});

function normalizeImage(filePath, callback) {
  const psScript = `
    param([string]$Path)
    if (-not (Test-Path -Path $Path)) { return }
    Add-Type -AssemblyName System.Drawing;
    $bytes = [System.IO.File]::ReadAllBytes($Path);
    $ms = New-Object System.IO.MemoryStream(,$bytes);
    $img = [System.Drawing.Image]::FromStream($ms);
    if ($img.PropertyIdList -contains 274) {
      $val = $img.GetPropertyItem(274).Value[0];
      switch ($val) {
        2 { $img.RotateFlip('RotateNoneFlipX') }
        3 { $img.RotateFlip('Rotate180FlipNone') }
        4 { $img.RotateFlip('Rotate180FlipX') }
        5 { $img.RotateFlip('Rotate90FlipX') }
        6 { $img.RotateFlip('Rotate90FlipNone') }
        7 { $img.RotateFlip('Rotate270FlipX') }
        8 { $img.RotateFlip('Rotate270FlipNone') }
      }
      $img.RemovePropertyItem(274);
      $img.Save($Path, $img.RawFormat);
    }
    $img.Dispose();
    $ms.Dispose();
  `;

  execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', psScript, '-Path', filePath], { windowsHide: true }, (err) => {
    if (err) console.error('EXIF normalization warning:', err.message);
    callback();
  });
}

const HTML_PAGE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Network Print Station</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      padding: 12px; 
      max-width: 650px; 
      margin: 0 auto; 
      background: #121212; 
      color: #fff; 
      text-align: center; 
    }
    .card { background: #1e1e1e; padding: 18px; border-radius: 12px; border: 1px solid #333; text-align: left; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .header-row h2 { margin: 0; font-size: 20px; }
    .header-btns { display: flex; gap: 8px; }
    
    label { display: block; margin-top: 14px; font-size: 12px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
    
    input, select { 
      width: 100%; 
      padding: 12px 14px; 
      margin-top: 6px; 
      background-color: #2a2a2a; 
      color: #fff; 
      border: 1px solid #444; 
      border-radius: 8px; 
      font-size: 16px;
      outline: none;
      transition: border-color 0.2s ease;
    }

    select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007acc%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat;
      background-position: right 14px top 50%;
      background-size: 12px auto;
      padding-right: 36px;
    }

    option { background: #2a2a2a; color: #ffffff; }

    input:focus, select:focus { border-color: #007acc; }

    .row { display: flex; flex-direction: column; gap: 10px; }
    
    @media (min-width: 520px) {
      .row { flex-direction: row; gap: 12px; }
      .row > div { flex: 1; }
    }

    button { padding: 10px 14px; background: #007acc; color: white; border: none; font-size: 15px; font-weight: bold; border-radius: 8px; cursor: pointer; }
    button:active { opacity: 0.8; }
    
    .btn-control { background: #3a3a3a; color: #ccc; font-size: 12px; padding: 6px 12px; border: 1px solid #555; }
    .btn-control:hover { background: #ff9800; color: white; border-color: #ff9800; }
    
    .btn-danger { background: #3a3a3a; color: #ff6b6b; font-size: 12px; padding: 6px 12px; border: 1px solid #555; }
    .btn-danger:hover { background: #e63946; color: white; border-color: #e63946; }

    #submitBtn { width: 100%; padding: 16px; font-size: 17px; margin-top: 20px; border-radius: 8px; }
    #status { margin-top: 15px; font-size: 14px; word-break: break-word; text-align: center; }

    .drop-zone {
      border: 2px dashed #444;
      border-radius: 8px;
      padding: 18px 10px;
      text-align: center;
      background: #252525;
      cursor: pointer;
      margin-top: 6px;
    }
    .drop-zone.dragover { border-color: #007acc; background: #1a2c3a; }
    .drop-zone input[type="file"] { display: none; }
    .drop-zone-text { font-size: 14px; color: #aaa; pointer-events: none; }
    .drop-zone-text strong { color: #007acc; }

    .preview-stage {
      background: #151515;
      border: 1px solid #2a2a2a;
      border-radius: 8px;
      padding: 12px 6px;
      margin-top: 12px;
      display: none;
    }

    .paper-sheet {
      background: #e0e0e0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
      margin: 0 auto;
      display: flex;
      position: relative;
      transition: all 0.2s ease;
      padding: 6px;
      justify-content: flex-start;
      align-items: flex-start;
      overflow: hidden;
      max-width: 100%;
    }

    .paper-sheet.grayscale { filter: grayscale(100%); }

    .page-content {
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    #pdf-canvas, #imgPreview {
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: none;
    }

    .doc-info { font-size: 11px; color: #aaa; margin-top: 10px; text-align: center; }
    .nav-toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 13px; color: #aaa; }
    .nav-toolbar input { font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-row">
      <h2>Print Station</h2>
      <div class="header-btns">
        <button type="button" id="restartBtn" class="btn-control">Restart</button>
        <button type="button" id="shutdownBtn" class="btn-danger">Stop Server</button>
      </div>
    </div>
    
    <form id="printForm">
      <label>Document / Photo:</label>
      <div id="dropZone" class="drop-zone">
        <span id="dropZoneText" class="drop-zone-text">📁 Tap or Drag file here</span>
        <input type="file" id="fileInput" accept="application/pdf,image/*" required />
      </div>

      <div id="previewStage" class="preview-stage">
        <div id="paperSheet" class="paper-sheet">
          <div id="pageContent" class="page-content">
            <canvas id="pdf-canvas"></canvas>
            <img id="imgPreview" alt="Image preview" />
          </div>
        </div>
        <div id="docDimensions" class="doc-info"></div>
        
        <div id="pdfNav" class="nav-toolbar" style="display:none;">
          <button type="button" id="prevPage">Prev</button>
          <span>Page <input type="number" id="pageNumInput" value="1" min="1" style="width: 48px; display:inline-block; padding:4px 6px;"> / <span id="pageCount">1</span></span>
          <button type="button" id="nextPage">Next</button>
        </div>
      </div>

      <label>Printer:</label>
      <select id="printerName">
        <option value="">Open On Server</option>
      </select>

      <div class="row">
        <div>
          <label>Paper Size:</label>
          <select id="paperSize">
            <option value="a4" selected>A4 (210 × 297 mm)</option>
            <option value="a3">A3 (297 × 420 mm)</option>
            <option value="a5">A5 (148 × 210 mm)</option>
            <option value="letter">Letter (8.5 × 11 in)</option>
            <option value="legal">Legal (8.5 × 14 in)</option>
          </select>
        </div>
        <div>
          <label>Color Mode:</label>
          <select id="colorMode">
            <option value="color">Full Color</option>
            <option value="monochrome">Grayscale</option>
          </select>
        </div>
        <div>
          <label>Copies:</label>
          <input type="number" id="copies" value="1" min="1" />
        </div>
      </div>

      <label>Pages (e.g. 1, 3-5):</label>
      <input type="text" id="pages" placeholder="All pages" />

      <button type="submit" id="submitBtn">Print Document</button>
    </form>
    <div id="status"></div>
  </div>

  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const PAPER_SIZES = {
      'a4':     { w: 210,   h: 297,   name: 'A4' },
      'a3':     { w: 297,   h: 420,   name: 'A3' },
      'a5':     { w: 148,   h: 210,   name: 'A5' },
      'letter': { w: 215.9, h: 279.4, name: 'Letter' },
      'legal':  { w: 215.9, h: 355.6, name: 'Legal' }
    };

    const dropZone = document.getElementById('dropZone');
    const dropZoneText = document.getElementById('dropZoneText');
    const fileInput = document.getElementById('fileInput');
    const previewStage = document.getElementById('previewStage');
    const paperSheet = document.getElementById('paperSheet');
    const pageContent = document.getElementById('pageContent');
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const imgPreview = document.getElementById('imgPreview');
    const docDimensions = document.getElementById('docDimensions');
    const pdfNav = document.getElementById('pdfNav');

    const paperSizeSelect = document.getElementById('paperSize');
    const colorSelect = document.getElementById('colorMode');

    const pagesInput = document.getElementById('pages');
    const pageNumInput = document.getElementById('pageNumInput');
    const pageCountSpan = document.getElementById('pageCount');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const restartBtn = document.getElementById('restartBtn');
    const shutdownBtn = document.getElementById('shutdownBtn');

    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let selectedPages = [];
    let selectedIndex = 0;

    let docMmWidth = 210;
    let docMmHeight = 297;

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFileSelection(e.target.files[0]);
    });

    fetch('/printers')
      .then(res => res.json())
      .then(printers => {
        const select = document.getElementById('printerName');
        printers.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
      }).catch(() => {});

    colorSelect.addEventListener('change', () => {
      if (colorSelect.value === 'monochrome') paperSheet.classList.add('grayscale');
      else paperSheet.classList.remove('grayscale');
    });

    paperSizeSelect.addEventListener('change', updateLayoutPreview);

    function updateLayoutPreview() {
      if (!docMmWidth || !docMmHeight) return;

      const pKey = paperSizeSelect.value;

      if (pKey === 'a3') {
        paperSheet.style.justifyContent = 'center';
        paperSheet.style.alignItems = 'center';
      } else {
        paperSheet.style.justifyContent = 'flex-start';
        paperSheet.style.alignItems = 'flex-start';
      }

      const a4Spec = PAPER_SIZES['a4'];
      const isDocLandscape = docMmWidth > docMmHeight;
      const paperW = isDocLandscape ? a4Spec.h : a4Spec.w;
      const paperH = isDocLandscape ? a4Spec.w : a4Spec.h;

      const maxWidth = Math.min(200, window.innerWidth - 80);
      const maxHeight = Math.round(window.innerHeight * 0.30);

      let targetW = maxWidth;
      let targetH = Math.round(targetW * (paperH / paperW));

      if (targetH > maxHeight) {
        targetH = maxHeight;
        targetW = Math.round(targetH * (paperW / paperH));
      }

      paperSheet.style.width = targetW + 'px';
      paperSheet.style.height = targetH + 'px';

      const selSpec = PAPER_SIZES[pKey] || a4Spec;
      const selW = isDocLandscape ? selSpec.h : selSpec.w;
      const selH = isDocLandscape ? selSpec.w : selSpec.h;

      const scaleDocToSel = Math.min(1, selW / docMmWidth, selH / docMmHeight);
      const docOnSelW = docMmWidth * scaleDocToSel;
      const docOnSelH = docMmHeight * scaleDocToSel;

      const scaleSelToA4 = Math.min(1, paperW / selW, paperH / selH);
      const displayW = docOnSelW * scaleSelToA4;
      const displayH = docOnSelH * scaleSelToA4;

      const widthPercent = (displayW / paperW) * 100;
      const heightPercent = (displayH / paperH) * 100;

      pageContent.style.width = widthPercent + '%';
      pageContent.style.height = heightPercent + '%';

      const docLabel = Math.round(docMmWidth) + '×' + Math.round(docMmHeight) + ' mm';
      const selLabel = selSpec.name + ' (' + selW + '×' + selH + ' mm)';
      const trayLabel = 'A4 Sheet (' + paperW + '×' + paperH + ' mm)';
      docDimensions.textContent = 'Doc: ' + docLabel + ' ➔ Mode: ' + selLabel + ' ➔ Tray: ' + trayLabel;
    }

    function parsePageRange(inputStr, maxPages) {
      if (!inputStr.trim()) return Array.from({ length: maxPages }, (_, i) => i + 1);
      const pages = new Set();
      const parts = inputStr.split(',');

      for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            const min = Math.max(1, Math.min(start, end));
            const max = Math.min(maxPages, Math.max(start, end));
            for (let i = min; i <= max; i++) pages.add(i);
          }
        } else {
          const num = parseInt(part, 10);
          if (!isNaN(num) && num >= 1 && num <= maxPages) pages.add(num);
        }
      }
      const sorted = Array.from(pages).sort((a, b) => a - b);
      return sorted.length > 0 ? sorted : Array.from({ length: maxPages }, (_, i) => i + 1);
    }

    function renderPage(num) {
      pageRendering = true;
      pdfDoc.getPage(num).then(page => {
        const unscaled = page.getViewport({ scale: 1.0 });

        docMmWidth = unscaled.width * 0.352778;
        docMmHeight = unscaled.height * 0.352778;

        const viewport = page.getViewport({ scale: 2.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        updateLayoutPreview();

        page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
          pageRendering = false;
          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });
      pageNumInput.value = num;
    }

    function queueRenderPage(num) {
      if (pageRendering) pageNumPending = num;
      else renderPage(num);
    }

    function renderSelectedPage() {
      if (!selectedPages.length) return;
      pageNum = selectedPages[selectedIndex];
      queueRenderPage(pageNum);
    }

    function updatePageFilter() {
      if (!pdfDoc) return;
      selectedPages = parsePageRange(pagesInput.value, pdfDoc.numPages);
      selectedIndex = 0;
      pageCountSpan.textContent = selectedPages.length;
      renderSelectedPage();
    }

    prevBtn.addEventListener('click', () => {
      if (selectedIndex > 0) {
        selectedIndex--;
        renderSelectedPage();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (selectedIndex < selectedPages.length - 1) {
        selectedIndex++;
        renderSelectedPage();
      }
    });

    pageNumInput.addEventListener('change', () => {
      const target = parseInt(pageNumInput.value, 10);
      const foundIdx = selectedPages.indexOf(target);
      if (foundIdx !== -1) {
        selectedIndex = foundIdx;
        renderSelectedPage();
      } else pageNumInput.value = pageNum;
    });

    pagesInput.addEventListener('input', updatePageFilter);

    function handleFileSelection(file) {
      canvas.style.display = 'none';
      imgPreview.style.display = 'none';
      pdfNav.style.display = 'none';
      previewStage.style.display = 'none';

      if (!file) {
        dropZoneText.innerHTML = '📁 Tap or Drag file here';
        return;
      }

      dropZoneText.innerHTML = '📄 Selected: <strong>' + file.name + '</strong>';
      previewStage.style.display = 'block';

      if (file.type.startsWith('image/')) {
        const imgUrl = URL.createObjectURL(file);
        imgPreview.src = imgUrl;
        imgPreview.style.display = 'block';
        
        const img = new Image();
        img.onload = () => {
          docMmWidth = (img.naturalWidth / 96) * 25.4;
          docMmHeight = (img.naturalHeight / 96) * 25.4;
          updateLayoutPreview();
        };
        img.src = imgUrl;
      } else if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = function() {
          pdfjsLib.getDocument(new Uint8Array(this.result)).promise.then(pdf => {
            pdfDoc = pdf;
            canvas.style.display = 'block';
            pdfNav.style.display = 'flex';
            updatePageFilter();
          });
        };
        reader.readAsArrayBuffer(file);
      }
    }

    restartBtn.addEventListener('click', async () => {
      if (!confirm('Restart print server?')) return;
      const status = document.getElementById('status');
      status.style.color = '#ff9800';
      status.textContent = 'Restarting...';

      try { await fetch('/restart', { method: 'POST' }); } catch (err) {}
      setTimeout(() => location.reload(), 2000);
    });

    shutdownBtn.addEventListener('click', async () => {
      if (!confirm('Turn off print station server completely?')) return;
      const status = document.getElementById('status');
      status.style.color = '#e63946';
      status.textContent = 'Shutting down server...';

      try { await fetch('/shutdown', { method: 'POST' }); } catch (err) {}

      setTimeout(() => {
        document.body.innerHTML = \`
          <div class="card" style="text-align: center; margin-top: 60px;">
            <h2 style="color: #e63946;">Print Station Offline</h2>
            <p style="color: #aaa; margin-top: 10px;">The Node.js server process was stopped cleanly. You can close this tab.</p>
          </div>\`;
      }, 300);
    });

    document.getElementById('printForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = document.getElementById('status');
      if (!fileInput.files[0]) return;

      status.textContent = 'Sending job...';
      const file = fileInput.files[0];

      try {
        const res = await fetch('/upload-and-print', {
          method: 'POST',
          headers: {
            'x-file-name': encodeURIComponent(file.name),
            'x-printer-name': encodeURIComponent(document.getElementById('printerName').value.trim()),
            'x-color-mode': encodeURIComponent(colorSelect.value),
            'x-paper-size': encodeURIComponent(paperSizeSelect.value),
            'x-pages': encodeURIComponent(pagesInput.value.trim()),
            'x-copies': document.getElementById('copies').value
          },
          body: file
        });

        const data = await res.json();
        if (res.ok) {
          status.style.color = '#4caf50';
          status.textContent = 'Printed successfully!';
        } else {
          status.style.color = '#f44336';
          status.textContent = 'Error: ' + (data.error || 'Printing failed');
        }
      } catch (err) {
        status.style.color = '#f44336';
        status.textContent = 'Network error: ' + err.message;
      }
    });
  </script>
  <footer style="margin-top: 2rem; padding: 1.5rem 1rem; text-align: center; border-top: 1px solid #333; opacity: 0.8; font-size: 0.85rem; font-family: monospace;">
  <div style="margin-bottom: 0.5rem;">
    <a href="https://www.kopimi.com/" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">
      <img src="https://kopimi.com/badges/c_mini_34.gif" alt="Kopimi Logo" style="height: 24px; vertical-align: middle; margin-right: 6px;">2026
    </a> &mdash; All media wants to be free.
  </div>
  <p style="margin: 0; line-height: 1.4;">
    Licensed under <a href="http://www.wtfpl.net/txt/copying/" target="_blank" rel="noopener" style="color: inherit; text-decoration: underline;">WTFPL</a> &mdash; Do What The Fuck You Want To Public License.
  </p>
</footer>
</body>
</html>
`;

function startServer() {
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(HTML_PAGE);
    }

    if (req.method === 'POST' && pathname === '/shutdown') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'shutting_down' }));

      setTimeout(() => {
        console.log('\n[SHUTDOWN] Server termination requested via UI.\n');
        for (const socket of sockets) socket.destroy();
        sockets.clear();
        cleanupPid();
        process.exit(0);
      }, 300);
      return;
    }

    if (req.method === 'POST' && pathname === '/restart') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'restarting' }));

      setTimeout(() => {
        console.log('\n[RESTART] Reloading server listener in-process...\n');
        for (const socket of sockets) socket.destroy();
        sockets.clear();
        server.close(() => startServer());
      }, 200);
      return;
    }

    if (req.method === 'GET' && pathname === '/printers') {
      execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name'], { windowsHide: true, maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify([]));
        }
        const printers = stdout.split('\r\n').map(p => p.trim()).filter(Boolean);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(printers));
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/upload-and-print') {
      const fileName = safeDecode(req.headers['x-file-name'], 'document.pdf');
      const printerName = safeDecode(req.headers['x-printer-name'], '');
      const colorMode = safeDecode(req.headers['x-color-mode'], 'color');
      const paperSize = safeDecode(req.headers['x-paper-size'], '');
      const pages = safeDecode(req.headers['x-pages'], '');
      const copies = Math.max(1, parseInt(req.headers['x-copies'] || '1', 10) || 1);

      const tempFilePath = path.join(os.tmpdir(), `print_${Date.now()}_${path.basename(fileName)}`);
      const fileStream = fs.createWriteStream(tempFilePath);

      req.on('error', (err) => {
        console.error('Request stream error:', err.message);
        safeUnlink(tempFilePath);
      });

      fileStream.on('error', (err) => {
        console.error('File stream error:', err.message);
        safeUnlink(tempFilePath);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File write error' }));
        }
      });

      req.pipe(fileStream);

      fileStream.on('finish', () => {
        const ext = path.extname(tempFilePath).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'].includes(ext);

        const executePrint = () => {
          const args = ['-silent'];

          if (printerName && printerName.trim()) {
            args.push('-print-to', printerName.trim());
          } else {
            args.push('-print-default');
          }

          const settings = [];
          if (copies > 1) settings.push(`${copies}x`);
          if (pages) settings.push(pages);
          if (colorMode) settings.push(colorMode);
          if (paperSize) settings.push(`paper=${paperSize}`);

          if (settings.length > 0) {
            args.push('-print-settings', settings.join(','));
          }
          args.push(tempFilePath);

          execFile(SUMATRA_PATH, args, { windowsHide: true }, (err, stdout, stderr) => {
            safeUnlink(tempFilePath);

            if (err) {
              console.error('Print Error:', err || stderr);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: stderr || err.message }));
              }
              return;
            }

            if (!res.headersSent) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'ok', output: stdout }));
            }
          });
        };

        if (isImage) {
          normalizeImage(tempFilePath, executePrint);
        } else {
          executePrint();
        }
      });

      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  server.listen(PORT, '0.0.0.0', () => {
    const hostname = os.hostname();
    const interfaces = os.networkInterfaces();
    let localIP = '127.0.0.1';

    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
          break;
        }
      }
    }

    console.log('========================================');
    console.log('        PRINT STATION IS LIVE');
    console.log('========================================');
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${localIP}:${PORT}`);
    console.log(`  mDNS:    http://${hostname}.local:${PORT}`);
    console.log('========================================\n');
  });
}

startServer();