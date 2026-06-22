const router = require('express').Router();
const PDFDocument = require('pdfkit');
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');

router.get('/:id/ficha-pdf', auth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true, attributes: true, stocks: { include: { warehouse: true } } }
    });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=ficha-${product.sku}.pdf`);
    doc.pipe(res);

    // Header verde
    doc.rect(0, 0, 612, 100).fill('#1a5c2a');
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('FICHA TÉCNICA', 50, 30);
    doc.fontSize(12).font('Helvetica').text('AgroMaq de México S.A. de C.V.', 50, 58);
    doc.fontSize(10).text(`SKU: ${product.sku}`, 400, 40, { align: 'right', width: 162 });

    // Producto info
    doc.fillColor('#1a5c2a').fontSize(18).font('Helvetica-Bold').text(product.name, 50, 120);
    doc.fillColor('#333').fontSize(11).font('Helvetica');
    if (product.brand) doc.text(`Marca: ${product.brand.name}`, 50, 148);
    if (product.model) doc.text(`Modelo: ${product.model}`, 50, 164);
    doc.text(`Categoría: ${product.category?.name || '-'}`, 50, product.model ? 180 : 164);

    // Descripción
    if (product.description) {
      doc.moveDown();
      doc.fillColor('#1a5c2a').fontSize(13).font('Helvetica-Bold').text('Descripción', 50, doc.y);
      doc.fillColor('#444').fontSize(10).font('Helvetica').text(product.description, 50, doc.y + 4, { width: 510 });
    }

    // Especificaciones técnicas
    if (product.attributes?.length > 0) {
      doc.moveDown();
      const ySpec = doc.y + 10;
      doc.fillColor('#1a5c2a').fontSize(13).font('Helvetica-Bold').text('Especificaciones Técnicas', 50, ySpec);
      let y = ySpec + 24;
      product.attributes.forEach((attr, i) => {
        const bg = i % 2 === 0 ? '#f0f7f1' : '#ffffff';
        doc.rect(50, y - 4, 510, 22).fill(bg);
        doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text(attr.key + ':', 58, y, { width: 180 });
        doc.font('Helvetica').text(attr.value, 240, y, { width: 310 });
        y += 22;
      });
      doc.y = y + 10;
    }

    // Precios
    doc.moveDown();
    doc.rect(50, doc.y, 510, 70).fill('#f8f8f8').stroke('#e0e0e0');
    const priceY = doc.y + 10;
    doc.fillColor('#1a5c2a').fontSize(13).font('Helvetica-Bold').text('Información de Precios', 60, priceY);
    doc.fillColor('#333').fontSize(11).font('Helvetica').text(`Precio de Venta: $${parseFloat(product.salePrice).toFixed(2)} MXN`, 60, priceY + 22);
    if (product.specialPrice) doc.text(`Precio Especial: $${parseFloat(product.specialPrice).toFixed(2)} MXN`, 60, priceY + 38);

    // Stock
    doc.moveDown(2);
    if (product.stocks?.length > 0) {
      doc.fillColor('#1a5c2a').fontSize(13).font('Helvetica-Bold').text('Existencias', 50, doc.y);
      doc.moveDown(0.3);
      product.stocks.forEach(s => {
        doc.fillColor('#333').fontSize(10).font('Helvetica').text(`${s.warehouse?.name}: ${s.quantity} unidades`, 50, doc.y);
      });
    }

    // Footer
    const pageHeight = doc.page.height;
    doc.rect(0, pageHeight - 40, 612, 40).fill('#1a5c2a');
    doc.fillColor('white').fontSize(9).text(`Generado el ${new Date().toLocaleDateString('es-MX')} | AgroMaq de México`, 50, pageHeight - 26);

    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
