const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    res.json(suppliers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json(supplier);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body });
    res.json(supplier);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
