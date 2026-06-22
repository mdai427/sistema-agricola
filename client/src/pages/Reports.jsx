import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'
import { Loader2, Download, FileText, TrendingUp, ShoppingCart, Package, BarChart2 } from 'lucide-react'

const GREEN = '#1a5c2a'
const GREENS = ['#1a5c2a', '#2e7d32', '#43a047', '#66bb6a', '#a5d6a7', '#c8e6c9']
const CHANNEL_LABELS = { TIENDA_FISICA: 'Tienda', MERCADO_LIBRE: 'ML', AMAZON: 'Amazon', WHATSAPP: 'WA', WEB: 'Web' }
const fmt = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

const downloadExcel = async (endpoint, filename) => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  } catch { alert('Error al exportar Excel') }
}

const GREEN_RGB = [26, 92, 42]
const LIGHT_RGB = [240, 247, 241]

const downloadSalesPDF = async (data, dateFrom, dateTo) => {
  if (!data) return
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const addHeader = (title) => {
    doc.setFillColor(...GREEN_RGB)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text('AgroMaq de México', 14, 11)
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 230, 200)
    doc.text(title, 14, 20)
    doc.setTextColor(200, 230, 200)
    doc.text(`${dateFrom} — ${dateTo}`, W - 14, 20, { align: 'right' })
  }

  const addFooter = (pageNum, totalPages) => {
    doc.setFillColor(...GREEN_RGB)
    doc.rect(0, doc.internal.pageSize.getHeight() - 12, W, 12, 'F')
    doc.setTextColor(200, 230, 200); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}  ·  AgroMaq de México`, 14, doc.internal.pageSize.getHeight() - 4)
    doc.text(`Página ${pageNum} de ${totalPages}`, W - 14, doc.internal.pageSize.getHeight() - 4, { align: 'right' })
  }

  // Page 1: KPIs + channels + categories
  addHeader('Reporte de Ventas')

  // KPI boxes
  const kpis = [
    { label: 'Ingresos Totales', value: fmt(data.totalRevenue) },
    { label: 'Pedidos', value: String(data.totalOrders || 0) },
    { label: 'Ticket Promedio', value: data.totalOrders > 0 ? fmt(data.totalRevenue / data.totalOrders) : '$0' },
    { label: 'Canales Activos', value: String(data.byChannel?.length || 0) },
  ]
  const boxW = (W - 28 - 9) / 4
  kpis.forEach((k, i) => {
    const x = 14 + i * (boxW + 3)
    doc.setFillColor(...LIGHT_RGB)
    doc.roundedRect(x, 33, boxW, 22, 3, 3, 'F')
    doc.setDrawColor(...GREEN_RGB); doc.setLineWidth(0.5)
    doc.roundedRect(x, 33, boxW, 22, 3, 3, 'S')
    doc.setTextColor(120, 120, 120); doc.setFontSize(7); doc.setFont('helvetica', 'normal')
    doc.text(k.label, x + boxW / 2, 39, { align: 'center' })
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
    doc.text(k.value, x + boxW / 2, 50, { align: 'center' })
  })

  // Sales by channel table
  if (data.byChannel?.length > 0) {
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Ventas por Canal', 14, 66)
    autoTable(doc, {
      startY: 69,
      head: [['Canal', 'Pedidos', 'Total']],
      body: data.byChannel.map(c => [CHANNEL_LABELS[c.channel] || c.channel, c.count, fmt(c.total)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: GREEN_RGB, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_RGB },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30, halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // Sales by category table
  if (data.byCategory?.length > 0) {
    const y = doc.lastAutoTable?.finalY + 8 || 120
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Ventas por Categoría', 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [['Categoría', 'Unidades', 'Total']],
      body: data.byCategory.slice(0, 10).map(c => [c.category, c.qty, fmt(c.total)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: GREEN_RGB, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_RGB },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter(1, 2)

  // Page 2: Top products + orders
  doc.addPage()
  addHeader('Reporte de Ventas — Detalle')

  if (data.byProduct?.length > 0) {
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text('Top Productos Más Vendidos', 14, 36)
    autoTable(doc, {
      startY: 39,
      head: [['#', 'Producto', 'SKU', 'Cant.', 'Total']],
      body: data.byProduct.slice(0, 20).map((p, i) => [i + 1, p.product, p.sku || '-', p.qty, fmt(p.total)]),
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: GREEN_RGB, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_RGB },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 30 }, 3: { cellWidth: 18, halign: 'center' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  if (data.orders?.length > 0) {
    const y2 = doc.lastAutoTable?.finalY + 8 || 80
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(11); doc.setFont('helvetica', 'bold')
    doc.text(`Pedidos del Período (${Math.min(data.orders.length, 30)} de ${data.orders.length})`, 14, y2)
    autoTable(doc, {
      startY: y2 + 3,
      head: [['Folio', 'Fecha', 'Cliente', 'Canal', 'Total', 'Estado']],
      body: data.orders.slice(0, 30).map(o => [
        o.folio,
        new Date(o.createdAt).toLocaleDateString('es-MX'),
        (o.customer?.name || 'Público General').substring(0, 22),
        CHANNEL_LABELS[o.channel] || o.channel,
        fmt(o.total),
        o.status,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: GREEN_RGB, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: LIGHT_RGB },
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 22 }, 4: { halign: 'right' }, 5: { cellWidth: 22 } },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter(2, 2)
  doc.save(`reporte-ventas-${dateFrom}-${dateTo}.pdf`)
}

const downloadInventoryPDF = async (invData) => {
  if (!invData) return
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  const totalCost = invData.reduce((s, i) => s + (i.totalCostValue || 0), 0)
  const totalSale = invData.reduce((s, i) => s + (i.totalSaleValue || 0), 0)
  const lowStock = invData.filter(s => s.quantity > 0 && s.quantity <= s.product?.minStock).length
  const outStock = invData.filter(s => s.quantity === 0).length

  // Header
  doc.setFillColor(...GREEN_RGB); doc.rect(0, 0, W, 28, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text('AgroMaq de México', 14, 11)
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(200,230,200)
  doc.text('Reporte de Inventario', 14, 20)
  doc.text(new Date().toLocaleDateString('es-MX'), W - 14, 20, { align: 'right' })

  // KPI boxes
  const kpis = [
    { label: 'Valor Costo Total', value: fmt(totalCost) },
    { label: 'Valor Venta Total', value: fmt(totalSale) },
    { label: 'Productos Stock Bajo', value: String(lowStock) },
    { label: 'Productos Agotados', value: String(outStock) },
  ]
  const boxW = (W - 28 - 9) / 4
  kpis.forEach((k, i) => {
    const x = 14 + i * (boxW + 3)
    doc.setFillColor(...LIGHT_RGB); doc.roundedRect(x, 33, boxW, 22, 3, 3, 'F')
    doc.setDrawColor(...GREEN_RGB); doc.setLineWidth(0.5); doc.roundedRect(x, 33, boxW, 22, 3, 3, 'S')
    doc.setTextColor(120,120,120); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(k.label, x + boxW / 2, 39, { align: 'center' })
    doc.setTextColor(...GREEN_RGB); doc.setFontSize(13); doc.setFont('helvetica','bold')
    doc.text(k.value, x + boxW / 2, 50, { align: 'center' })
  })

  // Inventory table
  doc.setTextColor(...GREEN_RGB); doc.setFontSize(11); doc.setFont('helvetica','bold')
  doc.text('Existencias por Producto', 14, 64)
  autoTable(doc, {
    startY: 67,
    head: [['Producto', 'SKU', 'Categoría', 'Almacén', 'Existencia', 'Stock Mín.', 'Val. Costo', 'Val. Venta', 'Estado']],
    body: invData.map(s => {
      const status = s.quantity === 0 ? 'AGOTADO' : s.quantity <= s.product?.minStock ? 'BAJO' : 'OK'
      return [
        s.product?.name || '',
        s.product?.sku || '',
        s.product?.category?.name || '',
        s.warehouse?.name || '',
        s.quantity,
        s.product?.minStock || 0,
        fmt(s.totalCostValue),
        fmt(s.totalSaleValue),
        status,
      ]
    }),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: GREEN_RGB, textColor: [255,255,255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT_RGB },
    columnStyles: {
      4: { halign: 'center' }, 5: { halign: 'center' },
      6: { halign: 'right' }, 7: { halign: 'right' },
      8: {
        halign: 'center',
        cellWidth: 18,
      },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw
        const color = val === 'AGOTADO' ? [220,38,38] : val === 'BAJO' ? [217,119,6] : [22,163,74]
        doc.setTextColor(...color)
        doc.setFont('helvetica', 'bold')
        doc.text(val, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' })
        doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal')
        return false
      }
    },
    margin: { left: 14, right: 14 },
  })

  // Footer on all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...GREEN_RGB); doc.rect(0, H - 12, W, 12, 'F')
    doc.setTextColor(200,230,200); doc.setFontSize(7); doc.setFont('helvetica','normal')
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}  ·  AgroMaq de México`, 14, H - 4)
    doc.text(`Página ${p} de ${totalPages}`, W - 14, H - 4, { align: 'right' })
  }

  doc.save(`reporte-inventario-${new Date().toISOString().split('T')[0]}.pdf`)
}

