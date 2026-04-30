const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const cron = require('node-cron');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

let qrImageUrl = null;
let botListo = false;

const HERMANOS = {
  Micaela:   process.env.NUM_MICAELA   || '549XXXXXXXXXX',
  Benjamin:  process.env.NUM_BENJAMIN  || '549XXXXXXXXXX',
  Florencia: process.env.NUM_FLORENCIA || '549XXXXXXXXXX',
};

const TURNO_POR_DIA = {
  0: null,
  1: 'Benjamin',
  2: 'Florencia',
  3: 'Micaela',
  4: 'Benjamin',
  5: 'Florencia',
  6: 'Micaela',
};

const MENSAJES = {
  manana: (n) => 'Buenos dias ' + n + '! Recorda que hoy te toca lavar los platos.',
  tarde:  (n) => 'Buenas tardes ' + n + '! No olvides que los platos de hoy son tu responsabilidad.',
  noche:  (n) => 'Buenas noches ' + n + '! Antes de dormir... ya lavaste los platos?',
};

app.get('/', async (req, res) => {
  if (botListo) {
    return res.send('<h2>Bot conectado y funcionando</h2>');
  }
  if (qrImageUrl) {
    return res.send('<html><body style="text-align:center;font-family:sans-serif"><h2>Escaneá este QR con WhatsApp</h2><img src="' + qrImageUrl + '" style="width:300px"/><p>Actualizá la página si el QR expiró</p></body></html>');
  }
  res.send('<h2>Iniciando bot, actualizá en unos segundos...</h2>');
});

app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', async (qr) => {
  qrcode.generate(qr, { small: true });
  qrImageUrl = await QRCode.toDataURL(qr);
  console.log('QR listo en el navegador');
});

client.on('ready', () => {
  botListo = true;
  qrImageUrl = null;
  console.log('Bot conectado y listo!');
  iniciarRecordatorios();
});

async function enviarRecordatorio(momento) {
  const hoy = new Date().getDay();
  const nombre = TURNO_POR_DIA[hoy];
  if (!nombre) return;
  const mensaje = MENSAJES[momento](nombre);
  try {
    await client.sendMessage(HERMANOS[nombre] + '@c.us', mensaje);
    console.log('Mensaje enviado a ' + nombre);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

function iniciarRecordatorios() {
  cron.schedule('30 10 * * *',  () => enviarRecordatorio('manana'), { timezone: 'America/Argentina/Buenos_Aires' });
  cron.schedule('0 13 * * *', () => enviarRecordatorio('tarde'),  { timezone: 'America/Argentina/Buenos_Aires' });
  cron.schedule('0 21 * * *', () => enviarRecordatorio('noche'),  { timezone: 'America/Argentina/Buenos_Aires' });
  console.log('Recordatorios programados.');
}

client.initialize();
