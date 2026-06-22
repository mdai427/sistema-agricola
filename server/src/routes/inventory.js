const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth, requireRole } = require('../middleware/auth');

router.get('/stocks', auth, async (req, res) => {
  try {
    const { warehouseId, lowStock } = req.query;
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (lowStock === 'true') where.product = { status: 'ACTIVO' };
    const stocks = await prisma.stock.findMany({
      where,
      include: { product: { include: { category: true, brand: true, images: { where: { isPrimary: true } } } }, warehouse: true },
      orderBy: { product: { name: 'asc' } }
    });
    const filtered = lowStock === 'true' ? stocks.filter(s => s.quantity <= s.product.minStock) : stocks;
    res.json(filtered);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/movements', auth, async (req, res) => {
  try {
    const { productId, warehouseId, type, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (productId) where.productId = productId;
    if (warehouseId) where.OR = [{ fromWarehouseId: warehouseId }, { toWarehouseId: warehouseId }];
    if (type) where.type = type;
    if (from || to) where.createdAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where, skip, take: parseInt(limit),
        include: { product: true, user: { select: { name: true } }, fromWarehouse: true, toWarehouse: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.inventoryMovement.count({ where })
    ]);
    res.json({ movements, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/movement', auth, async (req, res) => {
  try {
    const { productId, type, quantity, fromWarehouseId, toWarehouseId, reference, notes, costPrice } = req.body;
    const movement = await prisma.$transaction(async (tx) => {
      const mov = await tx.inventoryMovement.create({
        data: { productId, type, quantity: parseInt(quantity), fromWarehouseId, toWarehouseId, userId: req.user.id, reference, notes, costPrice: costPrice ? parseFloat(costPrice) : null }
      });
      if (type === 'ENTRADA' && toWarehouseId) {
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
          create: { productId, warehouseId: toWarehouseId, quantity: parseInt(quantity) },
          update: { quantity: { increment: parseInt(quantity) } }
        });
      } else if (type === 'SALIDA' && fromWarehouseId) {
        await tx.stock.update({
          where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
          data: { quantity: { decrement: parseInt(quantity) } }
        });
      } else if (type === 'TRASPASO' && fromWarehouseId && toWarehouseId) {
        await tx.stock.update({ where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } }, data: { quantity: { decrement: parseInt(quantity) } } });
        await tx.stock.upsert({ where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } }, create: { productId, warehouseId: toWarehouseId, quantity: parseInt(quantity) }, update: { quantity: { increment: parseInt(quantity) } } });
      } else if (type === 'AJUSTE' && toWarehouseId) {
        await tx.stock.upsert({ where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } }, create: { productId, warehouseId: toWarehouseId, quantity: parseInt(quantity) }, update: { quantity: parseInt(quantity) } });
      }
      return mov;
    });
    res.status(201).json(movement);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
