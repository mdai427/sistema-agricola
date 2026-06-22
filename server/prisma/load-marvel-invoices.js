/**
 * Carga las 9 facturas de Comercializadora Marvel como registros de Compra/Importación
 * Ejecutar: node prisma/load-marvel-invoices.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ── Proveedor: Comercializadora Marvel ───────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-marvel' },
    update: {},
    create: {
      id: 'sup-marvel',
      name: 'Comercializadora Marvel S.A. de C.V.',
      rfc: 'CMA951016VD8',
      contact: 'Ventas Marvel',
      email: 'contacto@marvelsa.com',
      phone: '33-3283-4940',
      website: 'https://marvelsa.com',
      country: 'México',
      currency: 'MXN',
      paymentTerms: 0,
    }
  });
  console.log('✅ Proveedor Marvel creado/verificado');

  // ── Datos de las 9 facturas ───────────────────────────────────────────────
  const invoices = [
    {
      ref: 'IMP-2026-001',
      invoiceNumber: 'FMA-NMX/2026/091639',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 1012.61,
      iva: 162.02,
      total: 1174.63,
      notes: 'Referencia Cocula. Origen SO311186. Pago: Transferencia BBVA 0112840928.',
      items: [
        { sku: 'CA-18PH', description: 'Compresor de aire libre de aceite Power Hunt 18Lts', hsCode: '40151601', quantity: 1, unitCost: 1149.56, totalCost: 1149.56, pedimento: '26 16 1703 6000242', fechaAduana: '2026-02-26' },
        { sku: 'GCLI-MVL', description: 'Gastos de envío (Cuenta del Cliente Marvel)', hsCode: '78102200', quantity: 1, unitCost: 1.00, totalCost: 1.00, pedimento: null, fechaAduana: null },
      ],
      pedimentoPrincipal: '26 16 1703 6000242',
    },
    {
      ref: 'IMP-2026-002',
      invoiceNumber: 'FMA-NMX/2026/091753',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 37565.84,
      iva: 0,
      total: 37565.84,
      notes: 'Referencia Cocula. IVA 0% (Art. 2A inciso E Ley IVA - uso agrícola). Origen SO311186.',
      items: [
        { sku: 'AKH20L', description: 'Aspersor híbrido 20 lts', hsCode: '21101804', quantity: 92, unitCost: 464.00, totalCost: 42688.45, pedimento: '26 16 1703 6000360', fechaAduana: '2026-03-27' },
        // Descuento por volumen 12% aplicado
      ],
      pedimentoPrincipal: '26 16 1703 6000360',
    },
    {
      ref: 'IMP-2026-003',
      invoiceNumber: 'FMA-NMX/2026/091775',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 46127.57,
      iva: 7380.41,
      total: 53507.98,
      notes: 'Referencia Cocula. Desbrozadoras + caretas protección. Origen SO311186.',
      items: [
        { sku: 'ELITE52', description: 'Desbrozador recto 52cc con cuernos y eje partido', hsCode: '21101504', quantity: 60, unitCost: 802.40, totalCost: 48202.21, pedimento: '26 16 3977 6001337', fechaAduana: '2026-02-20' },
        { sku: 'BUMBLEBI', description: 'Careta protección ultra visibilidad celda solar (BUMBLEBI)', hsCode: '46181702', quantity: 6, unitCost: 196.52, totalCost: 1179.15, pedimento: '25 16 3977 5011868', fechaAduana: '2025-10-23' },
        { sku: 'SEGURA', description: 'Careta protección ultra visibilidad celda solar (SEGURA)', hsCode: '46181702', quantity: 6, unitCost: 124.59, totalCost: 747.51, pedimento: '25 16 3977 5011868', fechaAduana: '2025-10-23' },
        { sku: 'TOPGON', description: 'Careta protección ultra visibilidad celda solar (TOPGON)', hsCode: '46181702', quantity: 6, unitCost: 199.01, totalCost: 1194.08, pedimento: '24 16 3879 4006298', fechaAduana: '2024-08-09' },
        { sku: 'ANTORCHA', description: 'Careta protección ultra visibilidad celda solar (ANTORCHA)', hsCode: '46181702', quantity: 6, unitCost: 182.46, totalCost: 1094.74, pedimento: '24 16 3879 4004553', fechaAduana: '2024-06-18' },
      ],
      pedimentoPrincipal: '26 16 3977 6001337',
    },
    {
      ref: 'IMP-2026-004',
      invoiceNumber: 'FMA-NMX/2026/091970',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 250577.29,
      iva: 26500.47,
      total: 277077.76,
      notes: 'Referencia Cocula. FACTURA PRINCIPAL - 30+ SKUs: desbrozadoras, aspersores, compresores, bombas, generadores, soldadoras, motores, hidrolavadoras, bailarina. Origen SO311186.',
      items: [
        { sku: 'GRASS52', description: 'Desbrozador 52cc Recto con cuernos', hsCode: '21101504', quantity: 60, unitCost: 683.88, totalCost: 40972.76, pedimento: '26 16 3977 6002465', fechaAduana: '2026-03-18' },
        { sku: 'AT31', description: 'Aspersor motorizado 31cc', hsCode: '21101800', quantity: 10, unitCost: 1685.22, totalCost: 16852.19, pedimento: '26 16 3977 6001638', fechaAduana: '2026-02-25' },
        { sku: 'CA-18PH', description: 'Compresor de aire libre de aceite Power Hunt 18Lts', hsCode: '40151601', quantity: 9, unitCost: 1149.56, totalCost: 10346.01, pedimento: '26 16 1703 6000242', fechaAduana: '2026-02-26' },
        { sku: 'CA-25PH', description: 'Compresor de aire libre de aceite Power Hunt 25Lts', hsCode: '40151601', quantity: 5, unitCost: 1207.94, totalCost: 6039.31, pedimento: '26 16 1703 6000473', fechaAduana: '2026-03-30' },
        { sku: 'COMPHKIT50L', description: 'Compresor 2.5hp 50lts con doble conexión rápida, kit manguera y pistola de gravedad', hsCode: '40151600', quantity: 6, unitCost: 1739.61, totalCost: 10437.64, pedimento: '26 16 3977 6004560', fechaAduana: '2026-05-08' },
        { sku: 'AKH20L', description: 'Aspersor híbrido 20 lts', hsCode: '21101804', quantity: 158, unitCost: 464.00, totalCost: 73312.77, pedimento: '26 16 1703 6000360', fechaAduana: '2026-03-27' },
        { sku: 'BK7.520', description: 'Bomba agrícola autocebante de alto caudal 2" 7.5HP aluminio 30m 32m³/h', hsCode: '40151507', quantity: 3, unitCost: 707.60, totalCost: 6368.40, pedimento: '25 16 1703 5003046', fechaAduana: '2026-01-05' },
        { sku: 'BSP.580', description: 'Bomba sumergible 1/2HP', hsCode: '40151503', quantity: 2, unitCost: 688.06, totalCost: 1376.12, pedimento: '24 51 3473 4001096', fechaAduana: '2024-09-24' },
        { sku: 'BSP1200', description: 'Bomba sumergible 1HP', hsCode: '40151503', quantity: 2, unitCost: 747.61, totalCost: 1495.21, pedimento: null, fechaAduana: null },
        { sku: 'DG-10', description: 'Dispensador de fertilizantes granulados y semillas 10 lts', hsCode: '21101603', quantity: 2, unitCost: 742.62, totalCost: 1485.23, pedimento: '25 16 1703 5001724', fechaAduana: '2025-10-28' },
        { sku: 'KPD52TOP', description: 'Desbrozador PRO 52cc 2 tiempos', hsCode: '21101504', quantity: 2, unitCost: 2231.35, totalCost: 4462.69, pedimento: '24 16 1703 4000992', fechaAduana: '2024-08-15' },
        { sku: 'KPD45TOP', description: 'Desbrozador Kawashima PRO 45cc 2 Tiempos Nueva Generación', hsCode: '21101504', quantity: 2, unitCost: 2164.50, totalCost: 4329.00, pedimento: null, fechaAduana: null },
        { sku: 'WIND43', description: 'Soplador de mochila 43cc', hsCode: '23151601', quantity: 1, unitCost: 2104.50, totalCost: 2104.50, pedimento: '26 16 1703 6000905', fechaAduana: '2026-05-21' },
        { sku: 'WIND76', description: 'Soplador de mochila 76cc', hsCode: '42192606', quantity: 1, unitCost: 3607.72, totalCost: 3607.72, pedimento: '25 16 1703 5001894', fechaAduana: '2025-12-03' },
        { sku: 'WINDBAG26', description: 'Soplador 26cc con bolsa recolectora', hsCode: '42192606', quantity: 1, unitCost: 1683.60, totalCost: 1683.60, pedimento: '25 16 3879 5000257', fechaAduana: '2025-02-05' },
        { sku: 'GP3000M', description: 'Generador Parazzini 3000W 7HP 4T', hsCode: '26111604', quantity: 1, unitCost: 3427.66, totalCost: 3427.66, pedimento: '25 16 1703 5001716', fechaAduana: '2025-10-24' },
        { sku: 'GP5500', description: 'Generador 9hp encendido manual 5500W', hsCode: '26111605', quantity: 1, unitCost: 5998.70, totalCost: 5998.70, pedimento: '25 16 1703 5001993', fechaAduana: '2026-01-20' },
        { sku: 'GPH5500W', description: 'Generador a gasolina 5500W 120/220V 15hp', hsCode: '26111604', quantity: 2, unitCost: 6864.44, totalCost: 13728.87, pedimento: '25 16 1703 5003070', fechaAduana: '2026-01-05' },
        { sku: 'GPH8000W', description: 'Generador Power Hunt 8000W', hsCode: '26111604', quantity: 1, unitCost: 8875.20, totalCost: 8875.20, pedimento: '25 16 1703 5001782', fechaAduana: '2025-11-19' },
        { sku: 'BAKARAC150', description: 'Generador soldador inverter 150A', hsCode: '26111601', quantity: 1, unitCost: 4048.63, totalCost: 4048.63, pedimento: '25 16 1703 5001418', fechaAduana: '2025-09-17' },
        { sku: 'BAKARAC200', description: 'Generador soldador inverter 200A', hsCode: '26111601', quantity: 1, unitCost: 6192.04, totalCost: 6192.04, pedimento: '26 16 1703 6000626', fechaAduana: '2026-04-02' },
        { sku: 'BAKARAC250', description: 'Generador soldador inverter 210A', hsCode: '26111601', quantity: 1, unitCost: 9773.22, totalCost: 9773.22, pedimento: '25 16 1703 5001134', fechaAduana: '2025-08-06' },
        { sku: 'PBL', description: 'Bailarina 4hp motor Loncin', hsCode: '22101505', quantity: 1, unitCost: 17236.01, totalCost: 17236.01, pedimento: '25 16 1703 5000276', fechaAduana: '2025-02-21' },
        { sku: 'COMPHKIT25L', description: 'Kit compresor 25L doble conexión rápida, manguera 3mts y pistola de gravedad', hsCode: '40151601', quantity: 2, unitCost: 1452.33, totalCost: 2904.65, pedimento: '26 16 3977 6000923', fechaAduana: '2026-02-04' },
        { sku: 'COMPHKIT50L-2', description: 'Compresor 2.5hp 50lts con doble conexión rápida (2a línea)', hsCode: '40151600', quantity: 2, unitCost: 1739.61, totalCost: 3479.21, pedimento: '26 16 3977 6004560', fechaAduana: '2026-05-08' },
        { sku: 'HPULTRA2100PRO', description: 'Hidrolavadora eléctrica 2320 PSI', hsCode: '20122821', quantity: 1, unitCost: 2205.90, totalCost: 2205.90, pedimento: null, fechaAduana: null },
        { sku: 'HP13N', description: 'Hidrolavadora a gasolina 13hp 3600 PSI', hsCode: '20122821', quantity: 1, unitCost: 10712.77, totalCost: 10712.77, pedimento: null, fechaAduana: null },
        { sku: 'MT13', description: 'Motor 13hp 4 tiempos', hsCode: '26101500', quantity: 1, unitCost: 2441.86, totalCost: 2441.86, pedimento: '26 16 3977 6004471', fechaAduana: '2026-05-16' },
        { sku: 'MP10D', description: 'Motor diesel 10hp con arranque eléctrico', hsCode: '26101504', quantity: 1, unitCost: 7038.99, totalCost: 7038.99, pedimento: '25 16 1703 5000935', fechaAduana: '2025-07-25' },
        { sku: 'MP7FF', description: 'Motor 7hp 4 tiempos con doble filtro de aire', hsCode: '26101503', quantity: 1, unitCost: 1810.04, totalCost: 1810.04, pedimento: '25 16 1703 5001993', fechaAduana: '2026-01-20' },
      ],
      pedimentoPrincipal: '26 16 3977 6002465',
    },
    {
      ref: 'IMP-2026-005',
      invoiceNumber: 'FMA-NMX/2026/091987',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 35110.12,
      iva: 5617.62,
      total: 40727.74,
      notes: 'Referencia Cocula. Zanjadora 15hp y revolvedora gasolina 1/2 saco. Origen SO311186.',
      items: [
        { sku: 'TRENCH15', description: 'Zanjadora con motor de 15hp con doble filtro de aire', hsCode: '22101508', quantity: 1, unitCost: 32882.20, totalCost: 32882.20, pedimento: '25 16 3977 5011192', fechaAduana: '2025-10-09' },
        { sku: 'REVOLVER1G', description: 'Revolvedora gasolina de 1/2 saco, volumen de olla 140 litros', hsCode: '22101901', quantity: 1, unitCost: 7015.66, totalCost: 7015.66, pedimento: null, fechaAduana: null },
      ],
      pedimentoPrincipal: '25 16 3977 5011192',
    },
    {
      ref: 'IMP-2026-006',
      invoiceNumber: 'FMA-NMX/2026/092164',
      invoiceDate: new Date('2026-06-15'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO314716',
      subtotal: 1979.00,
      iva: 0,
      total: 1979.00,
      notes: 'IVA 0% (uso agrícola). Origen SO314716. UUID CFDI: FE37D830-3FAE-5EB2-BB02-F8704DE00E7A',
      items: [
        { sku: 'BL015-100-10-3050', description: 'Cinta Bluedrip 5/8" flujo medio 1lph @10cm cal 6 mil - rollo 3,050m', hsCode: '21102301', quantity: 1, unitCost: 1979.00, totalCost: 1979.00, pedimento: '26 16 1703 6000785', fechaAduana: '2026-04-20' },
      ],
      pedimentoPrincipal: '26 16 1703 6000785',
    },
    {
      ref: 'IMP-2026-007',
      invoiceNumber: 'FMA-NMX/2026/092988',
      invoiceDate: new Date('2026-06-16'),
      deliveryDate: new Date('2026-06-16'),
      origen: 'SO314890',
      subtotal: 11969.02,
      iva: 0,
      total: 11969.02,
      notes: 'IVA 0% (uso agrícola). Origen SO314890. UUID CFDI: 97760C34-FA2A-54D1-A068-ECCEDE44F670',
      items: [
        { sku: 'AK-35GX', description: 'Aspersor motorizado 35cc motor Honda GX35', hsCode: '21101800', quantity: 2, unitCost: 5984.51, totalCost: 11969.02, pedimento: '26 16 3977 6003126', fechaAduana: '2026-05-04' },
      ],
      pedimentoPrincipal: '26 16 3977 6003126',
    },
    {
      ref: 'IMP-2026-008',
      invoiceNumber: 'FMA-NMX/2026/093146',
      invoiceDate: new Date('2026-06-16'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO314716',
      subtotal: 3208.82,
      iva: 513.41,
      total: 3722.23,
      notes: 'Origen SO314716. Discos sierra 40 dientes corte 255mm. Desc. 84.89%.',
      items: [
        { sku: 'AT3802', description: 'Disco sierra 40 dientes corte 255mm grosor 1.3mm', hsCode: '22101703', quantity: 90, unitCost: 35.65, totalCost: 3208.82, pedimento: '26 16 3977 6002965', fechaAduana: '2026-04-27' },
      ],
      pedimentoPrincipal: '26 16 3977 6002965',
    },
    {
      ref: 'IMP-2026-009',
      invoiceNumber: 'FMA-NMX/2026/093539',
      invoiceDate: new Date('2026-06-16'),
      deliveryDate: new Date('2026-06-15'),
      origen: 'SO311186',
      subtotal: 6920.94,
      iva: 479.99,
      total: 7400.93,
      notes: 'Referencia Cocula. Aceites, bomba sumergible, aspersor eléctrico 100L y discos sierra. UUID CFDI: 9A195851-3FED-5F0C-8162-8EA758D74550',
      items: [
        { sku: 'AC-425K', description: 'Aceite 2 tiempos 95ml — caja 24 piezas', hsCode: '15121500', quantity: 5, unitCost: 327.57, totalCost: 1637.85, pedimento: null, fechaAduana: null },
        { sku: 'BSPH.380', description: 'Bomba sumergible 1/3HP', hsCode: '40151503', quantity: 2, unitCost: 528.59, totalCost: 1057.17, pedimento: '25 51 3539 5006693', fechaAduana: '2026-01-23' },
        { sku: 'ATV-25', description: 'Aspersor eléctrico 100 litros', hsCode: '21101800', quantity: 1, unitCost: 4455.67, totalCost: 4455.67, pedimento: '24 16 1703 4001027', fechaAduana: '2024-07-25' },
        { sku: 'AT3802', description: 'Disco sierra 40 dientes corte 255mm grosor 1.3mm', hsCode: '22101703', quantity: 10, unitCost: 71.40, totalCost: 714.01, pedimento: '26 16 3977 6002965', fechaAduana: '2026-04-27' },
      ],
      pedimentoPrincipal: '25 51 3539 5006693',
    },
  ];

  let creados = 0;
  let omitidos = 0;

  for (const inv of invoices) {
    const existe = await prisma.import.findUnique({ where: { reference: inv.ref } });
    if (existe) {
      console.log(`⏭  ${inv.ref} (${inv.invoiceNumber}) ya existe, omitiendo`);
      omitidos++;
      continue;
    }

    await prisma.import.create({
      data: {
        reference: inv.ref,
        supplierId: supplier.id,
        status: 'RECIBIDO',
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        invoiceAmount: inv.subtotal,
        currency: 'MXN',
        exchangeRate: 1,
        deliveryDate: inv.deliveryDate,
        pedimentoNumber: inv.pedimentoPrincipal,
        notes: inv.notes,
        totalLandedCost: inv.total,
        iva: inv.iva,
        items: {
          create: inv.items.map(item => ({
            description: `[${item.sku}] ${item.description}`,
            hsCode: item.hsCode,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
            receivedQty: item.quantity, // ya recibido
          }))
        }
      }
    });

    console.log(`✅ ${inv.ref} — ${inv.invoiceNumber} — $${inv.total.toLocaleString('es-MX')} MXN — ${inv.items.length} partidas`);
    creados++;
  }

  // Resumen
  const totalFacturas = invoices.reduce((s, i) => s + i.total, 0);
  const totalPartidas = invoices.reduce((s, i) => s + i.items.length, 0);

  console.log('\n══════════════════════════════════════════════════════');
  console.log('RESUMEN DE CARGA — FACTURAS MARVEL JUNIO 2026');
  console.log('══════════════════════════════════════════════════════');
  console.log(`Facturas cargadas:  ${creados}`);
  console.log(`Facturas omitidas:  ${omitidos} (ya existían)`);
  console.log(`Total partidas:     ${totalPartidas} SKUs`);
  console.log(`Valor total:        $${totalFacturas.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`);
  console.log('──────────────────────────────────────────────────────');
  console.log('Facturas incluidas:');
  invoices.forEach(i => console.log(`  ${i.invoiceNumber.padEnd(30)} $${i.total.toLocaleString('es-MX', { minimumFractionDigits: 2 }).padStart(12)} MXN`));
  console.log('══════════════════════════════════════════════════════');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
