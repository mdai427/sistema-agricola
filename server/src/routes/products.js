const router = require('express').Router();
const prisma = require('../lib/prisma');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', auth, async (req, res) => {
  try {
    const { search, categoryId, brandId, status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }];
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit),
        include: { category: true, brand: true, images: { where: { isPrimary: true } }, stocks: { include: { warehouse: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.product.count({ where })
    ]);
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true, images: true, attributes: true, stocks: { include: { warehouse: true } }, serials: true }
    });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { attributes, images, ...data } = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        costPrice: parseFloat(data.costPrice),
        salePrice: parseFloat(data.salePrice),
        specialPrice: data.specialPrice ? parseFloat(data.specialPrice) : null,
        attributes: attributes ? { create: attributes } : undefined,
        images: images ? { create: images } : undefined,
      },
      include: { category: true, brand: true, images: true, attributes: true }
    });
    res.status(201).json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { attributes, images, ...data } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : undefined,
        salePrice: data.salePrice ? parseFloat(data.salePrice) : undefined,
        specialPrice: data.specialPrice ? parseFloat(data.specialPrice) : null,
      },
      include: { category: true, brand: true, images: true, attributes: true }
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { status: 'DESCONTINUADO' } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/import-excel', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    const results = { created: 0, errors: [] };
    for (const row of rows) {
      try {
        const sku = String(row['SKU'] || row['sku'] || '').trim();
        const name = String(row['Nombre'] || row['nombre'] || row['name'] || '').trim();
        if (!sku || !name) { results.errors.push(`Fila sin SKU o Nombre: ${JSON.stringify(row)}`); continue; }
        // Find or create category
        let categoryId = null;
        const catName = String(row['Categoría'] || row['Categoria'] || row['categoria'] || 'General').trim();
        let cat = await prisma.category.findFirst({ where: { name: catName } });
        if (!cat) cat = await prisma.category.create({ data: { name: catName, slug: catName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') + '-' + Date.now() } });
        categoryId = cat.id;
        // Find or create brand
        let brandId = null;
        const brandName = String(row['Marca'] || row['marca'] || '').trim();
        if (brandName) {
          let brand = await prisma.brand.findFirst({ where: { name: brandName } });
          if (!brand) brand = await prisma.brand.create({ data: { name: brandName } });
          brandId = brand.id;
        }
        const existing = await prisma.product.findUnique({ where: { sku } });
        const data = {
          sku, name,
          description: String(row['Descripción'] || row['Descripcion'] || row['descripcion'] || '').trim() || null,
          model: String(row['Modelo'] || row['modelo'] || '').trim() || null,
          costPrice: parseFloat(row['Precio Costo'] || row['costo'] || 0),
          salePrice: parseFloat(row['Precio Venta'] || row['precio'] || 0),
          minStock: parseInt(row['Stock Mínimo'] || row['stock_minimo'] || 0),
          categoryId, brandId,
          status: 'ACTIVO'
        };
        if (existing) { await prisma.product.update({ where: { sku }, data }); }
        else { await prisma.product.create({ data }); }
        results.created++;
      } catch (e) { results.errors.push(`Error en fila: ${e.message}`); }
    }
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/excel-template', auth, async (req, res) => {
  const wb = XLSX.utils.book_new();
  const headers = [['SKU','Nombre','Descripción','Categoría','Marca','Modelo','Precio Costo','Precio Venta','Stock Mínimo']];
  const example = [['PROD-001','Motosierra Ejemplo','Descripción del producto','Motosierras','STIHL','MS 170',2800,3950,3]];
  const ws = XLSX.utils.aoa_to_sheet([...headers, ...example]);
  ws['!cols'] = headers[0].map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=plantilla_productos.xlsx');
  res.send(buf);
});

module.exports = router;
