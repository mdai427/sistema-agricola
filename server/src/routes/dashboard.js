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
      // Use raw SQL to filter low-stock in DB instead of in memory
      prisma.$queryRaw`
        SELECT s.id, s.quantity, s."productId", s."warehouseId",
               p.name AS "productName", p.sku AS "productSku", p."minStock",
               w.name AS "warehouseName"
        FROM "Stock" s
        JOIN "Product" p ON p.id = s."productId"
        JOIN "Warehouse" w ON w.id = s."warehouseId"
        WHERE p.status = 'ACTIVO' AND s.quantity <= p."minStock"
        ORDER BY s.quantity ASC
        LIMIT 10
      `,
      prisma.shipment.count({ where: { status: { in: ['PENDIENTE', 'EN_RUTA'] } } }),
      prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, take: 10, where: { order: { createdAt: { gte: firstOfMonth }, status: { notIn: ['CANCELADO'] } } } }),
      prisma.order.groupBy({ by: ['channel'], _sum: { total: true }, _count: true, where: { createdAt: { gte: firstOfMonth }, status: { notIn: ['CANCELADO'] } } })
    ]);

    // Resolve product names for topProducts in one query (no N+1)
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = topProductIds.length
      ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true, sku: true } })
      : [];
    const pdMap = Object.fromEntries(productDetails.map(d => [d.id, d]));
    const topProductsWithNames = topProducts.map(p => ({ ...p, product: pdMap[p.productId] }));

    // Reshape raw low-stock result to match previous shape
    const lowStockShaped = lowStockItems.map(r => ({
      id: r.id,
      quantity: Number(r.quantity),
      productId: r.productId,
      warehouseId: r.warehouseId,
      product: { name: r.productName, sku: r.productSku, minStock: Number(r.minStock) },
      warehouse: { name: r.warehouseName }
    }));

    res.json({ todaySales, monthSales, pendingOrders, lowStockItems: lowStockShaped, pendingDeliveries, topProducts: topProductsWithNames, salesByChannel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
