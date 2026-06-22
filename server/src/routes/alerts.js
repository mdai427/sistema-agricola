const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const alerts = [];

    // Stock bajo
    const stocks = await prisma.stock.findMany({ include: { product: true, warehouse: true } });
    stocks.filter(s => s.quantity <= s.product.minStock && s.product.status === 'ACTIVO').forEach(s => {
      alerts.push({ id: `stock-${s.id}`, type: 'STOCK_BAJO', severity: s.quantity === 0 ? 'CRITICO' : 'ADVERTENCIA', title: s.quantity === 0 ? 'Producto Agotado' : 'Stock Bajo', message: `${s.product.name} tiene ${s.quantity} unidades en ${s.warehouse.name} (mínimo: ${s.product.minStock})`, productId: s.productId, createdAt: new Date() });
    });

    // Pedidos sin atender > 24h
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldOrders = await prisma.order.findMany({ where: { status: 'NUEVO', createdAt: { lt: cutoff24h } }, include: { customer: true } });
    oldOrders.forEach(o => {
      alerts.push({ id: `order-${o.id}`, type: 'PEDIDO_SIN_ATENDER', severity: 'ADVERTENCIA', title: 'Pedido sin confirmar', message: `Pedido ${o.folio} de ${o.customer?.name || 'Público General'} lleva más de 24h sin confirmar`, orderId: o.id, createdAt: o.createdAt });
    });

    // Pedidos listos para facturar (entregados sin CFDI)
    const toInvoice = await prisma.order.findMany({ where: { status: 'ENTREGADO', cfdiUse: null, customer: { rfc: { not: null } } }, include: { customer: true }, take: 20 });
    toInvoice.forEach(o => {
      alerts.push({ id: `invoice-${o.id}`, type: 'PENDIENTE_FACTURA', severity: 'INFO', title: 'Pedido listo para facturar', message: `${o.folio} de ${o.customer?.name} está entregado y tiene RFC registrado`, orderId: o.id, createdAt: o.updatedAt });
    });

    // Entregas programadas hoy
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const todayShipments = await prisma.shipment.findMany({ where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { in: ['PENDIENTE', 'EN_RUTA'] } }, include: { order: { include: { customer: true } } } });
    todayShipments.forEach(s => {
      alerts.push({ id: `ship-${s.id}`, type: 'ENTREGA_HOY', severity: 'INFO', title: 'Entrega programada hoy', message: `Pedido ${s.order?.folio} para ${s.order?.customer?.name || 'Cliente'} programado hoy`, orderId: s.orderId, createdAt: s.scheduledAt });
    });

    // Sort by severity
    const severityOrder = { CRITICO: 0, ADVERTENCIA: 1, INFO: 2 };
    alerts.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));

    res.json(alerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
