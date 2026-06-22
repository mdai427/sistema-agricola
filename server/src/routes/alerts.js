const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const cache = require('../lib/cache');

router.get('/', auth, async (req, res) => {
  try {
    const data = await cache.wrap('alerts:main', cache.TTL.ALERTS, async () => {
      const alerts = [];

      // Stock bajo — filtered in DB, not in memory
      const lowStocks = await prisma.$queryRaw`
        SELECT s.id, s.quantity, s."productId", p.name AS "productName", p."minStock", w.name AS "warehouseName"
        FROM "Stock" s
        JOIN "Product" p ON p.id = s."productId"
        JOIN "Warehouse" w ON w.id = s."warehouseId"
        WHERE p.status = 'ACTIVO' AND s.quantity <= p."minStock"
        ORDER BY s.quantity ASC
        LIMIT 50
      `;
      lowStocks.forEach(s => {
        const qty = Number(s.quantity);
        const min = Number(s.minStock);
        alerts.push({
          id: `stock-${s.id}`,
          type: 'STOCK_BAJO',
          severity: qty === 0 ? 'CRITICO' : 'ADVERTENCIA',
          title: qty === 0 ? 'Producto Agotado' : 'Stock Bajo',
          message: `${s.productName} tiene ${qty} unidades en ${s.warehouseName} (mínimo: ${min})`,
          productId: s.productId,
          createdAt: new Date()
        });
      });

      // Pedidos sin atender > 24h
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldOrders = await prisma.order.findMany({
        where: { status: 'NUEVO', createdAt: { lt: cutoff24h } },
        include: { customer: { select: { name: true } } },
        take: 20
      });
      oldOrders.forEach(o => {
        alerts.push({ id: `order-${o.id}`, type: 'PEDIDO_SIN_ATENDER', severity: 'ADVERTENCIA', title: 'Pedido sin confirmar', message: `Pedido ${o.folio} de ${o.customer?.name || 'Público General'} lleva más de 24h sin confirmar`, orderId: o.id, createdAt: o.createdAt });
      });

      // Pedidos listos para facturar
      const toInvoice = await prisma.order.findMany({
        where: { status: 'ENTREGADO', cfdiUse: null, customer: { rfc: { not: null } } },
        include: { customer: { select: { name: true } } },
        take: 20
      });
      toInvoice.forEach(o => {
        alerts.push({ id: `invoice-${o.id}`, type: 'PENDIENTE_FACTURA', severity: 'INFO', title: 'Pedido listo para facturar', message: `${o.folio} de ${o.customer?.name} está entregado y tiene RFC registrado`, orderId: o.id, createdAt: o.updatedAt });
      });

      // Entregas programadas hoy
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      const todayShipments = await prisma.shipment.findMany({
        where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { in: ['PENDIENTE', 'EN_RUTA'] } },
        include: { order: { include: { customer: { select: { name: true } } } } }
      });
      todayShipments.forEach(s => {
        alerts.push({ id: `ship-${s.id}`, type: 'ENTREGA_HOY', severity: 'INFO', title: 'Entrega programada hoy', message: `Pedido ${s.order?.folio} para ${s.order?.customer?.name || 'Cliente'} programado hoy`, orderId: s.orderId, createdAt: s.scheduledAt });
      });

      const severityOrder = { CRITICO: 0, ADVERTENCIA: 1, INFO: 2 };
      alerts.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));
      return alerts;
    });

    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
