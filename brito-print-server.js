const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = 9191;
let cachedPrinter = 'POS-58';

function formatTicketText(data) {
  // Ancho exacto para papel térmico de 58mm: 28 caracteres por línea para evitar cortes laterales
  const W = 28;
  const line = (str = '') => str + '\r\n';
  const divider = () => '----------------------------\r\n';
  const doubleDivider = () => '============================\r\n';
  const center = (text, width = W) => {
    const t = String(text || '').slice(0, width);
    if (t.length >= width) return t + '\r\n';
    const left = Math.floor((width - t.length) / 2);
    return ' '.repeat(left) + t + '\r\n';
  };
  const row = (left, right, width = W) => {
    const r = String(right || '');
    const maxL = Math.max(1, width - r.length - 1);
    const l = String(left || '').slice(0, maxL);
    const spaces = Math.max(1, width - l.length - r.length);
    return l + ' '.repeat(spaces) + r + '\r\n';
  };

  let out = '';
  out += center('PANADERIAS BRITO');
  out += center('Tradicion & Sabor');
  if (data.branchName) out += center(data.branchName);
  if (data.branchPhone) out += center('Tel: ' + data.branchPhone);
  out += divider();

  out += row('FOLIO: #' + (data.folio || '000000'), '');
  out += row('FECHA:', String(data.date || new Date().toLocaleTimeString('es-MX')).slice(0, 18));
  out += row('CLIENTE:', String(data.customerName || 'General').slice(0, 18));
  out += row('ATENDIO:', String(data.cashier || 'Don Tono').slice(0, 18));
  out += row('PAGO:', '[ ' + String(data.paymentMethod || 'EFECTIVO').toUpperCase() + ' ]');
  out += divider();

  out += row('CANT/PRODUCTO', 'IMPORTE');
  out += divider();

  if (Array.isArray(data.items)) {
    let totalPieces = 0;
    for (const item of data.items) {
      const qty = item.quantity || 1;
      totalPieces += qty;
      const name = item.name || 'Producto';
      const subtotal = '$' + Number(item.subtotal || (item.price * qty) || 0).toFixed(2);
      
      const prefix = qty + 'x ' + name;
      if (prefix.length + subtotal.length >= 27) {
        out += line(prefix.slice(0, 27));
        out += row('', subtotal);
      } else {
        out += row(prefix, subtotal);
      }
    }
    out += divider();
    out += row('Total piezas:', totalPieces + ' pzas');
  }

  out += doubleDivider();
  out += row('TOTAL:', '$' + Number(data.total || 0).toFixed(2));
  if (data.cashGiven !== undefined && data.cashGiven !== null && data.cashGiven !== '') {
    out += row('Efectivo:', '$' + Number(data.cashGiven || 0).toFixed(2));
    out += row('SU CAMBIO:', '$' + Number(data.change || 0).toFixed(2));
  }
  out += doubleDivider();

  out += center('GRACIAS POR SU COMPRA!');
  out += center('Panaderias Brito');
  out += line('');
  out += line('');

  return out;
}

function detectPrinter(preferredName) {
  return new Promise((resolve) => {
    const psScript = `
      $all = Get-Printer -ErrorAction SilentlyContinue;
      if (-not $all) { exit 1 }
      $pref = '${(preferredName || '').replace(/'/g, "''")}';
      if ($pref) {
        $found = $all | Where-Object { $_.Name -eq $pref };
        if ($found) { ($found | Select-Object -First 1).Name; exit 0 }
      }
      $pos = $all | Where-Object { $_.Name -like '*POS*' -or $_.Name -like '*58*' -or $_.Name -like '*Thermal*' };
      if ($pos) { ($pos | Select-Object -First 1).Name; exit 0 }
      $def = $all | Where-Object { $_.Default -eq $true };
      if ($def) { ($def | Select-Object -First 1).Name; exit 0 }
      ($all | Select-Object -First 1).Name
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function refreshPrinterCache() {
  detectPrinter().then(p => {
    if (p) {
      cachedPrinter = p;
    }
  }).catch(() => {});
}

refreshPrinterCache();
setInterval(refreshPrinterCache, 30000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/status' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ready', 
      printerDetected: Boolean(cachedPrinter),
      printer: cachedPrinter || 'POS-58',
      message: 'Impresora lista'
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const printerName = data.printerName || cachedPrinter || 'POS-58';

        const formatted = formatTicketText(data);
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'ticket_' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, formatted, 'latin1');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          printer: printerName,
          message: 'Ticket enviado a ' + printerName 
        }));

        const cmd = `powershell -NoProfile -Command "Get-Content -Encoding OEM '${tempFile}' | Out-Printer -Name '${printerName}'"`;
        exec(cmd, (err) => {
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (e) {}
          }
          if (err) {
            console.error('[-] Error enviando a impresora ' + printerName + ':', err);
          } else {
            console.log('[+] Ticket impreso con éxito en ' + printerName + ' para Folio: ' + (data.folio || 'N/A'));
          }
        });
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Datos de ticket inválidos' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Servicio de impresion directa Panaderias Brito activo en http://127.0.0.1:' + PORT);
});
