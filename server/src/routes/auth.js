const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) return res.status(401).json({ error: 'Credenciales inválidas' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
});

router.get('/company', auth, async (req, res) => {
  try {
    const company = await prisma.company.findFirst();
    res.json(company || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/company', auth, async (req, res) => {
  try {
    const { finkocPassword, ...data } = req.body;
    const company = await prisma.company.findFirst();
    const updateData = { ...data };
    // Only update password if provided
    if (finkocPassword && finkocPassword.trim()) updateData.finkocPassword = finkocPassword;
    if (company) {
      const updated = await prisma.company.update({ where: { id: company.id }, data: updateData });
      res.json(updated);
    } else {
      const created = await prisma.company.create({ data: updateData });
      res.json(created);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
