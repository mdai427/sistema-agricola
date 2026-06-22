const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const cache = require('../lib/cache');

router.get('/', auth, async (req, res) => {
  try {
    const data = await cache.wrap('catalog:categories', cache.TTL.CATALOG, () =>
      prisma.category.findMany({
        include: { children: true, _count: { select: { products: true } } },
        where: { parentId: null },
        orderBy: { name: 'asc' }
      })
    );
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    await cache.del('catalog:categories');
    res.status(201).json(category);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const category = await prisma.category.update({ where: { id: req.params.id }, data: req.body });
    await cache.del('catalog:categories');
    res.json(category);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
