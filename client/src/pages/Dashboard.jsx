import { useEffect, useState } from 'react'
import api from '../lib/api'
import { DollarSign, ShoppingCart, AlertTriangle, Truck, TrendingUp, Package, FileText, Download, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts'

const GREEN = '#1a5c2a'
const GREENS = ['#1a5c2a', '#2e7d32', '#43a047', '#66bb6a', '#a5d6a7', '#c8e6c9']
const fmt = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
const CHANNEL_LABELS = { TIENDA_FISICA: 'Tienda', MERCADO_LIBRE: 'ML', AMAZON: 'Amazon', WHATSAPP: 'WhatsApp', WEB: 'Web' }

function KPI({ label, value, sub, icon: Icon, color = 'text-green-700', bg = 'bg-green-50' }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`${bg} p-3 rounded-xl`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const downloadDashboardExcel = async () => {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/reports/export/sales', { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dashboard-ventas.xlsx'; a.click()
  } catch { alert('Error al exportar') }
}

const downloadDashboardPDF = async (data) => {
  if (!data) return
  const { jsPDF } = await import('jspdf')
  if (!jsPDF) { alert('PDF no disponible'); return }
  try {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setTextColor(26, 92, 42)
    doc.text('Reporte Dashboard', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-MX')}`, 14, 28)
    doc.setFontSize(12); doc.setTextColor(0)
    doc.text(`Ventas Hoy: $${parseFloat(data.todaySales?._sum?.total || 0).toLocaleString('es-MX')}`, 14, 42)
    doc.text(`Ventas del Mes: $${parseFloat(data.monthSales?._sum?.total || 0).toLocaleString('es-MX')}`, 14, 52)
    doc.text(`Pedidos Pendientes: ${data.pendingOrders || 0}`, 14, 62)
    doc.text(`Alertas de Stock: ${data.lowStockItems?.length || 0}`, 14, 72)
    doc.save('dashboard.pdf')
  } catch { alert('Error al generar PDF') }
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [salesReport, setSalesReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const from = new Date(); from.setDate(1); const fromStr = from.toISOString().split('T')[0]
    const toStr = new Date().toISOString().split('T')[0]
    Promise.all([
      api.get('/dashboard').catch(() => ({ data: {} })),
      api.get(`/reports/sales?from=${fromStr}&to=${toStr}`).catch(() => ({ data: {} })),
    ]).then(([d, r]) => {
      setData(d.data)
      setSalesReport(r.data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
    </div>
  )

  const channelData = (salesReport?.byChannel || []).map(c => ({
    name: CHANNEL_LABELS[c.channel] || c.channel,
    Ventas: parseFloat(c.total || 0),
    Pedidos: c.count,
  }))

  const dailyData = (salesReport?.byDay || []).map(d => ({
    fecha: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    Ventas: parseFloat(d.total || 0),
  }))

  const categoryData = (salesReport?.byCategory || []).slice(0, 6).map((c, i) => ({
    name: c.category,
    value: parseFloat(c.total || 0),
    fill: GREENS[i % GREENS.length],
  }))

  const topProducts = salesReport?.byProduct?.slice(0, 10) || []
  const maxProd = topProducts[0]?.total || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Resumen operativo — {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadDashboardExcel} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" /> Excel
          </button>
          <button onClick={() => downloadDashboardPDF(data)} className="btn-secondary flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Ventas Hoy" value={fmt(data?.todaySales?._sum?.total)} sub={`${data?.todaySales?._count || 0} pedidos`} icon={DollarSign} />
        <KPI label="Ventas del Mes" value={fmt(data?.monthSales?._sum?.total)} sub={`${data?.monthSales?._count || 0} pedidos`} icon={TrendingUp} />
        <KPI label="Pedidos Pendientes" value={data?.pendingOrders || 0} sub="Por procesar" icon={ShoppingCart} color="text-yellow-600" bg="bg-yellow-50" />
        <KPI label="Entregas Pendientes" value={data?.pendingDeliveries || 0} sub="Sin completar" icon={Truck} color="text-blue-600" bg="bg-blue-50" />
        <KPI label="Productos Activos" value={data?.activeProducts || 0} sub="En catálogo" icon={Package} color="text-purple-600" bg="bg-purple-50" />
        <KPI label="Clientes" value={data?.totalCustomers || 0} sub="Registrados" icon={Users} color="text-indigo-600" bg="bg-indigo-50" />
        <KPI label="Cotizaciones Mes" value={data?.monthQuotes || 0} sub="Generadas" icon={FileText} color="text-orange-600" bg="bg-orange-50" />
        <KPI label="Alertas Stock" value={data?.lowStockItems?.length || 0} sub="Productos bajos" icon={AlertTriangle} color={data?.lowStockItems?.length > 0 ? 'text-red-600' : 'text-gray-400'} bg={data?.lowStockItems?.length > 0 ? 'bg-red-50' : 'bg-gray-50'} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by day */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Ventas por Día (Mes Actual)</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [fmt(v), 'Ventas']} />
                <Area type="monotone" dataKey="Ventas" stroke={GREEN} fill="url(#salesGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <TrendingUp className="h-12 w-12 mb-2" />
              <p className="text-sm">Sin ventas este mes</p>
            </div>
          )}
        </div>

        {/* Sales by channel */}
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
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <ShoppingCart className="h-12 w-12 mb-2" />
              <p className="text-sm">Sin datos de canales</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-4">Top Productos por Venta (Mes)</h2>
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
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Package className="h-12 w-12 mb-2" />
              <p className="text-sm">Sin ventas este mes</p>
            </div>
          )}
        </div>

        {/* Sales by category pie + stock alerts */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Ventas por Categoría</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {categoryData.map((c, i) => <Cell key={i} fill={c.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-300 py-8 text-sm">Sin datos</p>
            )}
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <h2 className="font-semibold text-gray-700 text-sm">Alertas de Stock Bajo</h2>
            </div>
            {data?.lowStockItems?.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {data.lowStockItems.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{s.product?.name}</p>
                      <p className="text-xs text-gray-400">{s.warehouse?.name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {s.quantity} uds
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-gray-300 py-3 text-sm">Sin alertas</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
