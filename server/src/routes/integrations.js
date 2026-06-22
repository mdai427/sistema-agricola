const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

// WhatsApp send message via Twilio
router.post('/whatsapp/send', auth, async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
      return res.json({ success: false, simulated: true, message: `[SIMULADO] WhatsApp a ${to}: ${message}` });
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await twilio.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message
    });
    res.json({ success: true, sid: msg.sid });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Notify order status via WhatsApp
router.post('/whatsapp/notify-order', auth, async (req, res) => {
  try {
    const { orderId, event } = req.body;
    const prisma = require('../lib/prisma');
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order?.customer?.whatsapp) return res.json({ success: false, reason: 'Cliente sin WhatsApp' });
    const messages = {
      CONFIRMADO: `✅ Tu pedido *${order.folio}* ha sido confirmado. Total: $${parseFloat(order.total).toFixed(2)} MXN. ¡Gracias por tu compra!`,
      ENVIADO: `🚚 Tu pedido *${order.folio}* está en camino. Te avisaremos cuando sea entregado.`,
      ENTREGADO: `🎉 Tu pedido *${order.folio}* ha sido entregado. ¡Gracias por confiar en AgroMaq!`
    };
    const message = messages[event] || `Actualización de tu pedido ${order.folio}: ${event}`;
    const to = order.customer.whatsapp.replace(/\D/g, '');

    if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_twilio_sid') {
      return res.json({ success: true, simulated: true, to, message });
    }
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({ from: process.env.TWILIO_WHATSAPP_FROM, to: `whatsapp:+${to}`, body: message });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Email send via SMTP (nodemailer or simulated)
router.post('/email/send', auth, async (req, res) => {
  try {
    const { to, subject, body, orderId } = req.body;
    if (!process.env.SMTP_HOST) {
      return res.json({ success: true, simulated: true, message: `[SIMULADO] Email a ${to}: ${subject}` });
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html: body });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get integration status
router.get('/status', auth, async (req, res) => {
  res.json({
    whatsapp: { configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_twilio_sid'), provider: 'Twilio' },
    email: { configured: !!process.env.SMTP_HOST, provider: 'SMTP' },
    mercadolibre: { configured: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_ID !== 'your_ml_client_id'), provider: 'Mercado Libre API' },
    amazon: { configured: !!(process.env.AMAZON_SELLER_ID && process.env.AMAZON_SELLER_ID !== 'your_seller_id'), provider: 'Amazon SP-API' },
    calendar: { configured: !!process.env.GOOGLE_CALENDAR_KEY, provider: 'Google Calendar' }
  });
});

// Calendar events (simulated / Google Calendar)
router.get('/calendar/events', auth, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    const { from, to } = req.query;
    const where = {};
    if (from || to) where.scheduledAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    const shipments = await prisma.shipment.findMany({ where, include: { order: { include: { customer: true } } }, take: 50 });
    const events = shipments.map(s => ({
      id: s.id, title: `Entrega ${s.order?.folio} - ${s.order?.customer?.name || 'Cliente'}`,
      date: s.scheduledAt, status: s.status, assignedTo: s.assignedTo
    }));
    res.json(events);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
