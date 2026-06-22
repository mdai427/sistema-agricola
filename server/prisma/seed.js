const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Company
  await prisma.company.upsert({
    where: { id: 'company-main' },
    update: {},
    create: { id: 'company-main', name: 'AgroMaq de México S.A. de C.V.', rfc: 'AMM200101ABC', address: 'Av. del Campo 123, Col. Agroindustrial, Guadalajara, Jalisco', phone: '33-1234-5678', email: 'ventas@agromaq.mx', regimenFiscal: '601', docSeries: 'A' }
  });

  // Branch
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: { id: 'branch-main', name: 'Sucursal Principal', address: 'Av. del Campo 123, Guadalajara', phone: '33-1234-5678' }
  });

  // Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'wh-main' },
    update: {},
    create: { id: 'wh-main', name: 'Almacén Principal', branchId: branch.id }
  });

  // Users
  const adminPass = await bcrypt.hash('admin123', 10);
  const vendedorPass = await bcrypt.hash('vendedor123', 10);

  await prisma.user.upsert({ where: { email: 'admin@agromaq.mx' }, update: {}, create: { name: 'Administrador', email: 'admin@agromaq.mx', password: adminPass, role: 'ADMIN' } });
  await prisma.user.upsert({ where: { email: 'ventas@agromaq.mx' }, update: {}, create: { name: 'Carlos Ramírez', email: 'ventas@agromaq.mx', password: vendedorPass, role: 'VENDEDOR' } });
  await prisma.user.upsert({ where: { email: 'almacen@agromaq.mx' }, update: {}, create: { name: 'Luis Torres', email: 'almacen@agromaq.mx', password: vendedorPass, role: 'ALMACENISTA' } });

  // Categories
  const cats = [
    { id: 'cat-motosierras', name: 'Motosierras', slug: 'motosierras' },
    { id: 'cat-desbrozadoras', name: 'Desbrozadoras', slug: 'desbrozadoras' },
    { id: 'cat-fumigadoras', name: 'Fumigadoras', slug: 'fumigadoras' },
    { id: 'cat-tractores', name: 'Tractores', slug: 'tractores' },
    { id: 'cat-riego', name: 'Sistemas de Riego', slug: 'sistemas-riego' },
    { id: 'cat-podadoras', name: 'Podadoras', slug: 'podadoras' },
    { id: 'cat-accesorios', name: 'Accesorios y Refacciones', slug: 'accesorios' },
    { id: 'cat-herramientas', name: 'Herramientas de Campo', slug: 'herramientas-campo' },
  ];
  for (const c of cats) await prisma.category.upsert({ where: { id: c.id }, update: {}, create: c });

  // Brands
  const brands = [
    { id: 'brand-stihl', name: 'STIHL' },
    { id: 'brand-husqvarna', name: 'Husqvarna' },
    { id: 'brand-honda', name: 'Honda' },
    { id: 'brand-echo', name: 'Echo' },
    { id: 'brand-john-deere', name: 'John Deere' },
    { id: 'brand-kubota', name: 'Kubota' },
    { id: 'brand-solo', name: 'Solo' },
    { id: 'brand-truper', name: 'Truper' },
    { id: 'brand-fiskars', name: 'Fiskars' },
  ];
  for (const b of brands) await prisma.brand.upsert({ where: { id: b.id }, update: {}, create: b });

  // Products
  const products = [
    { id: 'prod-ms170', sku: 'STH-MS170', name: 'Motosierra STIHL MS 170', categoryId: 'cat-motosierras', brandId: 'brand-stihl', model: 'MS 170', costPrice: 2800, salePrice: 3950, minStock: 3, description: 'Motosierra liviana ideal para trabajos en el hogar y jardín. Motor de 1.3 kW, barra de 30 cm.', attributes: [{ key: 'Potencia', value: '1.3 kW' }, { key: 'Cilindrada', value: '30.1 cc' }, { key: 'Longitud de barra', value: '30 cm' }, { key: 'Peso', value: '3.9 kg' }] },
    { id: 'prod-ms250', sku: 'STH-MS250', name: 'Motosierra STIHL MS 250', categoryId: 'cat-motosierras', brandId: 'brand-stihl', model: 'MS 250', costPrice: 4200, salePrice: 5800, minStock: 3, description: 'Motosierra semiprofesional para trabajos de poda y corte en campo.', attributes: [{ key: 'Potencia', value: '2.3 kW' }, { key: 'Cilindrada', value: '45.4 cc' }, { key: 'Longitud de barra', value: '45 cm' }] },
    { id: 'prod-ms660', sku: 'STH-MS660', name: 'Motosierra STIHL MS 660', categoryId: 'cat-motosierras', brandId: 'brand-stihl', model: 'MS 660', costPrice: 12000, salePrice: 16500, minStock: 2, description: 'Motosierra profesional de alta potencia para tala y corte de madera dura.', attributes: [{ key: 'Potencia', value: '5.2 kW' }, { key: 'Cilindrada', value: '91.1 cc' }, { key: 'Longitud de barra', value: '63 cm' }] },
    { id: 'prod-husq130', sku: 'HUS-130', name: 'Motosierra Husqvarna 130', categoryId: 'cat-motosierras', brandId: 'brand-husqvarna', model: '130', costPrice: 3100, salePrice: 4200, minStock: 3, description: 'Motosierra de uso general con tecnología X-Torq para menor consumo de combustible.', attributes: [{ key: 'Potencia', value: '1.5 kW' }, { key: 'Cilindrada', value: '38 cc' }, { key: 'Longitud de barra', value: '38 cm' }] },
    { id: 'prod-fs55', sku: 'STH-FS55', name: 'Desbrozadora STIHL FS 55', categoryId: 'cat-desbrozadoras', brandId: 'brand-stihl', model: 'FS 55', costPrice: 3200, salePrice: 4400, minStock: 5, description: 'Desbrozadora versátil para limpieza de terrenos y mantenimiento de praderas.', attributes: [{ key: 'Potencia', value: '0.75 kW' }, { key: 'Cilindrada', value: '27.2 cc' }, { key: 'Peso', value: '4.6 kg' }] },
    { id: 'prod-fs130', sku: 'STH-FS130', name: 'Desbrozadora STIHL FS 130', categoryId: 'cat-desbrozadoras', brandId: 'brand-stihl', model: 'FS 130', costPrice: 5500, salePrice: 7800, minStock: 3, description: 'Desbrozadora profesional para maleza densa y arbustos. Ideal para uso intensivo.', attributes: [{ key: 'Potencia', value: '1.3 kW' }, { key: 'Cilindrada', value: '36.3 cc' }] },
    { id: 'prod-husq545', sku: 'HUS-545FX', name: 'Desbrozadora Husqvarna 545FX', categoryId: 'cat-desbrozadoras', brandId: 'brand-husqvarna', model: '545FX', costPrice: 6800, salePrice: 9500, minStock: 2, description: 'Desbrozadora de alta potencia con sistema de vibración reducida.', attributes: [{ key: 'Potencia', value: '1.7 kW' }, { key: 'Cilindrada', value: '45.7 cc' }] },
    { id: 'prod-sr430', sku: 'STH-SR430', name: 'Fumigadora de Mochila STIHL SR 430', categoryId: 'cat-fumigadoras', brandId: 'brand-stihl', model: 'SR 430', costPrice: 8500, salePrice: 12000, minStock: 3, description: 'Atomizador de motor a gasolina para aplicación de agroquímicos en cultivos.', attributes: [{ key: 'Potencia', value: '0.75 kW' }, { key: 'Capacidad del depósito', value: '14.5 L' }, { key: 'Caudal', value: '790 m³/h' }] },
    { id: 'prod-solo423', sku: 'SOL-423', name: 'Fumigadora Solo 423', categoryId: 'cat-fumigadoras', brandId: 'brand-solo', model: '423', costPrice: 4200, salePrice: 5900, minStock: 5, description: 'Fumigadora de mochila de palanca manual de alta presión, 12 litros.', attributes: [{ key: 'Capacidad', value: '12 L' }, { key: 'Presión máxima', value: '3 bar' }] },
    { id: 'prod-echo-es250', sku: 'ECH-ES250', name: 'Fumigadora Echo ES-250', categoryId: 'cat-fumigadoras', brandId: 'brand-echo', model: 'ES-250', costPrice: 5800, salePrice: 8200, minStock: 4, description: 'Soplador/atomizador a gasolina para uso en huertos y jardines grandes.', attributes: [{ key: 'Cilindrada', value: '25.4 cc' }, { key: 'Capacidad', value: '16 L' }] },
    { id: 'prod-jd3032e', sku: 'JD-3032E', name: 'Tractor John Deere 3032E', categoryId: 'cat-tractores', brandId: 'brand-john-deere', model: '3032E', costPrice: 280000, salePrice: 365000, minStock: 1, description: 'Tractor compacto 4WD ideal para granjas pequeñas y medianas. Motor diesel 3 cilindros.', attributes: [{ key: 'HP', value: '32 HP' }, { key: 'Motor', value: 'Diesel 3 cil.' }, { key: 'Tracción', value: '4WD' }, { key: 'PTO', value: '540 rpm' }] },
    { id: 'prod-kubotab2601', sku: 'KUB-B2601', name: 'Tractor Kubota B2601', categoryId: 'cat-tractores', brandId: 'brand-kubota', model: 'B2601', costPrice: 245000, salePrice: 319000, minStock: 1, description: 'Tractor subcompacto versátil con cabina y 3 implementos incluidos.', attributes: [{ key: 'HP', value: '26 HP' }, { key: 'Motor', value: 'Diesel 3 cil.' }, { key: 'Tracción', value: '4WD' }] },
    { id: 'prod-riego-goteo', sku: 'RIE-GOT-KIT', name: 'Kit Riego por Goteo 1 Ha', categoryId: 'cat-riego', brandId: null, model: 'Kit 1 Ha', costPrice: 4800, salePrice: 6900, minStock: 5, description: 'Kit completo para riego por goteo para 1 hectárea de cultivo. Incluye cintilla, conectores y filtro.', attributes: [{ key: 'Área de cobertura', value: '1 Ha' }, { key: 'Espaciado goteros', value: '20 cm' }] },
    { id: 'prod-bomba-honda', sku: 'HON-WB30', name: 'Motobomba Honda WB30', categoryId: 'cat-riego', brandId: 'brand-honda', model: 'WB30', costPrice: 5200, salePrice: 7200, minStock: 4, description: 'Motobomba de agua a gasolina para riego y trasvase. Alta eficiencia y durabilidad.', attributes: [{ key: 'Potencia', value: '4 HP' }, { key: 'Caudal máximo', value: '1100 L/min' }, { key: 'Altura máxima', value: '28 m' }] },
    { id: 'prod-podadora-husq', sku: 'HUS-LC140', name: 'Podadora de Césped Husqvarna LC140', categoryId: 'cat-podadoras', brandId: 'brand-husqvarna', model: 'LC140', costPrice: 3800, salePrice: 5200, minStock: 3, description: 'Podadora autopropulsada a gasolina para jardines y parques. Ancho de corte 38 cm.', attributes: [{ key: 'Ancho de corte', value: '38 cm' }, { key: 'Motor', value: 'Honda GCV135' }, { key: 'Altura de corte', value: '25-75 mm' }] },
    { id: 'prod-barra-motosierra', sku: 'ACC-BAR-45', name: 'Barra de Repuesto 45 cm', categoryId: 'cat-accesorios', brandId: 'brand-stihl', model: 'Rollomatic E', costPrice: 450, salePrice: 680, minStock: 10, description: 'Barra guía de 45 cm compatible con motosierras STIHL MS 250 y superiores.' },
    { id: 'prod-cadena-motosierra', sku: 'ACC-CAD-63', name: 'Cadena Motosierra .325" 63 eslabones', categoryId: 'cat-accesorios', brandId: 'brand-stihl', model: '63PM', costPrice: 180, salePrice: 280, minStock: 20, description: 'Cadena de repuesto .325" para motosierras STIHL serie pequeña.' },
    { id: 'prod-casco-forestal', sku: 'SEG-CAS-FOR', name: 'Casco Forestal con Protector Facial', categoryId: 'cat-herramientas', brandId: 'brand-husqvarna', model: 'Technical', costPrice: 580, salePrice: 850, minStock: 10, description: 'Casco de seguridad con protector facial y orejeras para operadores de motosierra.' },
    { id: 'prod-guantes-trabajo', sku: 'SEG-GUA-L', name: 'Guantes de Trabajo Anticorte Talla L', categoryId: 'cat-herramientas', brandId: 'brand-truper', model: null, costPrice: 95, salePrice: 145, minStock: 30, description: 'Guantes de trabajo con palma reforzada y protección anticorte.' },
    { id: 'prod-machete', sku: 'HER-MAC-18', name: 'Machete Truper 18"', categoryId: 'cat-herramientas', brandId: 'brand-truper', model: 'Forjado 18"', costPrice: 120, salePrice: 185, minStock: 20, description: 'Machete de acero forjado de 18 pulgadas con mango de plástico antideslizante.' },
  ];

  for (const { attributes, ...p } of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        attributes: attributes ? { create: attributes } : undefined,
      }
    });
    // Add stock
    await prisma.stock.upsert({
      where: { productId_warehouseId: { productId: p.id, warehouseId: warehouse.id } },
      update: {},
      create: { productId: p.id, warehouseId: warehouse.id, quantity: Math.floor(Math.random() * 15) + 5 }
    });
  }

  // Customers
  const customers = [
    { id: 'cust-1', name: 'Rancho El Mezquite', rfc: 'REM890501XYZ', phone: '33-4567-8901', whatsapp: '3344567890', email: 'rancho.mezquite@gmail.com', type: 'MAYORISTA', city: 'Guadalajara', state: 'Jalisco', creditLimit: 50000 },
    { id: 'cust-2', name: 'Granja San Isidro', rfc: 'GSI920315ABC', phone: '33-5678-9012', whatsapp: '3355678901', email: 'granjas.sanisidro@hotmail.com', type: 'DISTRIBUIDOR', city: 'Zapopan', state: 'Jalisco', creditLimit: 100000 },
    { id: 'cust-3', name: 'Roberto García López', rfc: 'GALR850201H', phone: '33-6789-0123', whatsapp: '3366789012', type: 'PUBLICO_GENERAL', city: 'Tlaquepaque', state: 'Jalisco' },
    { id: 'cust-4', name: 'Municipio de Tonalá', rfc: 'MTO001231GO1', phone: '33-7890-1234', email: 'compras@tonala.gob.mx', type: 'GOBIERNO', city: 'Tonalá', state: 'Jalisco', creditLimit: 200000 },
    { id: 'cust-5', name: 'Vivero El Roble', rfc: 'VER010515MNP', phone: '33-8901-2345', whatsapp: '3388901234', email: 'vivero.roble@gmail.com', type: 'MAYORISTA', city: 'Tlajomulco', state: 'Jalisco', creditLimit: 30000 },
  ];
  for (const c of customers) await prisma.customer.upsert({ where: { id: c.id }, update: {}, create: c });

  // Suppliers
  const suppliers = [
    { id: 'sup-1', name: 'STIHL Mexicana S.A.', rfc: 'SME9001015Y2', contact: 'Ing. Pedro Sánchez', email: 'pedidos@stihl.com.mx', phone: '55-1234-5678', paymentTerms: 30 },
    { id: 'sup-2', name: 'Husqvarna de México', rfc: 'HME8506123B4', contact: 'Lic. Ana Torres', email: 'distribuidores@husqvarna.mx', phone: '55-2345-6789', paymentTerms: 45 },
    { id: 'sup-3', name: 'Distribuidora Agro Tools', rfc: 'DAT0112089X1', contact: 'José Martínez', email: 'ventas@agrotools.mx', phone: '33-9876-5432', paymentTerms: 15 },
  ];
  for (const s of suppliers) await prisma.supplier.upsert({ where: { id: s.id }, update: {}, create: s });

  console.log('Seed completado exitosamente');
  console.log('Admin: admin@agromaq.mx / admin123');
  console.log('Vendedor: ventas@agromaq.mx / vendedor123');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
