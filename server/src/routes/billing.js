const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

// Get FINKOC configuration from company
router.get('/config', auth, async (req, res) => {
  try {
    const company = await prisma.company.findFirst();
    res.json({
      finkocUser: company?.finkocUser || '',
      finkocRfc: company?.finkocRfc || company?.rfc || '',
      finkocEnv: company?.finkocEnv || 'sandbox',
      hasCredentials: !!(company?.finkocUser && company?.finkocPassword),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all invoiceable orders
router.get('/pending', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['CONFIRMADO', 'ENTREGADO'] } },
      include: { customer: true, items: { include: { product: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get CFDI data for an order
router.get('/:orderId/cfdi-data', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { customer: true, items: { include: { product: { include: { category: true } } } }, user: { select: { name: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    const company = await prisma.company.findFirst();
    const subtotal = parseFloat(order.subtotal) - parseFloat(order.discount || 0);
    const iva = parseFloat((subtotal * 0.16).toFixed(2));
    const total = parseFloat((subtotal + iva).toFixed(2));
    const cfdi = {
      version: '4.0',
      emisor: {
        rfc: company?.rfc || company?.finkocRfc || 'AMM200101ABC',
        nombre: company?.name || 'AgroMaq de México S.A. de C.V.',
        regimenFiscal: company?.regimenFiscal || '601'
      },
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
        descripcion: item.product?.name || '',
        valorUnitario: parseFloat(item.price).toFixed(2),
        importe: parseFloat(item.subtotal).toFixed(2),
        sku: item.product?.sku,
      })),
      impuestos: {
        traslados: [{ impuesto: '002', tipoFactor: 'Tasa', tasaCuota: '0.160000', importe: iva.toFixed(2) }]
      },
      subTotal: subtotal.toFixed(2),
      descuento: parseFloat(order.discount || 0).toFixed(2),
      iva: iva.toFixed(2),
      total: total.toFixed(2),
      moneda: 'MXN',
      tipoCambio: '1',
      metodoPago: order.paymentMethod === 'EFECTIVO' ? 'PUE' : 'PPD',
      formaPago: order.paymentMethod === 'EFECTIVO' ? '01' : order.paymentMethod === 'TARJETA' ? '04' : '99',
      folioPedido: order.folio,
      fecha: order.createdAt,
      cfdiEnv: company?.finkocEnv || 'sandbox',
    };
    res.json(cfdi);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stamp CFDI via FINKOC (simulated when no credentials)
router.post('/:orderId/stamp', auth, async (req, res) => {
  try {
    const company = await prisma.company.findFirst();
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: { customer: true, items: { include: { product: true } } }
    });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    const hasCredentials = company?.finkocUser && company?.finkocPassword;

    if (hasCredentials) {
      // Real FINKOC call
      try {
        const axios = require('axios');
        const cfdiData = req.body;
        const finkocEnv = company.finkocEnv === 'production' ? 'https://api.finkoc.com/v1' : 'https://sandbox.finkoc.com/v1';
        const response = await axios.post(`${finkocEnv}/cfdi40/stamp`, cfdiData, {
          auth: { username: company.finkocUser, password: company.finkocPassword },
          timeout: 15000
        });
        const { uuid, xml, qr } = response.data;
        await prisma.order.update({
          where: { id: req.params.orderId },
          data: { cfdiUse: req.body.receptor?.usoCFDI || 'G03', regimenFiscal: req.body.receptor?.regimenFiscal || '616' }
        });
        return res.json({ success: true, uuid, xml, qr, mode: 'finkoc' });
      } catch (finkocErr) {
        return res.status(502).json({ error: `FINKOC error: ${finkocErr.message}` });
      }
    } else {
      // Simulate
      const uuid = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await prisma.order.update({
        where: { id: req.params.orderId },
        data: { cfdiUse: req.body.receptor?.usoCFDI || 'G03', regimenFiscal: req.body.receptor?.regimenFiscal || '616' }
      });
      return res.json({
        success: true,
        uuid,
        xml: `<!-- CFDI 4.0 SIMULADO - Configure credenciales FINKOC en Configuración -->\n<Comprobante UUID="${uuid}" Total="${req.body.total}" />`,
        qr: null,
        mode: 'simulado',
        warning: 'CFDI simulado — configure credenciales FINKOC en Configuración > Facturación'
      });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mark order as invoiced manually
router.patch('/:orderId/invoice', auth, async (req, res) => {
  try {
    const { cfdiUse, regimenFiscal } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.orderId },
      data: { cfdiUse: cfdiUse || 'G03', regimenFiscal: regimenFiscal || '601' },
      include: { customer: true, items: { include: { product: true } } }
    });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
