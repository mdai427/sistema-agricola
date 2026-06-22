const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todaySales, monthSales, pendingOrders, lowStockItems,
      pendingDeliveries, topProducts, salesByChannel
    ] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: today, lt: tomorrow }, status: { notIn: ['CANCELADO', 'DEVOLUCION'] } }, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({ where: { createdAt: { gte: firstOfMonth }, status: { notIn: ['CANCELADO', 'DEVOLUCION'] } }, _sum: { total: true }, _count: true }),
      prisma.order.count({ where: { status: { in: ['NUEVO', 'CONFIRMADO', 'EN_PREPARACION'] } } }),
      prisma.stock.findMany({ where: { product: { status: 'ACTIVO' } }, include: { product: { select: { name: true, sku: true, minStock: true } }, warehouse: { select: { name: true } } } }).then(stocks => stocks.filter(s => s.quantity <= s.product.minStock).slice(0, 10)),
      prisma.shipment.count({ where: { status: { in: ['PENDIENTE', 'EN_RUTA'] } } }),
      prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 10, where: { order: { createdAt: { gte: firstOfMonth }, status: { notIn: ['CANCELADO'] } } } }),
      prisma.order.groupBy({ by: ['channel'], _sum: { total: true }, _count: true, where: { createdAt: { gte: firstOfMonth }, status: { notIn: ['CANCELADO'] } } })
    ]);

    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true, sku: true } });
    const topProductsWithNames = topProducts.map(p => ({ ...p, product: productDetails.find(d => d.id === p.productId) }));

    res.json({ todaySales, monthSales, pendingOrders, lowStockItems, pendingDeliveries, topProducts: topProductsWithNames, salesByChannel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