export default function Reports() {
  const [tab, setTab] = useState('sales')
  const [loading, setLoading] = useState(false)
  const [salesData, setSalesData] = useState(null)
  const [invData, setInvData] = useState(null)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const loadSales = async () => {
    setLoading(true)
    try {
      const r = await api.get(`/reports/sales?from=${dateFrom}&to=${dateTo}`)
      setSalesData(r.data)
    } catch { setSalesData(null) }
    finally { setLoading(false) }
  }

  const loadInventory = async () => {
    setLoading(true)
    try {
      const r = await api.get('/reports/inventory')
      setInvData(r.data)
    } catch { setInvData(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { if (tab === 'sales') loadSales(); else loadInventory() }, [tab])

  // Sales chart data
  const dailyData = (salesData?.byDay || []).map(d => ({
    fecha: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    Ventas: parseFloat(d.total || 0),
  }))
  const channelData = (salesData?.byChannel || []).map(c => ({
    name: CHANNEL_LABELS[c.channel] || c.channel,
    Ventas: parseFloat(c.total || 0),
    Pedidos: c.count,
  }))
  const categoryData = (salesData?.byCategory || []).slice(0, 6).map((c, i) => ({
    name: c.category,
    value: parseFloat(c.total || 0),
    fill: GREENS[i % GREENS.length],
  }))
  const topProducts = salesData?.byProduct?.slice(0, 10) || []
  const maxProd = topProducts[0]?.total || 1

  // Inventory chart data
  const invByCat = {}
  ;(invData || []).forEach(s => {
    const cat = s.product?.category?.name || 'Sin categoría'
    invByCat[cat] = invByCat[cat] || { name: cat, Costo: 0, Venta: 0, Uds: 0 }
    invByCat[cat].Costo += s.totalCostValue || 0
    invByCat[cat].Venta += s.totalSaleValue || 0
    invByCat[cat].Uds += s.quantity || 0
  })
  const invCatData = Object.values(invByCat).sort((a, b) => b.Venta - a.Venta).slice(0, 8)
  const totalInvCost = (invData || []).reduce((s, i) => s + (i.totalCostValue || 0), 0)
  const totalInvSale = (invData || []).reduce((s, i) => s + (i.totalSaleValue || 0), 0)
  const lowStockCount = (invData || []).filter(s => s.quantity <= s.product?.minStock).length
  const outOfStock = (invData || []).filter(s => s.quantity === 0).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm">Análisis de ventas e inventario</p>
        </div>
        <div className="flex gap-2">
          {tab === 'sales' && salesData && (
            <>
              <button onClick={() => downloadExcel(`/api/reports/export/sales?from=${dateFrom}&to=${dateTo}`, 'reporte-ventas.xlsx')} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" /> Excel
              </button>
              <button onClick={() => downloadSalesPDF(salesData, dateFrom, dateTo)} className="btn-primary flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" /> PDF
              </button>
            </>
          )}
          {tab === 'inventory' && invData && (
            <>
              <button onClick={() => downloadExcel('/api/reports/export/inventory', 'reporte-inventario.xlsx')} className="btn-secondary flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" /> Excel
              </button>
              <button onClick={() => downloadInventoryPDF(invData)} className="btn-primary flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[{ id: 'sales', label: 'Ventas', icon: TrendingUp }, { id: 'inventory', label: 'Inventario', icon: Package }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Sales tab */}
      {tab === 'sales' && (
        <div className="space-y-6">
          {/* Date filters */}
          <div className="card p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Desde</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Hasta</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <button onClick={loadSales} className="btn-primary flex items-center gap-2 text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />} Consultar
            </button>
          </div>

          {loading && <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-green-700" /></div>}

          {salesData && !loading && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Ingresos Totales', value: fmt(salesData.totalRevenue), color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Pedidos', value: salesData.totalOrders || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Ticket Promedio', value: salesData.totalOrders > 0 ? fmt(salesData.totalRevenue / salesData.totalOrders) : '$0', color: 'text-purple-700', bg: 'bg-purple-50' },
                  { label: 'Canales Activos', value: salesData.byChannel?.length || 0, color: 'text-orange-700', bg: 'bg-orange-50' },
                ].map((k, i) => (
                  <div key={i} className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Ventas por Día</h2>
                  {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={dailyData}>
                        <defs>
                          <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => [fmt(v), 'Ventas']} />
                        <Area type="monotone" dataKey="Ventas" stroke={GREEN} fill="url(#rptGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-300 py-16 text-sm">Sin datos en el período</p>}
                </div>

                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Ventas por Canal</h2>
                  {channelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={channelData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={v => [fmt(v), 'Ventas']} />
                        <Bar dataKey="Ventas" fill={GREEN} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-300 py-16 text-sm">Sin datos de canales</p>}
                </div>
              </div>

              {/* Charts row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top products */}
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Top Productos</h2>
                  {topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {topProducts.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium truncate max-w-[200px]">{p.product}</span>
                              <span className="text-green-700 font-bold ml-2 shrink-0">{fmt(p.total)}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 rounded-full" style={{ width: `${(p.total / maxProd) * 100}%`, backgroundColor: GREENS[i % GREENS.length] }} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{p.qty} uds</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-center text-gray-300 py-16 text-sm">Sin ventas en el período</p>}
                </div>

                {/* Category pie */}
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Ventas por Categoría</h2>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                          {categoryData.map((c, i) => <Cell key={i} fill={c.fill} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} />
                        <Legend iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center text-gray-300 py-16 text-sm">Sin datos</p>}
                </div>
              </div>

              {/* Orders table */}
              {salesData.orders?.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Detalle de Pedidos ({salesData.orders.length})</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Folio</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Fecha</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Cliente</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Canal</th>
                          <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Total</th>
                          <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesData.orders.slice(0, 50).map((o, i) => (
                          <tr key={o.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-2 px-3 font-mono text-xs">{o.folio}</td>
                            <td className="py-2 px-3 text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString('es-MX')}</td>
                            <td className="py-2 px-3 font-medium truncate max-w-[160px]">{o.customer?.name || 'Público General'}</td>
                            <td className="py-2 px-3 text-xs">{CHANNEL_LABELS[o.channel] || o.channel}</td>
                            <td className="py-2 px-3 text-right font-bold text-green-700">{fmt(o.total)}</td>
                            <td className="py-2 px-3"><span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{o.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {salesData.orders.length > 50 && <p className="text-center text-xs text-gray-400 mt-3">Mostrando 50 de {salesData.orders.length} pedidos. Descarga Excel para ver todos.</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={loadInventory} className="btn-secondary flex items-center gap-2 text-sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />} Actualizar
            </button>
          </div>

          {loading && <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-green-700" /></div>}

          {invData && !loading && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Valor Costo Total', value: fmt(totalInvCost), color: 'text-green-700' },
                  { label: 'Valor Venta Total', value: fmt(totalInvSale), color: 'text-blue-700' },
                  { label: 'Productos Stock Bajo', value: lowStockCount, color: 'text-yellow-700' },
                  { label: 'Productos Agotados', value: outOfStock, color: 'text-red-700' },
                ].map((k, i) => (
                  <div key={i} className="card p-4">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart by category */}
              {invCatData.length > 0 && (
                <div className="card p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">Valor de Inventario por Categoría</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={invCatData} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [fmt(v)]} />
                      <Bar dataKey="Venta" fill={GREEN} radius={[6, 6, 0, 0]} name="Valor Venta" />
                      <Bar dataKey="Costo" fill="#66bb6a" radius={[6, 6, 0, 0]} name="Valor Costo" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Inventory table */}
              <div className="card p-5">
                <h2 className="font-semibold text-gray-700 mb-4">Existencias por Producto ({invData.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="w-12"></th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Producto</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">SKU</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Almacén</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Existencia</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Val. Costo</th>
                        <th className="text-right py-2 px-3 text-xs text-gray-500 font-medium">Val. Venta</th>
                        <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invData.map((s, i) => {
                        const status = s.quantity === 0 ? 'AGOTADO' : s.quantity <= s.product?.minStock ? 'BAJO' : 'OK'
                        const statusCls = status === 'AGOTADO' ? 'bg-red-100 text-red-700' : status === 'BAJO' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                        return (
                          <tr key={s.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="py-1.5 px-2">
                              {s.product?.images?.[0]?.url
                                ? <img src={s.product.images[0].url} alt="" className="h-9 w-9 rounded-lg object-cover border" />
                                : <div className="h-9 w-9 rounded-lg bg-gray-100 border" />}
                            </td>
                            <td className="py-2 px-3 font-medium">{s.product?.name}</td>
                            <td className="py-2 px-3 font-mono text-xs text-gray-500">{s.product?.sku}</td>
                            <td className="py-2 px-3 text-xs">{s.warehouse?.name}</td>
                            <td className="py-2 px-3 text-right font-bold">{s.quantity}</td>
                            <td className="py-2 px-3 text-right text-xs">{fmt(s.totalCostValue)}</td>
                            <td className="py-2 px-3 text-right text-xs text-green-700 font-medium">{fmt(s.totalSaleValue)}</td>
                            <td className="py-2 px-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{status}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
