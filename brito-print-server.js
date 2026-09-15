const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = 9191;
const PRINTER_NAME = 'POS-58';

function formatTicketText(data) {
  const line = (str = '') => str + '\r\n';
  const divider = () => '--------------------------------\r\n';
  const doubleDivider = () => '================================\r\n';
  const center = (text, width = 32) => {
    if (text.length >= width) return text.slice(0, width) + '\r\n';
    const left = Math.floor((width - text.length) / 2);
    return ' '.repeat(left) + text + '\r\n';
  };
  const row = (left, right, width = 32) => {
    const l = String(left);
    const r = String(right);
    const spaces = Math.max(1, width - l.length - r.length);
    return l + ' '.repeat(spaces) + r + '\r\n';
  };

  let out = '';
  out += center('PANADERIAS BRITO');
  out += center('Tradicion & Sabor Familiar');
  if (data.branchName) out += center(data.branchName);
  if (data.branchAddress) out += center(data.branchAddress);
  if (data.branchPhone) out += center(data.branchPhone);
  out += divider();

  out += row('FOLIO: #' + (data.folio || '000000'), '');
  out += row('FECHA:', data.date || new Date().toLocaleString('es-MX'));
  out += row('CLIENTE:', (data.customerName || 'Publico en General').slice(0, 20));
  if (data.customerType && data.customerType !== 'general') {
    out += row('TIPO CLIENTE:', '[' + data.customerType.toUpperCase() + ']');
  }
  out += row('ATENDIO:', (data.cashier || 'Don Tono Brito').slice(0, 20));
  out += row('PAGO:', '[ ' + (data.paymentMethod || 'EFECTIVO').toUpperCase() + ' ]');
  if (data.transferAccount) {
    out += row('CUENTA DEP:', data.transferAccount.slice(0, 19));
  }
  out += divider();

  out += row('CANT / PRODUCTO', 'IMPORTE');
  out += divider();

  if (Array.isArray(data.items)) {
    let totalPieces = 0;
    for (const item of data.items) {
      const qty = item.quantity || 1;
      totalPieces += qty;
      const name = item.name || 'Producto';
      const subtotal = '$' + Number(item.subtotal || (item.price * qty) || 0).toFixed(2);
      
      const prefix = qty + 'x ' + name;
      if (prefix.length + subtotal.length >= 31) {
        out += line(prefix);
        out += row('', subtotal);
      } else {
        out += row(prefix, subtotal);
      }
    }
    out += divider();
    out += row('Total de piezas:', totalPieces + ' pzas');
  }

  out += doubleDivider();
  out += row('TOTAL A PAGAR:', '$' + Number(data.total || 0).toFixed(2));
  if (data.cashGiven !== undefined && data.cashGiven !== null && data.cashGiven !== '') {
    out += row('Efectivo recibido:', '$' + Number(data.cashGiven || 0).toFixed(2));
    out += row('SU CAMBIO:', '$' + Number(data.change || 0).toFixed(2));
  }
  out += doubleDivider();

  out += line('');
  out += center('GRACIAS POR SU PREFERENCIA!');
  out += center('Horneado artesanal con amor');
  out += center('Panaderias Brito');
  out += line('');
  out += line('');
  out += line('');

  return out;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ready', printer: PRINTER_NAME }));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const formatted = formatTicketText(data);

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, 'ticket_' + Date.now() + '.txt');
        fs.writeFileSync(tempFile, formatted, 'latin1');

        const cmd = 'powershell -NoProfile -Command "Get-Content -Encoding OEM \'' + tempFile + '\' | Out-Printer -Name \'' + PRINTER_NAME + '\'"';

        exec(cmd, (err) => {
          if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (e) {}
          }

          if (err) {
            console.error('Error enviando a impresora:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          } else {
            console.log('[+] Ticket impreso directamente en ' + PRINTER_NAME + ' para Folio: ' + (data.folio || 'N/A'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Ticket impreso en ' + PRINTER_NAME }));
          }
        });
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: parseErr.message }));
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
