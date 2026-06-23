/**
 * pdf.js — Branded PDF generator for AgroMaq / San Raul Agroindustries
 * Uses jsPDF + jspdf-autotable
 *
 * Brand palette:
 *   Primary green  : [15, 42, 22]   #0f2a16
 *   Accent green   : [34, 197, 94]  #22c55e
 *   Dark text      : [20, 30, 25]
 *   Light gray     : [248, 250, 248]
 *   Table stripe   : [245, 250, 246]
 */

const BRAND = {
  dark:       [15, 42, 22],
  mid:        [22, 101, 52],
  accent:     [34, 197, 94],
  accentLight:[209, 250, 229],
  white:      [255, 255, 255],
  text:       [20, 30, 25],
  subtext:    [100, 115, 105],
  border:     [220, 232, 223],
  stripe:     [245, 251, 247],
  danger:     [220, 38, 38],
  warning:    [217, 119, 6],
}

async function getJsPDF() {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  return jsPDF
}

function fmt(v) {
  return `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

/** Draw page header with brand bar, logo text, company info and document title */
function drawHeader(doc, company, title, folio, date) {
  const W = doc.internal.pageSize.getWidth()

  // Top color bar
  doc.setFillColor(...BRAND.dark)
  doc.rect(0, 0, W, 28, 'F')

  // Accent stripe
  doc.setFillColor(...BRAND.accent)
  doc.rect(0, 28, W, 3, 'F')

  // Brand name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...BRAND.white)
  doc.text(company?.name || 'AgroMaq', 14, 12)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...BRAND.accentLight)
  doc.text(company?.address || 'Tlajomulco de Zúñiga, Jalisco', 14, 20)

  // RFC + contact right side
  doc.setFontSize(7.5)
  doc.setTextColor(...BRAND.accentLight)
  const rfcLine = `RFC: ${company?.rfc || ''}`
  const telLine = `Tel: ${company?.phone || ''}  •  ${company?.email || ''}`
  doc.text(rfcLine, W - 14, 11, { align: 'right' })
  doc.text(telLine, W - 14, 18, { align: 'right' })

  // Document title block
  doc.setFillColor(...BRAND.stripe)
  doc.rect(0, 31, W, 22, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BRAND.dark)
  doc.text(title, 14, 44)

  if (folio) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...BRAND.mid)
    doc.text(`# ${folio}`, W - 14, 40, { align: 'right' })
  }
  if (date) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND.subtext)
    doc.text(fmtDate(date), W - 14, 48, { align: 'right' })
  }

  return 60 // y after header
}

/** Two-column info box */
function drawInfoBox(doc, y, leftData, rightData) {
  const W = doc.internal.pageSize.getWidth()
  const colW = (W - 28) / 2

  doc.setFillColor(...BRAND.white)
  doc.setDrawColor(...BRAND.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y, W - 28, 28, 2, 2, 'FD')

  const drawColumn = (data, x) => {
    let cy = y + 7
    data.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...BRAND.subtext)
      doc.text(label.toUpperCase(), x, cy)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...BRAND.text)
      doc.text(String(value || '—'), x, cy + 5)
      cy += 12
    })
  }

  drawColumn(leftData, 18)
  if (rightData) {
    // Vertical divider
    doc.setDrawColor(...BRAND.border)
    doc.setLineWidth(0.3)
    doc.line(14 + colW, y + 4, 14 + colW, y + 24)
    drawColumn(rightData, 14 + colW + 6)
  }

  return y + 32
}

/** Draw items table */
function drawTable(doc, y, columns, rows, options = {}) {
  doc.autoTable({
    startY: y,
    head: [columns.map(c => c.header)],
    body: rows,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND.dark,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: BRAND.stripe,
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.align || 'left', cellWidth: c.width || 'auto' }])
    ),
    ...options,
  })
  return doc.lastAutoTable.finalY + 6
}

/** Totals block aligned right */
function drawTotals(doc, y, lines) {
  const W = doc.internal.pageSize.getWidth()
  const boxW = 80
  const x = W - 14 - boxW

  doc.setFillColor(...BRAND.stripe)
  doc.setDrawColor(...BRAND.border)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, boxW, lines.length * 10 + 8, 2, 2, 'FD')

  let cy = y + 9
  lines.forEach(([label, value, highlight]) => {
    doc.setFont('helvetica', highlight ? 'bold' : 'normal')
    doc.setFontSize(highlight ? 9.5 : 8.5)
    doc.setTextColor(highlight ? ...BRAND.dark : ...BRAND.subtext)
    doc.text(label, x + 4, cy)
    doc.setTextColor(...(highlight ? BRAND.mid : BRAND.text))
    doc.text(value, x + boxW - 4, cy, { align: 'right' })
    if (highlight) {
      doc.setDrawColor(...BRAND.accent)
      doc.setLineWidth(0.5)
      doc.line(x, cy + 3, x + boxW, cy + 3)
    }
    cy += 10
  })

  return y + lines.length * 10 + 12
}

