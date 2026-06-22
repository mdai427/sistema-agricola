const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const cache = require('../lib/cache');

router.get('/', auth, async (req, res) => {
  try {
    const data = await cache.wrap('catalog:brands', cache.TTL.CATALOG, () =>
      prisma.brand.findMany({ orderBy: { name: 'asc' } })
    );
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const brand = await prisma.brand.create({ data: req.body });
    await cache.del('catalog:brands');
    res.status(201).json(brand);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
