const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ─── COMPANY ─────────────────────────────────────────────────────────────
  await prisma.company.upsert({
    where: { id: 'company-main' },
    update: {},
    create: {
      id: 'company-main',
      name: 'San Raul Agroindustries S.A. de C.V.',
      rfc: 'SRA200101ABC',
      address: 'Carretera a El Salto Km 4.5, Parque Industrial Jalisco, Tlajomulco de Zúñiga, Jalisco C.P. 45640',
      phone: '33-3650-8800',
      email: 'ventas@sanraul.com.mx',
      regimenFiscal: '601',
      docSeries: 'SR',
      quoteTerms: 'Precios en MXN con IVA incluido. Cotización válida por 15 días hábiles. Entrega sujeta a disponibilidad de inventario. Forma de pago: 50% anticipo, 50% contra entrega.',
      quoteValidity: 15,
      quoteCurrency: 'MXN',
    }
  });

  // ─── BRANCHES ────────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { id: 'branch-main' },
    update: {},
    create: { id: 'branch-main', name: 'Casa Matriz', address: 'Carretera a El Salto Km 4.5, Tlajomulco, Jalisco', phone: '33-3650-8800' }
  });

  // ─── WAREHOUSES ──────────────────────────────────────────────────────────
  const whMain = await prisma.warehouse.upsert({
    where: { id: 'wh-main' },
    update: {},
    create: { id: 'wh-main', name: 'Bodega Principal', branchId: branch.id }
  });
  const whTienda = await prisma.warehouse.upsert({
    where: { id: 'wh-tienda' },
    update: {},
    create: { id: 'wh-tienda', name: 'Tienda / Piso de Ventas', branchId: branch.id }
  });

  // ─── USERS ───────────────────────────────────────────────────────────────
  const adminPass = await bcrypt.hash('admin123', 10);
  const vendedorPass = await bcrypt.hash('vendedor123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sanraul.com.mx' },
    update: {},
    create: { name: 'Administrador General', email: 'admin@sanraul.com.mx', password: adminPass, role: 'ADMIN' }
  });
  const vendedorUser = await prisma.user.upsert({
    where: { email: 'ventas@sanraul.com.mx' },
    update: {},
    create: { name: 'Alejandro Herrera', email: 'ventas@sanraul.com.mx', password: vendedorPass, role: 'VENDEDOR' }
  });
  await prisma.user.upsert({
    where: { email: 'almacen@sanraul.com.mx' },
    update: {},
    create: { name: 'Marco Antonio Ruiz', email: 'almacen@sanraul.com.mx', password: vendedorPass, role: 'ALMACENISTA' }
  });
  await prisma.user.upsert({
    where: { email: 'repartidor@sanraul.com.mx' },
    update: {},
    create: { name: 'Juan Delgado', email: 'repartidor@sanraul.com.mx', password: vendedorPass, role: 'REPARTIDOR' }
  });

  // ─── CATEGORIES ──────────────────────────────────────────────────────────
  const cats = [
    { id: 'cat-motosierras', name: 'Motosierras', slug: 'motosierras' },
    { id: 'cat-desbrozadoras', name: 'Desbrozadoras y Rozadoras', slug: 'desbrozadoras' },
    { id: 'cat-fumigadoras', name: 'Fumigadoras y Atomizadores', slug: 'fumigadoras' },
    { id: 'cat-tractores', name: 'Tractores Agrícolas', slug: 'tractores' },
    { id: 'cat-riego', name: 'Sistemas de Riego', slug: 'sistemas-riego' },
    { id: 'cat-podadoras', name: 'Podadoras y Corta-setos', slug: 'podadoras' },
    { id: 'cat-accesorios', name: 'Accesorios y Refacciones', slug: 'accesorios' },
    { id: 'cat-herramientas', name: 'Herramientas de Campo y Seguridad', slug: 'herramientas-campo' },
    { id: 'cat-semillas', name: 'Semillas y Agroquímicos', slug: 'semillas' },
    { id: 'cat-bodegas', name: 'Estructuras y Bodegas Agrícolas', slug: 'estructuras' },
    { id: 'cat-bombas', name: 'Bombas y Motobombas', slug: 'bombas' },
    { id: 'cat-generadores', name: 'Generadores y Plantas de Luz', slug: 'generadores' },
  ];
  for (const c of cats) {
    await prisma.category.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // ─── BRANDS ──────────────────────────────────────────────────────────────
  const brands = [
    { id: 'brand-powerhunt', name: 'PowerHunt' },
    { id: 'brand-kawashima', name: 'Kawashima' },
    { id: 'brand-blackmontana', name: 'BlackMontana' },
    { id: 'brand-kubota', name: 'Kubota' },
    { id: 'brand-stihl', name: 'STIHL' },
    { id: 'brand-husqvarna', name: 'Husqvarna' },
    { id: 'brand-honda', name: 'Honda' },
    { id: 'brand-truper', name: 'Truper' },
  ];
  for (const b of brands) {
    await prisma.brand.upsert({ where: { id: b.id }, update: {}, create: b });
  }

  // ─── PRODUCTS ────────────────────────────────────────────────────────────
  const products = [
    { id: 'prod-ph-ms45', sku: 'PH-MS45', name: 'Motosierra PowerHunt MS-4500 18"', categoryId: 'cat-motosierras', brandId: 'brand-powerhunt', model: 'MS-4500', costPrice: 2100, salePrice: 2990, minStock: 4, description: 'Motosierra a gasolina 45cc, barra 18", ideal para poda de árboles y corte de leña en rancho.', attrs: [{ key: 'Cilindrada', value: '45 cc' }, { key: 'Barra', value: '18 pulgadas' }, { key: 'Peso', value: '5.2 kg' }] },
    { id: 'prod-ph-ms58', sku: 'PH-MS58', name: 'Motosierra PowerHunt MS-5800 20"', categoryId: 'cat-motosierras', brandId: 'brand-powerhunt', model: 'MS-5800', costPrice: 3200, salePrice: 4500, minStock: 3, description: 'Motosierra semiprofesional 58cc para tala y corte en campo.', attrs: [{ key: 'Cilindrada', value: '58 cc' }, { key: 'Barra', value: '20 pulgadas' }] },
    { id: 'prod-stihl-ms250', sku: 'STH-MS250', name: 'Motosierra STIHL MS 250', categoryId: 'cat-motosierras', brandId: 'brand-stihl', model: 'MS 250', costPrice: 4200, salePrice: 5800, minStock: 3, description: 'Motosierra semiprofesional STIHL, barra 45cm, 2.3kW.', attrs: [{ key: 'Potencia', value: '2.3 kW' }, { key: 'Cilindrada', value: '45.4 cc' }] },
    { id: 'prod-kaw-db430', sku: 'KAW-DB430', name: 'Desbrozadora Kawashima DB-430 Pro', categoryId: 'cat-desbrozadoras', brandId: 'brand-kawashima', model: 'DB-430 Pro', costPrice: 2800, salePrice: 3950, minStock: 5, description: 'Desbrozadora de mochila 43cc con barra recta y cuchilla trisegmento. Ideal para orillas de caminos y potreros.', attrs: [{ key: 'Cilindrada', value: '43 cc' }, { key: 'Tipo', value: 'Mochila' }, { key: 'Peso', value: '7.8 kg' }] },
    { id: 'prod-kaw-db260', sku: 'KAW-DB260', name: 'Desbrozadora Kawashima DB-260', categoryId: 'cat-desbrozadoras', brandId: 'brand-kawashima', model: 'DB-260', costPrice: 1600, salePrice: 2280, minStock: 6, description: 'Desbrozadora de mango en U, 26cc. Perfecta para orillas de cultivos y jardines amplios.', attrs: [{ key: 'Cilindrada', value: '26 cc' }, { key: 'Mango', value: 'En U' }] },
    { id: 'prod-bm-fs120', sku: 'BM-FS120', name: 'Desbrozadora BlackMontana FS-120', categoryId: 'cat-desbrozadoras', brandId: 'brand-blackmontana', model: 'FS-120', costPrice: 3100, salePrice: 4400, minStock: 4, description: 'Desbrozadora profesional con motor 2 tiempos de 42.7cc y eje flexible.', attrs: [{ key: 'Cilindrada', value: '42.7 cc' }, { key: 'Eje', value: 'Flexible' }] },
    { id: 'prod-ph-fum18', sku: 'PH-FUM18', name: 'Fumigadora Mochila PowerHunt 18L', categoryId: 'cat-fumigadoras', brandId: 'brand-powerhunt', model: 'FM-18', costPrice: 850, salePrice: 1250, minStock: 10, description: 'Fumigadora de palanca manual 18 litros con boquilla ajustable. Sin motor a gasolina.', attrs: [{ key: 'Capacidad', value: '18 L' }, { key: 'Presión max', value: '3 bar' }] },
    { id: 'prod-kaw-atm25', sku: 'KAW-ATM25', name: 'Atomizador Kawashima KM-250', categoryId: 'cat-fumigadoras', brandId: 'brand-kawashima', model: 'KM-250', costPrice: 5500, salePrice: 7800, minStock: 3, description: 'Atomizador a gasolina 25cc para aplicación de agroquímicos en cultivos de frutales y hortalizas.', attrs: [{ key: 'Cilindrada', value: '25 cc' }, { key: 'Capacidad', value: '14 L' }, { key: 'Caudal', value: '680 m³/h' }] },
    { id: 'prod-kub-b2741', sku: 'KUB-B2741', name: 'Tractor Kubota B2741 27HP 4WD', categoryId: 'cat-tractores', brandId: 'brand-kubota', model: 'B2741', costPrice: 265000, salePrice: 345000, minStock: 1, description: 'Tractor subcompacto Kubota 27HP diesel 4WD. Incluye cargador frontal y enganche de 3 puntos.', attrs: [{ key: 'HP', value: '27 HP' }, { key: 'Motor', value: 'Diesel Kubota 3 cil.' }, { key: 'Tracción', value: '4WD' }, { key: 'PTO', value: '540 rpm' }] },
    { id: 'prod-kub-m7060', sku: 'KUB-M7060', name: 'Tractor Kubota M7060 70HP', categoryId: 'cat-tractores', brandId: 'brand-kubota', model: 'M7060', costPrice: 580000, salePrice: 750000, minStock: 1, description: 'Tractor utilitario Kubota 70HP ideal para labores agrícolas de mediana escala.', attrs: [{ key: 'HP', value: '70 HP' }, { key: 'Tracción', value: '4WD' }, { key: 'Cabina', value: 'Con A/C' }] },
    { id: 'prod-hon-wb30', sku: 'HON-WB30', name: 'Motobomba Honda WB30 3"', categoryId: 'cat-bombas', brandId: 'brand-honda', model: 'WB30', costPrice: 5200, salePrice: 7200, minStock: 4, description: 'Motobomba de agua a gasolina Honda 4HP, salida 3 pulgadas. Alta confiabilidad para riego agrícola.', attrs: [{ key: 'Potencia', value: '4 HP' }, { key: 'Caudal max', value: '1100 L/min' }, { key: 'Altura max', value: '28 m' }] },
    { id: 'prod-hon-wb20', sku: 'HON-WB20', name: 'Motobomba Honda WB20 2"', categoryId: 'cat-bombas', brandId: 'brand-honda', model: 'WB20', costPrice: 3800, salePrice: 5400, minStock: 5, description: 'Motobomba compacta Honda 2HP, salida 2 pulgadas. Ideal para huertos y parcelas pequeñas.', attrs: [{ key: 'Potencia', value: '2 HP' }, { key: 'Caudal max', value: '600 L/min' }] },
    { id: 'prod-kit-riego-1ha', sku: 'RIE-GOT-1HA', name: 'Kit Riego por Goteo 1 Ha', categoryId: 'cat-riego', brandId: null, model: 'Kit 1Ha', costPrice: 4800, salePrice: 6900, minStock: 5, description: 'Kit completo de riego por goteo para 1 hectárea. Incluye cintilla, conectores, filtro de malla y válvulas.', attrs: [{ key: 'Cobertura', value: '1 Ha' }, { key: 'Goteros c/', value: '20 cm' }] },
    { id: 'prod-bm-gen3500', sku: 'BM-GEN3500', name: 'Generador BlackMontana 3500W', categoryId: 'cat-generadores', brandId: 'brand-blackmontana', model: 'GEN-3500', costPrice: 8500, salePrice: 12000, minStock: 3, description: 'Generador a gasolina 3500W / 4375VA. Motor 7HP OHV con arranque eléctrico. Ideal para granjas sin red eléctrica.', attrs: [{ key: 'Potencia', value: '3500 W' }, { key: 'Motor', value: '7 HP OHV' }, { key: 'Arranque', value: 'Eléctrico' }, { key: 'Depósito', value: '15 L' }] },
    { id: 'prod-ph-gen6500', sku: 'PH-GEN6500', name: 'Generador PowerHunt 6500W', categoryId: 'cat-generadores', brandId: 'brand-powerhunt', model: 'GEN-6500', costPrice: 14000, salePrice: 19500, minStock: 2, description: 'Planta de luz a gasolina 6500W con doble toma y panel de control digital.', attrs: [{ key: 'Potencia', value: '6500 W' }, { key: 'Motor', value: '13 HP' }, { key: 'AVR', value: 'Sí' }] },
    { id: 'prod-casco-forestal', sku: 'SEG-CAS-FOR', name: 'Casco Forestal con Careta y Orejeras', categoryId: 'cat-herramientas', brandId: 'brand-husqvarna', model: 'Technical', costPrice: 580, salePrice: 850, minStock: 15, description: 'Casco certificado con protector facial de malla y orejeras abatibles. Para operadores de motosierra y desbrozadora.', attrs: [] },
    { id: 'prod-guantes-trabajo', sku: 'SEG-GUA-L', name: 'Guantes de Trabajo Anticorte Talla L', categoryId: 'cat-herramientas', brandId: 'brand-truper', model: null, costPrice: 95, salePrice: 145, minStock: 30, description: 'Guantes con palma reforzada de cuero y dorso de lycra. Protección nivel 5 anticorte.', attrs: [] },
    { id: 'prod-aceite-motosierra', sku: 'ACC-ACE-BAR', name: 'Aceite de Barra para Motosierra 1L', categoryId: 'cat-accesorios', brandId: 'brand-stihl', model: null, costPrice: 75, salePrice: 120, minStock: 40, description: 'Aceite mineral para lubricación de barra y cadena. Formulado para alta temperatura.', attrs: [] },
    { id: 'prod-cadena-325', sku: 'ACC-CAD-325', name: 'Cadena Motosierra .325" 72 eslabones', categoryId: 'cat-accesorios', brandId: 'brand-stihl', model: '63PMX', costPrice: 185, salePrice: 290, minStock: 20, description: 'Cadena de repuesto .325" 72 eslabones para motosierras medianas STIHL y compatibles.', attrs: [] },
    { id: 'prod-herbicida-glifosato', sku: 'SEM-GLI-20L', name: 'Herbicida Glifosato 20L', categoryId: 'cat-semillas', brandId: null, model: null, costPrice: 520, salePrice: 780, minStock: 20, description: 'Herbicida sistémico de amplio espectro. Cubeta 20 litros. Control de maleza de hoja ancha y gramineas.', attrs: [{ key: 'Concentración', value: '62% SL' }, { key: 'Presentación', value: '20 L' }] },
  ];

  for (const { attrs, ...p } of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        attributes: attrs && attrs.length > 0 ? { create: attrs.map(a => ({ key: a.key, value: a.value })) } : undefined,
      }
    });

    const qtyMain = Math.floor(Math.random() * 12) + 5
    const qtyTienda = Math.floor(Math.random() * 5) + 1

    await prisma.stock.upsert({
      where: { productId_warehouseId: { productId: p.id, warehouseId: whMain.id } },
      update: {},
      create: { productId: p.id, warehouseId: whMain.id, quantity: qtyMain }
    });
    await prisma.stock.upsert({
      where: { productId_warehouseId: { productId: p.id, warehouseId: whTienda.id } },
      update: {},
      create: { productId: p.id, warehouseId: whTienda.id, quantity: qtyTienda }
    });

    // Inventory movement for initial stock
    const existingMov = await prisma.inventoryMovement.findFirst({ where: { productId: p.id, reference: 'CARGA-INICIAL' } })
    if (!existingMov) {
      await prisma.inventoryMovement.create({
        data: {
          productId: p.id,
          warehouseId: whMain.id,
          type: 'ENTRADA',
          quantity: qtyMain,
          reference: 'CARGA-INICIAL',
          notes: 'Carga inicial de inventario - Seed San Raul',
          userId: adminUser.id,
          costPrice: p.costPrice,
        }
      })
    }
  }

  // ─── CUSTOMERS ───────────────────────────────────────────────────────────
  const customers = [
    { id: 'cust-1', name: 'Rancho El Mezquite S.P.R.', rfc: 'REM890501XYZ', phone: '33-4567-8901', whatsapp: '3344567890', email: 'rancho.mezquite@gmail.com', type: 'MAYORISTA', city: 'Guadalajara', state: 'Jalisco', creditLimit: 80000 },
    { id: 'cust-2', name: 'Granja San Isidro S.A. de C.V.', rfc: 'GSI920315ABC', phone: '33-5678-9012', whatsapp: '3355678901', email: 'compras@granjasanisidro.mx', type: 'DISTRIBUIDOR', city: 'Zapopan', state: 'Jalisco', creditLimit: 150000 },
    { id: 'cust-3', name: 'Roberto García López', rfc: 'GALR850201H01', phone: '33-6789-0123', whatsapp: '3366789012', type: 'PUBLICO_GENERAL', city: 'Tlaquepaque', state: 'Jalisco' },
    { id: 'cust-4', name: 'Municipio de Tonalá — Parques y Jardines', rfc: 'MTO001231GO1', phone: '33-7890-1234', email: 'compras@tonala.gob.mx', type: 'GOBIERNO', city: 'Tonalá', state: 'Jalisco', creditLimit: 300000 },
    { id: 'cust-5', name: 'Vivero El Roble S.A.', rfc: 'VER010515MNP', phone: '33-8901-2345', whatsapp: '3388901234', email: 'contacto@viveroelroble.mx', type: 'MAYORISTA', city: 'Tlajomulco', state: 'Jalisco', creditLimit: 50000 },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({ where: { id: c.id }, update: {}, create: c });
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────
  const suppliers = [
    { id: 'sup-1', name: 'PowerHunt Mexico S.A. de C.V.', rfc: 'PHM1908125Y2', contact: 'Ing. Roberto Salcedo', email: 'pedidos@powerhunt.mx', phone: '55-1234-5678', paymentTerms: 30 },
    { id: 'sup-2', name: 'Kawashima Distribuciones', rfc: 'KDI0006123B4', contact: 'Lic. Mónica Vega', email: 'distribuidores@kawashima.mx', phone: '55-2345-6789', paymentTerms: 45 },
    { id: 'sup-3', name: 'STIHL Mexicana S.A.', rfc: 'SME9001015Y2', contact: 'Ing. Pedro Sánchez', email: 'pedidos@stihl.com.mx', phone: '55-3456-7890', paymentTerms: 30 },
  ];
  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { id: s.id }, update: {}, create: s });
  }

  // ─── QUOTES ──────────────────────────────────────────────────────────────
  const q1Exists = await prisma.quote.findUnique({ where: { folio: 'SR-COT-0001' } })
  if (!q1Exists) {
    await prisma.quote.create({
      data: {
        folio: 'SR-COT-0001',
        customerId: 'cust-1',
        userId: vendedorUser.id,
        status: 'ENVIADA',
        currency: 'MXN',
        notes: 'Cliente interesado en equipar brigada forestal para temporada de lluvias.',
        terms: 'Precios en MXN con IVA incluido. Cotización válida por 15 días hábiles.',
        subtotal: 28793.10,
        tax: 4606.90,
        total: 33400.00,
        validUntil: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { productId: 'prod-ph-ms45', description: 'Motosierra PowerHunt MS-4500 18"', quantity: 3, unitPrice: 2990, discount: 0, tax: 16, subtotal: 8970, total: 8970 },
            { productId: 'prod-kaw-db430', description: 'Desbrozadora Kawashima DB-430 Pro', quantity: 4, unitPrice: 3950, discount: 0, tax: 16, subtotal: 15800, total: 15800 },
            { productId: 'prod-casco-forestal', description: 'Casco Forestal con Careta y Orejeras', quantity: 5, unitPrice: 850, discount: 0, tax: 16, subtotal: 4250, total: 4250 },
            { productId: 'prod-guantes-trabajo', description: 'Guantes de Trabajo Anticorte Talla L', quantity: 10, unitPrice: 145, discount: 5, tax: 16, subtotal: 1378, total: 1378 },
          ]
        }
      }
    })
  }

  const q2Exists = await prisma.quote.findUnique({ where: { folio: 'SR-COT-0002' } })
  if (!q2Exists) {
    await prisma.quote.create({
      data: {
        folio: 'SR-COT-0002',
        customerId: 'cust-4',
        userId: vendedorUser.id,
        status: 'BORRADOR',
        currency: 'MXN',
        notes: 'Municipio requiere equipos para mantenimiento de áreas verdes.',
        terms: 'Precios en MXN con IVA incluido. Requiere orden de compra municipal.',
        subtotal: 47500,
        tax: 7600,
        total: 55100,
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { productId: 'prod-kub-b2741', description: 'Tractor Kubota B2741 27HP 4WD', quantity: 1, unitPrice: 345000, discount: 0, tax: 16, subtotal: 345000, total: 345000 },
            { productId: 'prod-kaw-db260', description: 'Desbrozadora Kawashima DB-260', quantity: 5, unitPrice: 2280, discount: 0, tax: 16, subtotal: 11400, total: 11400 },
          ]
        }
      }
    })
  }

  // ─── ORDER (entregado) + SHIPMENT + PAGO + CAJA ──────────────────────────
  const orderExists = await prisma.order.findUnique({ where: { folio: 'SR-VTA-0001' } })
  if (!orderExists) {
    const order = await prisma.order.create({
      data: {
        folio: 'SR-VTA-0001',
        channel: 'TIENDA_FISICA',
        status: 'ENTREGADO',
        customerId: 'cust-2',
        userId: vendedorUser.id,
        paymentMethod: 'TRANSFERENCIA',
        subtotal: 16300,
        tax: 2608,
        total: 18908,
        paidAmount: 18908,
        notes: 'Primera compra de la temporada. Cliente pagó por transferencia.',
        items: {
          create: [
            { productId: 'prod-ph-ms58', description: 'Motosierra PowerHunt MS-5800 20"', quantity: 2, unitPrice: 4500, discount: 0, tax: 16, subtotal: 9000, total: 9000 },
            { productId: 'prod-hon-wb30', description: 'Motobomba Honda WB30 3"', quantity: 1, unitPrice: 7200, discount: 0, tax: 16, subtotal: 7200, total: 7200 },
            { productId: 'prod-aceite-motosierra', description: 'Aceite de Barra para Motosierra 1L', quantity: 4, unitPrice: 120, discount: 0, tax: 16, subtotal: 480, total: 480 },
            { productId: 'prod-guantes-trabajo', description: 'Guantes de Trabajo Anticorte Talla L', quantity: 2, unitPrice: 145, discount: 0, tax: 16, subtotal: 290, total: 290 },
          ]
        },
        payments: {
          create: [{
            amount: 18908,
            method: 'TRANSFERENCIA',
            reference: 'SPEI-2024-0821',
            notes: 'Transferencia recibida 08:45 AM',
          }]
        },
        shipment: {
          create: {
            status: 'ENTREGADA',
            carrier: 'Reparto Propio',
            assignedTo: 'Juan Delgado',
            notes: 'Entrega en almacén del cliente. Firmó de conformidad.',
            deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          }
        }
      }
    })

    // Movimiento de inventario por salida de pedido
    const orderItems = [
      { productId: 'prod-ph-ms58', qty: 2 },
      { productId: 'prod-hon-wb30', qty: 1 },
      { productId: 'prod-aceite-motosierra', qty: 4 },
      { productId: 'prod-guantes-trabajo', qty: 2 },
    ]
    for (const item of orderItems) {
      await prisma.inventoryMovement.create({
        data: {
          productId: item.productId,
          warehouseId: whMain.id,
          type: 'SALIDA',
          quantity: item.qty,
          reference: order.folio,
          notes: `Salida por venta ${order.folio}`,
          userId: vendedorUser.id,
        }
      })
      await prisma.stock.updateMany({
        where: { productId: item.productId, warehouseId: whMain.id },
        data: { quantity: { decrement: item.qty } }
      })
    }

    // Caja del día
    const cashReg = await prisma.cashRegister.create({
      data: {
        userId: adminUser.id,
        branchId: branch.id,
        openAmount: 5000,
        closeAmount: 23908,
        openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        notes: 'Corte normal. Transferencia SR-VTA-0001 + efectivo mostrador.',
      }
    })

    // Gasto de ese día
    await prisma.expense.create({
      data: {
        cashRegisterId: cashReg.id,
        concept: 'Combustible unidad reparto',
        amount: 600,
        category: 'OPERACION',
        notes: 'Gasolina camioneta F-150 para entrega a Granja San Isidro',
      }
    })
  }

  console.log('\n✅ Seed San Raul Agroindustries completado')
  console.log('─────────────────────────────────────────')
  console.log('👤 Admin:      admin@sanraul.com.mx     / admin123')
  console.log('👤 Vendedor:   ventas@sanraul.com.mx    / vendedor123')
  console.log('👤 Almacenista: almacen@sanraul.com.mx  / vendedor123')
  console.log('👤 Repartidor: repartidor@sanraul.com.mx / vendedor123')
  console.log('─────────────────────────────────────────')
  console.log('📦 20 productos con stock en 2 almacenes')
  console.log('💬 2 cotizaciones (SR-COT-0001 enviada, SR-COT-0002 borrador)')
  console.log('🛒 1 pedido entregado SR-VTA-0001 con pago, entrega y corte de caja')
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
