const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const generateFolio = async () => {
  const count = await prisma.purchaseOrder.count();
  return `OC-${String(count + 1).padStart(6, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
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
