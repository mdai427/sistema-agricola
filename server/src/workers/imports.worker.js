const { Worker } = require('bullmq');
const { connection } = require('../lib/queues');
const prisma = require('../lib/prisma');
const XLSX = require('xlsx');
const cache = require('../lib/cache');

if (!connection) {
  console.warn('[worker:imports] Redis not available — worker not started');
  module.exports = null;
  return;
}

const worker = new Worker('imports', async (job) => {
  const { name, data } = job;

  if (name === 'import-products-excel') {
    const { rows, warehouseId, userId } = data;
    const results = { created: 0, updated: 0, errors: [] };

    await job.updateProgress(5);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-indexed + header)
      try {
        const sku = String(row['SKU'] || '').trim();
        const name = String(row['Nombre'] || '').trim();
        if (!sku || !name) {
          results.errors.push({ row: rowNum, error: 'SKU y Nombre son obligatorios' });
          continue;
        }

        const costPrice = parseFloat(row['Precio Costo']);
        const salePrice = parseFloat(row['Precio Venta']);
        if (isNaN(costPrice) || isNaN(salePrice)) {
          results.errors.push({ row: rowNum, sku, error: 'Precio Costo y Precio Venta deben ser números' });
          continue;
        }
        if (salePrice < costPrice) {
          results.errors.push({ row: rowNum, sku, error: `Precio venta ($${salePrice}) menor al costo ($${costPrice})` });
          continue;
        }

        // Resolve or create category
        const categoryName = String(row['Categoría'] || 'General').trim();
        let category = await prisma.category.findFirst({ where: { name: categoryName } });
        if (!category) {
          const slug = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          category = await prisma.category.create({ data: { name: categoryName, slug: `${slug}-${Date.now()}` } });
        }

        // Resolve or create brand
        let brand = null;
        const brandName = String(row['Marca'] || '').trim();
        if (brandName) {
          brand = await prisma.brand.findFirst({ where: { name: brandName } });
          if (!brand) brand = await prisma.brand.create({ data: { name: brandName } });
        }

        const existing = await prisma.product.findUnique({ where: { sku } });
        const minStock = parseInt(row['Stock Mínimo'] || 0) || 0;
        const initialStock = parseInt(row['Stock Inicial'] || 0) || 0;

        if (existing) {
          await prisma.product.update({
            where: { sku },
            data: { name, costPrice, salePrice, categoryId: category.id, brandId: brand?.id || undefined, minStock, model: row['Modelo'] || undefined },
          });
          results.updated++;
        } else {
          const product = await prisma.product.create({
            data: { sku, name, costPrice, salePrice, categoryId: category.id, brandId: brand?.id || undefined, minStock, model: row['Modelo'] || undefined, description: row['Descripción'] || undefined },
          });

          // Create initial stock movement if stock provided
          if (initialStock > 0 && warehouseId) {
            await prisma.$transaction([
              prisma.stock.upsert({
                where: { productId_warehouseId: { productId: product.id, warehouseId } },
                create: { productId: product.id, warehouseId, quantity: initialStock },
                update: { quantity: { increment: initialStock } },
              }),
              prisma.inventoryMovement.create({
                data: { productId: product.id, type: 'ENTRADA', quantity: initialStock, toWarehouseId: warehouseId, userId, reference: 'IMPORTACION-EXCEL', notes: `Importado desde Excel — ${new Date().toLocaleDateString('es-MX')}` },
              }),
            ]);
          }
          results.created++;
        }
      } catch (e) {
        results.errors.push({ row: rowNum, error: e.message });
      }

      if (i % 20 === 0) await job.updateProgress(5 + Math.round((i / rows.length) * 90));
    }

    // Invalidate catalog + stock caches
    await cache.del('catalog:categories', 'catalog:brands', 'dashboard:main', 'alerts:main');

    await job.updateProgress(100);
    return results;
  }

  throw new Error(`Unknown imports job: ${name}`);
}, {
  connection,
  concurrency: 1, // DB-heavy — serialize import jobs
});

worker.on('failed', (job, err) => console.error(`[worker:imports] job ${job?.id} failed:`, err.message));
worker.on('completed', (job, result) => console.log(`[worker:imports] job ${job.id} done — created:${result?.created} updated:${result?.updated} errors:${result?.errors?.length}`));

module.exports = worker;