/** Footer with page number and legal note */
function drawFooter(doc, company, note) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const pages = doc.internal.getNumberOfPages()

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)

    // Footer bar
    doc.setFillColor(...BRAND.dark)
    doc.rect(0, H - 14, W, 14, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.accentLight)
    doc.text(note || `${company?.name || 'AgroMaq'} · ${company?.rfc || ''} · Documento generado el ${fmtDate(new Date())}`, 14, H - 5)
    doc.text(`Pág. ${i} / ${pages}`, W - 14, H - 5, { align: 'right' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  QUOTE PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generateQuotePDF(quote, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, company, 'COTIZACIÓN', quote.folio, quote.createdAt)

  // Client + validity info
  y = drawInfoBox(doc, y,
    [
      ['Cliente', quote.customer?.name || 'Público General'],
      ['RFC', quote.customer?.rfc || 'XAXX010101000'],
    ],
    [
      ['Vigencia', quote.validUntil ? fmtDate(quote.validUntil) : `${company?.quoteValidity || 15} días`],
      ['Moneda', quote.currency || 'MXN'],
    ]
  )

  // Items
  y = drawTable(doc, y,
    [
      { header: '#',         align: 'center', width: 10 },
      { header: 'SKU',       align: 'left',   width: 28 },
      { header: 'Descripción', align: 'left' },
      { header: 'Cant.',     align: 'center', width: 16 },
      { header: 'Precio',    align: 'right',  width: 28 },
      { header: 'Desc.',     align: 'right',  width: 18 },
      { header: 'Subtotal',  align: 'right',  width: 28 },
    ],
    quote.items.map((item, i) => [
      i + 1,
      item.product?.sku || '',
      item.product?.name || item.description || '',
      item.quantity,
      fmt(item.price),
      item.discount > 0 ? fmt(item.discount) : '—',
      fmt(item.subtotal),
    ])
  )

  // Totals
  const lines = [
    ['Subtotal', fmt(quote.subtotal)],
  ]
  if (parseFloat(quote.discount) > 0) lines.push(['Descuento', `- ${fmt(quote.discount)}`])
  if (parseFloat(quote.tax) > 0) lines.push(['IVA 16%', fmt(quote.tax)])
  lines.push(['TOTAL', fmt(quote.total), true])
  y = drawTotals(doc, y, lines)

  // Terms
  if (quote.terms || company?.quoteTerms) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.subtext)
    doc.text('Términos y Condiciones', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.subtext)
    const termsText = quote.terms || company?.quoteTerms || ''
    const lines2 = doc.splitTextToSize(termsText, 180)
    doc.text(lines2, 14, y + 6)
  }

  // Notes
  if (quote.notes) {
    y += 10
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.subtext)
    doc.text(`Nota: ${quote.notes}`, 14, y)
  }

  drawFooter(doc, company, `Cotización válida ${company?.quoteValidity || 15} días. Precios en ${quote.currency || 'MXN'} sin IVA salvo indicación.`)
  doc.save(`Cotizacion-${quote.folio}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  ORDER / REMISION PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generateOrderPDF(order, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, company, 'NOTA DE VENTA', order.folio, order.createdAt)

  const STATUS_MAP = {
    NUEVO: 'Nuevo', CONFIRMADO: 'Confirmado', EN_PREPARACION: 'En Preparación',
    ENVIADO: 'Enviado', ENTREGADO: 'Entregado', CANCELADO: 'Cancelado',
  }

  y = drawInfoBox(doc, y,
    [
      ['Cliente', order.customer?.name || 'Público General'],
      ['RFC', order.customer?.rfc || 'XAXX010101000'],
    ],
    [
      ['Forma de pago', order.paymentMethod || '—'],
      ['Estado', STATUS_MAP[order.status] || order.status],
    ]
  )

  y = drawTable(doc, y,
    [
      { header: '#',         align: 'center', width: 10 },
      { header: 'SKU',       align: 'left',   width: 28 },
      { header: 'Producto',  align: 'left' },
      { header: 'Cant.',     align: 'center', width: 16 },
      { header: 'Precio',    align: 'right',  width: 28 },
      { header: 'Subtotal',  align: 'right',  width: 28 },
    ],
    order.items.map((item, i) => [
      i + 1,
      item.product?.sku || '',
      item.product?.name || '',
      item.quantity,
      fmt(item.price),
      fmt(item.subtotal),
    ])
  )

  const totLines = [['Subtotal', fmt(order.subtotal)]]
  if (parseFloat(order.discount) > 0) totLines.push(['Descuento', `- ${fmt(order.discount)}`])
  if (parseFloat(order.tax) > 0) totLines.push(['IVA 16%', fmt(order.tax)])
  totLines.push(['TOTAL', fmt(order.total), true])
  drawTotals(doc, y, totLines)

  drawFooter(doc, company)
  doc.save(`Venta-${order.folio}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  DELIVERY NOTE PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDeliveryPDF(shipment, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const order = shipment.order

  let y = drawHeader(doc, company, 'NOTA DE ENTREGA', `E-${shipment.id.slice(-6).toUpperCase()}`, shipment.createdAt)

  y = drawInfoBox(doc, y,
    [
      ['Cliente', order?.customer?.name || 'Cliente'],
      ['Dirección', order?.shippingAddress || '—'],
    ],
    [
      ['Repartidor', shipment.assignedTo || '—'],
      ['Fecha entrega', shipment.scheduledAt ? fmtDate(shipment.scheduledAt) : '—'],
    ]
  )

  y = drawTable(doc, y,
    [
      { header: '#',        align: 'center', width: 10 },
      { header: 'SKU',      align: 'left',   width: 30 },
      { header: 'Producto', align: 'left' },
      { header: 'Cantidad', align: 'center', width: 22 },
      { header: 'Notas',    align: 'left',   width: 40 },
    ],
    (order?.items || []).map((item, i) => [
      i + 1,
      item.product?.sku || '',
      item.product?.name || '',
      item.quantity,
      '',
    ])
  )

  // Signature boxes
  const W = doc.internal.pageSize.getWidth()
  const bY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : y + 20
  doc.setDrawColor(...BRAND.border)
  doc.setLineWidth(0.4)
  const boxW = 55
  const boxes = [
    { label: 'Entregó', x: 14 },
    { label: 'Recibió', x: 14 + boxW + 10 },
    { label: 'Conforme', x: 14 + (boxW + 10) * 2 },
  ]
  boxes.forEach(b => {
    doc.line(b.x, bY + 20, b.x + boxW, bY + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...BRAND.subtext)
    doc.text(b.label, b.x + boxW / 2, bY + 26, { align: 'center' })
  })

  drawFooter(doc, company)
  doc.save(`Entrega-${shipment.id.slice(-6).toUpperCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  PURCHASE ORDER PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePurchasePDF(purchase, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, company, 'ORDEN DE COMPRA', purchase.folio, purchase.createdAt)

  y = drawInfoBox(doc, y,
    [
      ['Proveedor', purchase.supplier?.name || '—'],
      ['RFC Proveedor', purchase.supplier?.rfc || '—'],
    ],
    [
      ['Estado', purchase.status || '—'],
      ['Fecha límite', purchase.dueDate ? fmtDate(purchase.dueDate) : '—'],
    ]
  )

  y = drawTable(doc, y,
    [
      { header: '#',         align: 'center', width: 10 },
      { header: 'SKU',       align: 'left',   width: 28 },
      { header: 'Producto',  align: 'left' },
      { header: 'Cant.',     align: 'center', width: 18 },
      { header: 'Recibido', align: 'center', width: 22 },
      { header: 'Costo U.',  align: 'right',  width: 26 },
      { header: 'Subtotal',  align: 'right',  width: 26 },
    ],
    purchase.items.map((item, i) => [
      i + 1,
      item.product?.sku || '',
      item.product?.name || '',
      item.quantity,
      item.receivedQty,
      fmt(item.unitCost),
      fmt(item.subtotal),
    ])
  )

  const totLines = [
    ['Subtotal', fmt(purchase.subtotal)],
    ['IVA', fmt(purchase.tax)],
    ['TOTAL', fmt(purchase.total), true],
  ]
  drawTotals(doc, doc.lastAutoTable.finalY + 6, totLines)

  if (purchase.notes) {
    const noteY = doc.lastAutoTable.finalY + 50
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND.subtext)
    doc.text(`Notas: ${purchase.notes}`, 14, noteY)
  }

  drawFooter(doc, company)
  doc.save(`OC-${purchase.folio}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  CASH REGISTER CORTE PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCortePDF(register, orders, expenses, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let y = drawHeader(doc, company, 'CORTE DE CAJA', `CAJA-${register.id.slice(-6).toUpperCase()}`, register.openedAt)

  const totalVentas = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const totalGastos = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const neto = totalVentas - totalGastos

  y = drawInfoBox(doc, y,
    [
      ['Cajero', register.user?.name || '—'],
      ['Apertura', fmtDate(register.openedAt)],
    ],
    [
      ['Cierre', register.closedAt ? fmtDate(register.closedAt) : 'En curso'],
      ['Fondo inicial', fmt(register.openAmount)],
    ]
  )

  // KPI summary boxes
  const kpis = [
    { label: 'Total Ventas', value: fmt(totalVentas), color: BRAND.mid },
    { label: 'Total Gastos', value: fmt(totalGastos), color: BRAND.danger },
    { label: 'Neto',         value: fmt(neto),         color: BRAND.dark },
  ]
  const W = doc.internal.pageSize.getWidth()
  const kW = (W - 28 - 8) / 3
  kpis.forEach((k, i) => {
    const kx = 14 + i * (kW + 4)
    doc.setFillColor(...BRAND.stripe)
    doc.setDrawColor(...BRAND.border)
    doc.roundedRect(kx, y, kW, 18, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND.subtext)
    doc.text(k.label, kx + kW / 2, y + 7, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...k.color)
    doc.text(k.value, kx + kW / 2, y + 15, { align: 'center' })
  })
  y += 24

  // Orders table
  y = drawTable(doc, y,
    [
      { header: 'Folio',   align: 'left',  width: 30 },
      { header: 'Cliente', align: 'left' },
      { header: 'Método',  align: 'left',  width: 30 },
      { header: 'Total',   align: 'right', width: 28 },
    ],
    orders.map(o => [o.folio, o.customer?.name || 'Público General', o.paymentMethod, fmt(o.total)])
  )

  // Expenses
  if (expenses.length) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BRAND.dark)
    doc.text('Gastos', 14, y + 2)
    y = drawTable(doc, y + 6,
      [
        { header: 'Concepto', align: 'left' },
        { header: 'Categoría', align: 'left', width: 34 },
        { header: 'Importe',   align: 'right', width: 28 },
      ],
      expenses.map(e => [e.concept, e.category || '—', fmt(e.amount)])
    )
  }

  drawFooter(doc, company, 'Documento generado automáticamente — Conserve para sus registros.')
  doc.save(`Corte-${register.id.slice(-6).toUpperCase()}-${new Date().toISOString().split('T')[0]}.pdf`)
}

// ─────────────────────────────────────────────────────────────────────────────
//  INVENTORY REPORT PDF
// ─────────────────────────────────────────────────────────────────────────────

export async function generateInventoryPDF(stocks, company) {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })

  let y = drawHeader(doc, company, 'REPORTE DE INVENTARIO', null, new Date())

  const totalCosto = stocks.reduce((s, st) => s + (parseFloat(st.product?.costPrice || 0) * st.quantity), 0)
  const totalVenta = stocks.reduce((s, st) => s + (parseFloat(st.product?.salePrice || 0) * st.quantity), 0)

  y = drawInfoBox(doc, y,
    [['Total SKUs', stocks.length], ['Valor costo total', fmt(totalCosto)]],
    [['Valor venta total', fmt(totalVenta)], ['Generado', fmtDate(new Date())]]
  )

  y = drawTable(doc, y,
    [
      { header: 'SKU',       align: 'left',   width: 28 },
      { header: 'Producto',  align: 'left',   width: 55 },
      { header: 'Categoría', align: 'left',   width: 30 },
      { header: 'Almacén',   align: 'left',   width: 30 },
      { header: 'Exist.',    align: 'center', width: 16 },
      { header: 'Mín.',      align: 'center', width: 14 },
      { header: 'Estado',    align: 'center', width: 20 },
      { header: 'Costo U.',  align: 'right',  width: 24 },
      { header: 'Venta U.',  align: 'right',  width: 24 },
      { header: 'Val. Total',align: 'right',  width: 28 },
    ],
    stocks.map(s => {
      const estado = s.quantity === 0 ? 'AGOTADO' : s.quantity <= s.product.minStock ? 'BAJO' : 'OK'
      return [
        s.product.sku,
        s.product.name,
        s.product.category?.name || '',
        s.warehouse.name,
        s.quantity,
        s.product.minStock,
        estado,
        fmt(s.product.costPrice),
        fmt(s.product.salePrice),
        fmt(parseFloat(s.product.costPrice) * s.quantity),
      ]
    }),
    {
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const v = data.cell.text[0]
          if (v === 'AGOTADO') data.cell.styles.textColor = BRAND.danger
          else if (v === 'BAJO') data.cell.styles.textColor = BRAND.warning
          else data.cell.styles.textColor = BRAND.mid
          data.cell.styles.fontStyle = 'bold'
        }
      }
    }
  )

  drawFooter(doc, company)
  doc.save(`Inventario-${new Date().toISOString().split('T')[0]}.pdf`)
}
