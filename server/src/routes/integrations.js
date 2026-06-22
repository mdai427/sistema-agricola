const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { enqueue } = require('../lib/queues');

// WhatsApp send message — fire and forget via queue
router.post('/whatsapp/send', auth, async (req, res) => {
  try {
    const { to, message } = req.body;
    const { jobId, mode } = await enqueue('notifications', 'whatsapp', { to, message });
    res.json({ queued: true, jobId, mode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Notify order status via WhatsApp — fire and forget
router.post('/whatsapp/notify-order', auth, async (req, res) => {
  try {
    const { orderId, event } = req.body;
    const { jobId, mode } = await enqueue('notifications', 'whatsapp-order', { orderId, event });
    res.json({ queued: true, jobId, mode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Email send — queued
router.post('/email/send', auth, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const { jobId, mode } = await enqueue('notifications', 'email', { to, subject, body });
    res.json({ queued: true, jobId, mode });
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
