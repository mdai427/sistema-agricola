const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { status, assignedTo, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (date) { const d = new Date(date); const next = new Date(d); next.setDate(next.getDate() + 1); where.scheduledAt = { gte: d, lt: next }; }
    const shipments = await prisma.shipment.findMany({
      where, include: { order: { include: { customer: true, items: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(shipments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const shipment = await prisma.shipment.create({ data: req.body, include: { order: { include: { customer: true } } } });
    res.status(201).json(shipment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const shipment = await prisma.shipment.update({ where: { id: req.params.id }, data: req.body, include: { order: { include: { customer: true } } } });
    res.json(shipment);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
