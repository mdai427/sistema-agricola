const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

// Get orders pending invoice
router.get('/pending', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['CONFIRMADO', 'ENTREGADO'] }, invoiceStatus: undefined },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark order as invoiced
router.patch('/:orderId/invoice', auth, async (req, res) => {
  try {
    const { invoiceNumber, cfdiUse, regimenFiscal, notes } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: {
        cfdiUse: cfdiUse || 'G03',
        regimenFiscal: regimenFiscal || '601',
        notes: notes ? (order_prev => order_prev?.notes ? order_prev.notes + '\n' + notes : notes) : undefined
      },
      include: { customer: true, items: { include: { product: true } } }
    });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate invoice data (CFDI structure)
router.get('/:orderId/cfdi-data', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { customer: true, items: { include: { product: { include: { category: true } } } }, user: { select: { name: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    const subtotal = parseFloat(order.subtotal);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    const cfdi = {
      emisor: { rfc: 'AMM200101ABC', nombre: 'AgroMaq de México S.A. de C.V.', regimenFiscal: '601' },
      receptor: {
        rfc: order.customer?.rfc || 'XAXX010101000',
        nombre: order.customer?.name || 'Público General',
        usoCFDI: order.cfdiUse || 'G03',
        regimenFiscal: order.regimenFiscal || '616',
        domicilioFiscal: order.customer?.zip || '44100'
      },
      conceptos: order.items.map(item => ({
        claveProdServ: '27111701',
        claveUnidad: 'H87',
        cantidad: item.quantity,
        descripcion: item.product?.name,
        valorUnitario: parseFloat(item.price),
        importe: parseFloat(item.subtotal)
      })),
      subTotal: subtotal,
      iva: iva,
      total: total,
      moneda: 'MXN',
      folioPedido: order.folio,
      fecha: order.createdAt
    };
    res.json(cfdi);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
