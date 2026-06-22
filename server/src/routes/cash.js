const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/registers', auth, async (req, res) => {
  try {
    const registers = await prisma.cashRegister.findMany({
      include: { user: { select: { name: true } }, expenses: true },
      orderBy: { openedAt: 'desc' },
      take: 30
    });
    res.json(registers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/open', auth, async (req, res) => {
  try {
    const { openAmount, branchId, notes } = req.body;
    const register = await prisma.cashRegister.create({
      data: { userId: req.user.id, branchId, openAmount: parseFloat(openAmount), notes }
    });
    res.status(201).json(register);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/close', auth, async (req, res) => {
  try {
    const { closeAmount, notes } = req.body;
    const register = await prisma.cashRegister.update({
      where: { id: req.params.id },
      data: { closeAmount: parseFloat(closeAmount), closedAt: new Date(), notes }
    });
    res.json(register);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/expense', auth, async (req, res) => {
  try {
    const expense = await prisma.expense.create({ data: { ...req.body, amount: parseFloat(req.body.amount) } });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
