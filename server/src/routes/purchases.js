const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const generateFolio = async () => {
  const count = await prisma.purchaseOrder.count();
  return `OC-${String(count + 1).padStart(6, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, supplierId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where, skip, take: parseInt(limit),
        include: { supplier: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchaseOrder.count({ where })
    ]);
    const pages = Math.ceil(total / parseInt(limit));
    res.json({ purchases: orders, total, pages });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const folio = await generateFolio();
    const order = await prisma.purchaseOrder.create({
      data: {
        ...data, folio,
        subtotal: parseFloat(data.subtotal),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        items: { create: items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), unitCost: parseFloat(i.unitCost), subtotal: parseFloat(i.subtotal) })) }
      },
      include: { supplier: true, items: { include: { product: true } } }
    });
    res.status(201).json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
