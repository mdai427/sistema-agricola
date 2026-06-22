const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { rfc: { contains: search, mode: 'insensitive' } }];
    if (type) where.type = type;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: parseInt(limit), orderBy: { name: 'asc' } }),
      prisma.customer.count({ where })
    ]);
    res.json({ customers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { orders: { take: 10, orderBy: { createdAt: 'desc' }, include: { items: true } } }
    });
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.create({ data: req.body });
    res.status(201).json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
