const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const cache = require('../lib/cache');

const invalidateOrderCaches = () => cache.del('dashboard:main', 'alerts:main');

const generateFolio = async () => {
  const count = await prisma.order.count();
  return `VTA-${String(count + 1).padStart(6, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, channel, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ folio: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }];
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        include: { customer: true, user: { select: { name: true } }, items: { include: { product: true } }, shipment: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, user: { select: { name: true } }, items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } }, shipment: true, payments: true }
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const folio = await generateFolio();
    const order = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...data, folio, userId: req.user.id,
          subtotal: parseFloat(data.subtotal),
          discount: parseFloat(data.discount || 0),
          tax: parseFloat(data.tax || 0),
          total: parseFloat(data.total),
          paidAmount: parseFloat(data.paidAmount || 0),
          items: { create: items.map(i => ({ ...i, price: parseFloat(i.price), discount: parseFloat(i.discount || 0), subtotal: parseFloat(i.subtotal) })) }
        },
        include: { items: { include: { product: true } }, customer: true }
      });
      return order;
    });
    invalidateOrderCaches();
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { status }, include: { customer: true } });
    invalidateOrderCaches();
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
