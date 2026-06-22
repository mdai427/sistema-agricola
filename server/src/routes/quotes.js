const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const generateFolio = async () => {
  const count = await prisma.quote.count();
  return `COT-${String(count + 1).padStart(6, '0')}`;
};

router.get('/', auth, async (req, res) => {
  try {
    const { search, status, customerId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ folio: { contains: search } }, { customer: { name: { contains: search } } }];
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where, skip, take: parseInt(limit),
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.quote.count({ where })
    ]);
    res.json({ quotes, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } } }
    });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const folio = await generateFolio();
    const quote = await prisma.quote.create({
      data: {
        ...data, folio, userId: req.user.id,
        status: 'BORRADOR',
        subtotal: parseFloat(data.subtotal),
        discount: parseFloat(data.discount || 0),
        tax: parseFloat(data.tax || 0),
        total: parseFloat(data.total),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        items: { create: items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), price: parseFloat(i.price), discount: parseFloat(i.discount || 0), subtotal: parseFloat(i.subtotal) })) }
      },
      include: { customer: true, items: { include: { product: true } } }
    });
    res.status(201).json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        ...data,
        subtotal: data.subtotal ? parseFloat(data.subtotal) : undefined,
        discount: data.discount !== undefined ? parseFloat(data.discount) : undefined,
        tax: data.tax !== undefined ? parseFloat(data.tax) : undefined,
        total: data.total ? parseFloat(data.total) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
      include: { customer: true, items: { include: { product: true } } }
    });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'APROBADA', approvedAt: new Date(), approvedBy: req.user.id },
      include: { customer: true }
    });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/reject', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'RECHAZADA', rejectedReason: req.body.reason || null },
      include: { customer: true }
    });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/send', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: { status: 'ENVIADA' },
      include: { customer: true }
    });
    res.json(quote);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/convert', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
    if (quote.converted) return res.status(400).json({ error: 'Ya fue convertida' });
    if (quote.status !== 'APROBADA') return res.status(400).json({ error: 'La cotización debe estar APROBADA para convertirse en venta' });
    const count = await prisma.order.count();
    const folio = `VTA-${String(count + 1).padStart(6, '0')}`;
    const order = await prisma.order.create({
      data: {
        folio, channel: 'TIENDA_FISICA', status: 'CONFIRMADO',
        customerId: quote.customerId, userId: req.user.id,
        paymentMethod: req.body.paymentMethod || 'EFECTIVO',
        subtotal: quote.subtotal, discount: quote.discount, tax: quote.tax, total: quote.total, paidAmount: 0,
        notes: quote.notes,
        items: { create: quote.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, discount: i.discount, subtotal: i.subtotal })) }
      },
      include: { items: true }
    });
    await prisma.quote.update({ where: { id: req.params.id }, data: { converted: true, orderId: order.id, status: 'CONVERTIDA' } });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: req.params.id },
      include: { customer: true, items: { include: { product: { include: { images: { where: { isPrimary: true } } } } } } }
    });
    if (!quote) return res.status(404).json({ error: 'No encontrada' });
    const company = await prisma.company.findFirst();
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=cotizacion-${quote.folio}.pdf`);
    doc.pipe(res);

    const GREEN = '#1a5c2a';
    const LIGHT = '#f0f7f1';
    const GRAY = '#6b7280';
    const currency = quote.currency || 'MXN';
    const fmt = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

    // Header bar
    doc.rect(0, 0, doc.page.width, 115).fill(GREEN);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text(company?.name || 'AgroMaq de México', 50, 28);
    doc.fontSize(8).font('Helvetica').fillColor('#c8e6c9')
      .text(`RFC: ${company?.rfc || ''}  |  Tel: ${company?.phone || ''}`, 50, 56)
      .text(company?.address || '', 50, 68).text(company?.email || '', 50, 80);

    // Quote info box
    doc.rect(380, 18, 175, 88).fillAndStroke('white', 'white');
    doc.fillColor(GREEN).fontSize(13).font('Helvetica-Bold').text('COTIZACIÓN', 385, 24);
    doc.fontSize(20).text(quote.folio, 385, 42);
    const statusColors = { BORRADOR: '#6b7280', ENVIADA: '#2563eb', APROBADA: '#16a34a', RECHAZADA: '#dc2626', CONVERTIDA: '#7c3aed' };
    doc.rect(385, 68, 100, 18).fill(statusColors[quote.status] || '#6b7280');
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(quote.status, 387, 73, { width: 96, align: 'center' });
    doc.fillColor(GRAY).fontSize(7).font('Helvetica')
      .text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString('es-MX')}`, 385, 92)
      .text(`Válida hasta: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('es-MX') : '—'}`, 385, 103);

    // Client + detail cards
    doc.rect(50, 125, 250, 65).fill(LIGHT);
    doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold').text('CLIENTE', 60, 133);
    doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(quote.customer?.name || 'Público General', 60, 145);
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
      .text(`RFC: ${quote.customer?.rfc || 'XAXX010101000'}`, 60, 161)
      .text(`${quote.customer?.email || ''}  ${quote.customer?.phone ? '| Tel: ' + quote.customer.phone : ''}`, 60, 173);

    doc.rect(310, 125, 245, 65).fill('#f9fafb');
    doc.fillColor(GREEN).fontSize(8).font('Helvetica-Bold').text('DETALLE', 320, 133);
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
      .text(`Moneda: ${currency}`, 320, 145)
      .text(`Vendedor: ${req.user?.name || ''}`, 320, 159)
      .text(`Total artículos: ${quote.items.reduce((s, i) => s + i.quantity, 0)}`, 320, 173);

    // Items table — row height 36 to fit thumbnail
    const ROW_H = 38;
    const IMG_SIZE = 30;
    let y = 205;
    doc.rect(50, y, doc.page.width - 100, 20).fill(GREEN);
    doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
      .text('IMG', 55, y + 6, { width: IMG_SIZE + 2 })
      .text('SKU', 90, y + 6, { width: 60 })
      .text('DESCRIPCIÓN', 150, y + 6, { width: 170 })
      .text('CANT.', 320, y + 6, { width: 35, align: 'right' })
      .text('P. UNIT.', 355, y + 6, { width: 65, align: 'right' })
      .text('DSCTO', 420, y + 6, { width: 35, align: 'right' })
      .text('SUBTOTAL', 455, y + 6, { width: 90, align: 'right' });
    y += 22;

    for (const [idx, item] of quote.items.entries()) {
      if (y > doc.page.height - 220) { doc.addPage(); y = 50; }
      if (idx % 2 === 0) doc.rect(50, y - 1, doc.page.width - 100, ROW_H).fill('#f9fafb');

      // Embed product image if available
      const imgUrl = item.product?.images?.[0]?.url;
      if (imgUrl && imgUrl.startsWith('data:image/')) {
        try {
          const mimeMatch = imgUrl.match(/^data:(image\/\w+);base64,/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const b64 = imgUrl.replace(/^data:image\/\w+;base64,/, '');
          const imgBuf = Buffer.from(b64, 'base64');
          doc.image(imgBuf, 54, y + 4, { width: IMG_SIZE, height: IMG_SIZE, fit: [IMG_SIZE, IMG_SIZE], align: 'center', valign: 'center' });
        } catch (e) { /* ignore image embed errors */ }
      }

      doc.fillColor('#111827').fontSize(8).font('Helvetica')
        .text(item.product?.sku || '', 90, y + 12, { width: 60 })
        .text(item.product?.name || '', 150, y + 12, { width: 168 })
        .text(item.quantity, 320, y + 12, { width: 35, align: 'right' })
        .text(fmt(item.price), 355, y + 12, { width: 65, align: 'right' })
        .text(item.discount > 0 ? `${item.discount}%` : '—', 420, y + 12, { width: 35, align: 'right' })
        .text(fmt(item.subtotal), 455, y + 12, { width: 90, align: 'right' });
      y += ROW_H;
    }

    doc.rect(50, y + 4, doc.page.width - 100, 1).fill('#e5e7eb');
    y += 14;

    // Totals block
    const tx = 390;
    const row = (label, val, bold = false) => {
      if (bold) {
        doc.rect(tx - 6, y - 2, 162, 26).fill(GREEN);
        doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
          .text(label, tx, y + 5, { width: 74, align: 'right' })
          .text(val, tx + 78, y + 5, { width: 78, align: 'right' });
        y += 30;
      } else {
        doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label, tx, y, { width: 74, align: 'right' });
        doc.fillColor('#111827').text(val, tx + 78, y, { width: 78, align: 'right' });
        y += 14;
      }
    };
    row('Subtotal:', fmt(quote.subtotal));
    if (parseFloat(quote.discount) > 0) row('Descuento:', `-${fmt(quote.discount)}`);
    row('IVA 16%:', fmt(quote.tax));
    row(`TOTAL ${currency}:`, fmt(quote.total), true);
    y += 8;

    if (quote.notes) {
      doc.fillColor(GRAY).fontSize(8).font('Helvetica-Bold').text('OBSERVACIONES:', 50, y);
      doc.font('Helvetica').fillColor('#374151').text(quote.notes, 50, y + 12, { width: 330 });
      y += 36;
    }

    const terms = quote.terms || company?.quoteTerms || 'Precios en MXN con IVA incluido. Cotización sujeta a disponibilidad de inventario.';
    doc.rect(50, y, doc.page.width - 100, 1).fill(GREEN);
    y += 6;
    doc.fillColor(GRAY).fontSize(7).font('Helvetica-Bold').text('TÉRMINOS Y CONDICIONES', 50, y);
    doc.font('Helvetica').fillColor('#6b7280').text(terms, 50, y + 10, { width: doc.page.width - 100 });

    // Footer
    doc.rect(0, doc.page.height - 36, doc.page.width, 36).fill(GREEN);
    doc.fillColor('white').fontSize(7.5).font('Helvetica')
      .text(`${company?.name || 'AgroMaq de México'}  ·  ${company?.phone || ''}  ·  ${company?.email || ''}`, 50, doc.page.height - 22, { align: 'center', width: doc.page.width - 100 });

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.quote.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
