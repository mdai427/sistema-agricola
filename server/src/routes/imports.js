const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

const generateRef = async () => {
  const count = await prisma.import.count();
  const year = new Date().getFullYear();
  return `IMP-${year}-${String(count + 1).padStart(4, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, supplierId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [
      { reference: { contains: search } },
      { containerNumber: { contains: search } },
      { invoiceNumber: { contains: search } },
      { billOfLading: { contains: search } },
    ];
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [imports, total] = await Promise.all([
      prisma.import.findMany({
        where, skip, take: parseInt(limit),
        include: { supplier: true, items: { include: { product: true } }, documents: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.import.count({ where })
    ]);
    res.json({ imports, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const imp = await prisma.import.findUnique({
      where: { id: req.params.id },
      include: { supplier: true, items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } }, documents: true }
    });
    if (!imp) return res.status(404).json({ error: 'Importación no encontrada' });
    res.json(imp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, documents, ...data } = req.body;
    const reference = data.reference || await generateRef();
    const parseDec = v => v !== undefined && v !== '' ? parseFloat(v) : undefined;

    const imp = await prisma.import.create({
      data: {
        ...data,
        reference,
        invoiceAmount: parseDec(data.invoiceAmount) || 0,
        exchangeRate: parseDec(data.exchangeRate) || 1,
        freightCost: parseDec(data.freightCost) || 0,
        customsDuty: parseDec(data.customsDuty) || 0,
        dta: parseDec(data.dta) || 0,
        igi: parseDec(data.igi) || 0,
        iva: parseDec(data.iva) || 0,
        otherCosts: parseDec(data.otherCosts) || 0,
        totalLandedCost: parseDec(data.totalLandedCost) || 0,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        departureDate: data.departureDate ? new Date(data.departureDate) : null,
        etaPort: data.etaPort ? new Date(data.etaPort) : null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        customsDate: data.customsDate ? new Date(data.customsDate) : null,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        pedimentoDate: data.pedimentoDate ? new Date(data.pedimentoDate) : null,
        items: items ? {
          create: items.map(i => ({
            productId: i.productId,
            description: i.description || null,
            hsCode: i.hsCode || null,
            quantity: parseInt(i.quantity),
            unitCost: parseFloat(i.unitCost),
            totalCost: parseFloat(i.totalCost),
            receivedQty: parseInt(i.receivedQty || 0),
          }))
        } : undefined,
        documents: documents ? { create: documents } : undefined,
      },
      include: { supplier: true, items: { include: { product: true } }, documents: true }
    });
    res.status(201).json(imp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { items, documents, ...data } = req.body;
    const parseDec = v => v !== undefined && v !== '' ? parseFloat(v) : undefined;

    const imp = await prisma.import.update({
      where: { id: req.params.id },
      data: {
        ...data,
        invoiceAmount: parseDec(data.invoiceAmount),
        exchangeRate: parseDec(data.exchangeRate),
        freightCost: parseDec(data.freightCost),
        customsDuty: parseDec(data.customsDuty),
        dta: parseDec(data.dta),
        igi: parseDec(data.igi),
        iva: parseDec(data.iva),
        otherCosts: parseDec(data.otherCosts),
        totalLandedCost: parseDec(data.totalLandedCost),
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        departureDate: data.departureDate ? new Date(data.departureDate) : undefined,
        etaPort: data.etaPort ? new Date(data.etaPort) : undefined,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
        customsDate: data.customsDate ? new Date(data.customsDate) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        pedimentoDate: data.pedimentoDate ? new Date(data.pedimentoDate) : undefined,
      },
      include: { supplier: true, items: { include: { product: true } }, documents: true }
    });
    res.json(imp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const imp = await prisma.import.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { supplier: true }
    });
    res.json(imp);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Receive items (update stock)
router.post('/:id/receive', auth, async (req, res) => {
  try {
    const { warehouseId, items } = req.body;
    const imp = await prisma.import.findUnique({
      where: { id: req.params.id }, include: { items: true }
    });
    if (!imp) return res.status(404).json({ error: 'Importación no encontrada' });

    await prisma.$transaction(async (tx) => {
      for (const { importItemId, qty } of items) {
        const item = imp.items.find(i => i.id === importItemId);
        if (!item) continue;
        const received = parseInt(qty);
        // Update import item received qty
        await tx.importItem.update({ where: { id: importItemId }, data: { receivedQty: { increment: received } } });
        // Update or create stock
        await tx.stock.upsert({
          where: { productId_warehouseId: { productId: item.productId, warehouseId } },
          create: { productId: item.productId, warehouseId, quantity: received },
          update: { quantity: { increment: received } }
        });
        // Create inventory movement
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            type: 'ENTRADA',
            quantity: received,
            toWarehouseId: warehouseId,
            userId: req.user.id,
            reference: imp.reference,
            notes: `Recepción importación ${imp.reference}`,
            costPrice: item.unitCost,
          }
        });
      }
      // Auto-update status to RECIBIDO if all items received
      const updatedItems = await tx.importItem.findMany({ where: { importId: req.params.id } });
      const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity);
      if (allReceived) {
        await tx.import.update({ where: { id: req.params.id }, data: { status: 'RECIBIDO', deliveryDate: new Date() } });
      }
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add document
router.post('/:id/documents', auth, async (req, res) => {
  try {
    const doc = await prisma.importDocument.create({
      data: { ...req.body, importId: req.params.id }
    });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/documents/:docId', auth, async (req, res) => {
  try {
    await prisma.importDocument.delete({ where: { id: req.params.docId } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.import.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
