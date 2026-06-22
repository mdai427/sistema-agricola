const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ include: { branch: true }, where: { active: true } });
    res.json(warehouses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const warehouse = await prisma.warehouse.create({ data: req.body, include: { branch: true } });
    res.status(201).json(warehouse);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
