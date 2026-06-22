const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/sales', auth, async (req, res) => {
  try {
    const { from, to, channel, userId } = req.query;
    const where = { status: { notIn: ['CANCELADO', 'DEVOLUCION'] } };
    if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    if (channel) where.channel = channel;
    if (userId) where.userId = userId;
    const orders = await prisma.order.findMany({ where, include: { customer: true, user: { select: { name: true } }, items: { include: { product: { include: { category: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/inventory', auth, async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: { product: { include: { category: true, brand: true } }, warehouse: true },
      orderBy: { product: { name: 'asc' } }
    });
    const withValue = stocks.map(s => ({ ...s, totalValue: parseFloat(s.product.costPrice) * s.quantity }));
    res.json(withValue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
