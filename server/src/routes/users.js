const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { ...data, password: hashed }, select: { id: true, name: true, email: true, role: true, active: true } });
    res.status(201).json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const updateData = { ...data };
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: updateData, select: { id: true, name: true, email: true, role: true, active: true } });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
