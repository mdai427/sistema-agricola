const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const XLSX = require('xlsx');
const { enqueue } = require('../lib/queues');

// Helper: build date where clause
const dateWhere = (from, to) => {
  if (!from && !to) return undefined;
  return { gte: from ? new Date(from) : undefined, lte: to ? new Date(to + 'T23:59:59') : undefined };
};

// Sales summary + charts data
router.get('/sales', auth, async (req, res) => {
  try {
    const { from, to, page = 1, limit = 200 } = req.query;
    const createdAt = dateWhere(from, to);
    const where = { status: { notIn: ['CANCELADO'] }, ...(createdAt && { createdAt }) };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        include: { customer: true, user: { select: { name: true } }, items: { include: { product: { include: { category: true } } } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);

    // By channel
    const byChannel = {};
    // By day
    const byDay = {};
    // By category
    const byCategory = {};
    // By product
    const byProduct = {};

    for (const o of orders) {
      const ch = o.channel || 'TIENDA_FISICA';
      byChannel[ch] = byChannel[ch] || { channel: ch, total: 0, count: 0 };
      byChannel[ch].total += parseFloat(o.total || 0);
      byChannel[ch].count += 1;

      const day = new Date(o.createdAt).toISOString().split('T')[0];
      byDay[day] = byDay[day] || { date: day, total: 0, count: 0 };
      byDay[day].total += parseFloat(o.total || 0);
      byDay[day].count += 1;

      for (const item of o.items) {
        const cat = item.product?.category?.name || 'Sin categoría';
        byCategory[cat] = byCategory[cat] || { category: cat, total: 0, qty: 0 };
        byCategory[cat].total += parseFloat(item.subtotal || 0);
        byCategory[cat].qty += item.quantity;

        const prod = item.product?.name || 'Desconocido';
        byProduct[prod] = byProduct[prod] || { product: prod, sku: item.product?.sku, total: 0, qty: 0 };
        byProduct[prod].total += parseFloat(item.subtotal || 0);
        byProduct[prod].qty += item.quantity;
      }
    }

    const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
    const totalOrders = orders.length;

    res.json({
      orders,
      totalRevenue,
      totalOrders,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      byChannel: Object.values(byChannel),
      byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
      byProduct: Object.values(byProduct).sort((a, b) => b.total - a.total).slice(0, 20),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Inventory report
router.get('/inventory', auth, async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: { product: { include: { category: true, brand: true, images: { where: { isPrimary: true } } } }, warehouse: true },
      orderBy: { product: { name: 'asc' } }
    });
    const withValue = stocks.map(s => ({
      ...s,
      totalCostValue: parseFloat(s.product.costPrice) * s.quantity,
      totalSaleValue: parseFloat(s.product.salePrice) * s.quantity,
    }));
    res.json(withValue);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Quotes report
router.get('/quotes', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const createdAt = dateWhere(from, to);
    const quotes = await prisma.quote.findMany({
      where: createdAt ? { createdAt } : {},
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const byStatus = {};
    for (const q of quotes) {
      byStatus[q.status] = (byStatus[q.status] || 0) + 1;
    }
    res.json({
      quotes,
      total: quotes.length,
      totalValue: quotes.reduce((s, q) => s + parseFloat(q.total || 0), 0),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      conversionRate: quotes.length ? ((quotes.filter(q => q.converted).length / quotes.length) * 100).toFixed(1) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export sales to Excel — async job, returns jobId for polling
router.post('/export/sales', auth, async (req, res) => {
  try {
    const { from, to } = req.body;
    const { jobId, mode } = await enqueue('reports', 'export-sales', { from, to, requestedBy: req.user.id });
    res.status(202).json({ queued: true, jobId, mode, pollUrl: `/api/jobs/reports/${jobId}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export inventory to Excel — async job
router.post('/export/inventory', auth, async (req, res) => {
  try {
    const { jobId, mode } = await enqueue('reports', 'export-inventory', { requestedBy: req.user.id });
    res.status(202).json({ queued: true, jobId, mode, pollUrl: `/api/jobs/reports/${jobId}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
