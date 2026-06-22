const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const generateFolio = async () => {
  const count = await prisma.quote.count();
  return `COT-${String(count + 1).padStart(6, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ folio: { contains: search, mode: 'insensitive' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({ where, skip, take: parseInt(limit), include: { customer: true, items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.quote.count({ where })
    ]);
    res.json({ quotes, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const folio = await generateFolio();
    const quote = await prisma.quote.create({
      data: {
        ...data, folio, userId: req.user.id,
        subtotal: parseFloat(data.subtotal),
        discount: parseFloat(data.discount || 0),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        items: { create: items.map(i => ({ ...i, price: parseFloat(i.price), discount: parseFloat(i.discount || 0), subtotal: parseFloat(i.subtotal) })) }
      },
      include: { customer: true, items: { include: { product: true } } }
    });
    res.status(201).json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (quote.converted) return res.status(400).json({ error: 'Ya fue convertida' });
    const count = await prisma.order.count();
    const folio = `VTA-${String(count + 1).padStart(6, '0')}`;
    const order = await prisma.order.create({
      data: {
        folio, channel: 'TIENDA_FISICA', status: 'CONFIRMADO',
        customerId: quote.customerId, userId: req.user.id,
        paymentMethod: 'EFECTIVO',
        subtotal: quote.subtotal, discount: quote.discount, tax: quote.tax, total: quote.total, paidAmount: 0,
        items: { create: quote.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, discount: i.discount, subtotal: i.subtotal })) }
      },
      include: { items: true }
    });
    await prisma.quote.update({ where: { id: req.params.id }, data: { converted: true, orderId: order.id } });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
