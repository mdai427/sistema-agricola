const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const cache = require('../lib/cache');

// GET company data (public for PDF generation)
router.get('/company', auth, async (req, res) => {
  try {
    const company = await cache.wrap('config:company', 300, () => prisma.company.findFirst())
    res.json(company)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PATCH company data
router.patch('/company', auth, async (req, res) => {
  try {
    const existing = await prisma.company.findFirst()
    let company
    if (existing) {
      company = await prisma.company.update({ where: { id: existing.id }, data: req.body })
    } else {
      company = await prisma.company.create({ data: req.body })
    }
    await cache.del('config:company')
    res.json(company)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
