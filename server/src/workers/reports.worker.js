const { Worker } = require('bullmq');
const { connection } = require('../lib/queues');
const prisma = require('../lib/prisma');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

if (!connection) {
  console.warn('[worker:reports] Redis not available — worker not started');
  module.exports = null;
  return;
}

// Ensure tmp dir exists
const TMP_DIR = path.join(__dirname, '../../tmp/reports');
fs.mkdirSync(TMP_DIR, { recursive: true });

const worker = new Worker('reports', async (job) => {
  const { name, data } = job;

  if (name === 'export-sales') {
    const { from, to, requestedBy } = data;
    await job.updateProgress(10);

    const dateWhere = (f, t) => {
      if (!f && !t) return undefined;
      return { gte: f ? new Date(f) : undefined, lte: t ? new Date(`${t}T23:59:59`) : undefined };
    };

    const createdAt = dateWhere(from, to);
    const where = { status: { notIn: ['CANCELADO'] }, ...(createdAt && { createdAt }) };

    // Paginated fetch to avoid OOM on large datasets
    const PAGE = 500;
    let page = 0;
    const rows = [];
    while (true) {
      const orders = await prisma.order.findMany({
        where, skip: page * PAGE, take: PAGE,
        include: { customer: true, user: { select: { name: true } }, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!orders.length) break;
      for (const o of orders) {
        for (const item of o.items) {
          rows.push({
            'Folio': o.folio,
            'Fecha': new Date(o.createdAt).toLocaleDateString('es-MX'),
            'Cliente': o.customer?.name || 'Público General',
            'RFC': o.customer?.rfc || 'XAXX010101000',
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
      page++;
      await job.updateProgress(10 + Math.min(70, page * 10));
      if (orders.length < PAGE) break;
    }

    await job.updateProgress(85);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    const filename = `reporte-ventas-${Date.now()}.xlsx`;
    const filepath = path.join(TMP_DIR, filename);
    XLSX.writeFile(wb, filepath);

    await job.updateProgress(100);
    return { filename, filepath, rows: rows.length };
  }

  if (name === 'export-inventory') {
    await job.updateProgress(10);
    const stocks = await prisma.stock.findMany({
      include: { product: { include: { category: true, brand: true } }, warehouse: true },
      orderBy: { product: { name: 'asc' } },
    });
    await job.updateProgress(60);

    const rows = stocks.map(s => ({
      'SKU': s.product.sku,
      'Producto': s.product.name,
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

    const filename = `reporte-inventario-${Date.now()}.xlsx`;
    const filepath = path.join(TMP_DIR, filename);
    XLSX.writeFile(wb, filepath);

    await job.updateProgress(100);
    return { filename, filepath, rows: rows.length };
  }

  throw new Error(`Unknown reports job: ${name}`);
}, {
  connection,
  concurrency: 2,
});

worker.on('failed', (job, err) => console.error(`[worker:reports] job ${job?.id} failed:`, err.message));
worker.on('completed', (job, result) => console.log(`[worker:reports] job ${job.id} done — ${result?.rows} rows → ${result?.filename}`));

module.exports = worker;
