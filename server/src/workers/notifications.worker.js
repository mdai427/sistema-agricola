const { Worker } = require('bullmq');
const { connection } = require('../lib/queues');
const prisma = require('../lib/prisma');

if (!connection) {
  console.warn('[worker:notifications] Redis not available — worker not started');
  module.exports = null;
  return;
}

const worker = new Worker('notifications', async (job) => {
  const { name, data } = job;

  if (name === 'whatsapp') {
    const { to, message } = data;
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
      console.log(`[worker:notifications] SIMULADO WhatsApp → ${to}: ${message}`);
      return { simulated: true };
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await twilio.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    return { sid: msg.sid };
  }

  if (name === 'whatsapp-order') {
    const { orderId, event } = data;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order?.customer?.whatsapp) return { skipped: 'no-whatsapp' };

    const templates = {
      CONFIRMADO: `✅ Tu pedido *${order.folio}* ha sido confirmado. Total: $${parseFloat(order.total).toFixed(2)} MXN.`,
      ENVIADO:    `🚚 Tu pedido *${order.folio}* está en camino.`,
      ENTREGADO:  `🎉 Tu pedido *${order.folio}* fue entregado. ¡Gracias!`,
    };
    const message = templates[event] || `Actualización del pedido ${order.folio}: ${event}`;
    const to = `+${order.customer.whatsapp.replace(/\D/g, '')}`;

    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
      console.log(`[worker:notifications] SIMULADO WhatsApp-order → ${to}: ${message}`);
      return { simulated: true };
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: `whatsapp:${to}`, body: message });
    return { ok: true };
  }

  if (name === 'email') {
    const { to, subject, body } = data;
    if (!process.env.SMTP_HOST) {
      console.log(`[worker:notifications] SIMULADO Email → ${to}: ${subject}`);
      return { simulated: true };
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html: body });
    return { ok: true };
  }

  throw new Error(`Unknown notification job: ${name}`);
}, {
  connection,
  concurrency: 5,
});

worker.on('failed', (job, err) => console.error(`[worker:notifications] job ${job?.id} failed:`, err.message));
worker.on('completed', (job) => console.log(`[worker:notifications] job ${job.id} (${job.name}) done`));

module.exports = worker;
