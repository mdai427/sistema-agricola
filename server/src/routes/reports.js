const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const XLSX = require('xlsx');

// Helper: build date where clause
const dateWhere = (from, to) => {
  if (!from && !to) return undefined;
  return { gte: from ? new Date(from) : undefined, lte: to ? new Date(to + 'T23:59:59') : undefined };
};

// Sales summary + charts data
router.get('/sales', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const createdAt = dateWhere(from, to);
    const where = { status: { notIn: ['CANCELADO'] }, ...(createdAt && { createdAt }) };

    const orders = await prisma.order.findMany({
      where,
      include: { customer: true, user: { select: { name: true } }, items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: 'desc' }
    });

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

// Export sales to Excel
router.get('/export/sales', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const createdAt = dateWhere(from, to);
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ['CANCELADO'] }, ...(createdAt && { createdAt }) },
      include: { customer: true, user: { select: { name: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const rows = [];
    for (const o of orders) {
      for (const item of o.items) {
        rows.push({
          'Folio': o.folio,
          'Fecha': new Date(o.createdAt).toLocaleDateString('es-MX'),
          'Cliente': o.customer?.name || 'Público General',
          'RFC Cliente': o.customer?.rfc || 'XAXX010101000',
          'Canal': o.channel,
          'Vendedor': o.user?.name,
          'SKU': item.product?.sku,
          'Producto': item.product?.name,
          'Cantidad': item.quantity,
          'Precio Unitario': parseFloat(item.price),
          'Descuento': parseFloat(item.discount || 0),
          'Subtotal Línea': parseFloat(item.subtotal),
          'Total Pedido': parseFloat(o.total),
          'Estado': o.status,
          'Método Pago': o.paymentMethod,
        });
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    // Summary sheet
    const summary = [
      { 'Concepto': 'Total Pedidos', 'Valor': orders.length },
      { 'Concepto': 'Total Ingresos', 'Valor': orders.reduce((s, o) => s + parseFloat(o.total || 0), 0) },
      { 'Concepto': 'Período Desde', 'Valor': from || 'Inicio' },
      { 'Concepto': 'Período Hasta', 'Valor': to || 'Hoy' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-ventas-${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export inventory to Excel
router.get('/export/inventory', auth, async (req, res) => {
  try {
    const stocks = await prisma.stock.findMany({
      include: { product: { include: { category: true, brand: true } }, warehouse: true },
      orderBy: { product: { name: 'asc' } }
    });
    const rows = stocks.map(s => ({
      'SKU': s.product.sku,
      'Producto': s.product.name,
      'Modelo': s.product.model || '',
      'Categoría': s.product.category?.name || '',
      'Marca': s.product.brand?.name || '',
      'Almacén': s.warehouse.name,
      'Existencia': s.quantity,
      'Stock Mínimo': s.product.minStock,
      'Estado': s.quantity === 0 ? 'AGOTADO' : s.quantity <= s.product.minStock ? 'BAJO' : 'OK',
      'Precio Costo': parseFloat(s.product.costPrice),
      'Precio Venta': parseFloat(s.product.salePrice),
      'Valor Costo Total': parseFloat(s.product.costPrice) * s.quantity,
      'Valor Venta Total': parseFloat(s.product.salePrice) * s.quantity,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-inventario-${Date.now()}.xlsx`);
    res.send(buf);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
