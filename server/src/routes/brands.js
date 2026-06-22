const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json(brands);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: req.body });
    res.status(201).json(brand);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
