import { useEffect, useState } from 'react'
import api from '../lib/api'
import {
  DollarSign, ShoppingCart, AlertTriangle, Truck, TrendingUp,
  Package, FileText, ArrowUpRight, ArrowDownRight, Users, Zap
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const G = { dark: '#166534', mid: '#16a34a', light: '#4ade80', pale: '#dcfce7' }
const PALETTE = ['#166534','#15803d','#16a34a','#22c55e','#4ade80','#86efac','#bbf7d0']
const fmt   = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
const CHAN  = { TIENDA_FISICA: 'Tienda', MERCADO_LIBRE: 'ML', AMAZON: 'Amazon', WHATSAPP: 'WhatsApp', WEB: 'Web' }

function KPI({ label, value, sub, icon: Icon, iconBg, iconColor, trend }) {
  return (
    <div className="kpi-card group">
      <div className={`kpi-icon ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold self-start mt-1 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{fmt(p.value)}</strong></p>
      ))}
    </div>
  )
}

function ChartCard({ title, children, action }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyChart({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center justify-center h-44 text-muted-foreground/30">
      <Icon size={40} className="mb-2" />
      <p className="text-xs">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [sales, setSales] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const from = new Date(); from.setDate(1)
    const fromStr = from.toISOString().split('T')[0]
    const toStr   = new Date().toISOString().split('T')[0]
    Promise.all([
      api.get('/dashboard').catch(() => ({ data: {} })),
      api.get('/reports/sales', { params: { from: fromStr, to: toStr } }).catch(() => ({ data: {} })),
    ]).then(([d, r]) => {
      setData(d.data)
      setSales(r.data)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
  )

  const dailyData  = (sales?.byDay || []).map(d => ({
    fecha: new Date(d.date + 'T12:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    Ventas: parseFloat(d.total || 0),
  }))
  const channelData = (sales?.byChannel || []).map(c => ({
    name: CHAN[c.channel] || c.channel,
    Ventas: parseFloat(c.total || 0),
  }))
  const categoryData = (sales?.byCategory || []).slice(0, 6).map((c, i) => ({
    name: c.category, value: parseFloat(c.total || 0), fill: PALETTE[i]
  }))
  const topProds   = sales?.byProduct?.slice(0, 8) || []
  const maxProd    = topProds[0]?.total || 1

  const today    = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayTotal = parseFloat(data?.todaySales?._sum?.total || 0)
  const monthTotal = parseFloat(data?.monthSales?._sum?.total || 0)
  const alertCount = data?.lowStockItems?.length || 0

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-green badge-dot">Sistema activo</span>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          label="Ventas Hoy"
          value={fmt(todayTotal)}
          sub={`${data?.todaySales?._count || 0} pedidos`}
          icon={DollarSign}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-700 dark:text-emerald-400"
        />
        <KPI
          label="Ventas del Mes"
          value={fmt(monthTotal)}
          sub={`${data?.monthSales?._count || 0} pedidos`}
          icon={TrendingUp}
          iconBg="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-700 dark:text-green-400"
        />
        <KPI
          label="Pedidos Pendientes"
          value={data?.pendingOrders || 0}
          sub="Por confirmar"
          icon={ShoppingCart}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-700 dark:text-amber-400"
        />
        <KPI
          label="Entregas Activas"
          value={data?.pendingDeliveries || 0}
          sub="En ruta / pendientes"
          icon={Truck}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-700 dark:text-blue-400"
        />
        <KPI
          label="Stock Bajo"
          value={alertCount}
          sub={alertCount > 0 ? 'Requieren atención' : 'Todo en orden'}
          icon={AlertTriangle}
          iconBg={alertCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}
          iconColor={alertCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}
        />
        <KPI
          label="Clientes"
          value={data?.totalCustomers || '—'}
          sub="Registrados"
          icon={Users}
          iconBg="bg-indigo-100 dark:bg-indigo-900/30"
          iconColor="text-indigo-700 dark:text-indigo-400"
        />
        <KPI
          label="Cotizaciones Mes"
          value={data?.monthQuotes || '—'}
          sub="Generadas"
          icon={FileText}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-700 dark:text-violet-400"
        />
        <KPI
          label="Total Mes"
          value={fmt(monthTotal)}
          sub="Ingresos netos"
          icon={Zap}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          iconColor="text-teal-700 dark:text-teal-400"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ChartCard title="Ventas diarias — mes actual">
            {dailyData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={G.mid}  stopOpacity={0.25} />
                      <stop offset="100%" stopColor={G.light} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Ventas" stroke={G.mid} fill="url(#gSales)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: G.mid }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={TrendingUp} label="Sin ventas este mes" />}
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Por canal">
            {channelData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={channelData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Ventas" fill={G.dark} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={ShoppingCart} label="Sin datos de canal" />}
          </ChartCard>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Top products */}
        <div className="lg:col-span-3">
          <ChartCard title="Top productos — mes">
            {topProds.length ? (
              <div className="space-y-3">
                {topProds.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium truncate text-foreground">{p.product}</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 shrink-0">{fmt(p.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(p.total / maxProd) * 100}%`, background: `linear-gradient(90deg, ${G.dark}, ${G.light})` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{p.qty} uds</span>
                  </div>
                ))}
              </div>
            ) : <EmptyChart icon={Package} label="Sin ventas este mes" />}
          </ChartCard>
        </div>

        {/* Category pie + Low stock */}
        <div className="lg:col-span-2 space-y-4">
          <ChartCard title="Por categoría">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {categoryData.map((c, i) => <Cell key={i} fill={c.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => [fmt(v), 'Ventas']} contentStyle={{ fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart icon={Package} label="Sin datos" />}
          </ChartCard>

          {/* Low stock alert */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className={alertCount > 0 ? 'text-amber-500' : 'text-muted-foreground'} />
              <h3 className="font-semibold text-sm text-foreground">Stock bajo</h3>
              {alertCount > 0 && <span className="badge badge-red ml-auto">{alertCount}</span>}
            </div>
            {alertCount > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-thin">
                {data.lowStockItems.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">{s.product?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.warehouse?.name}</p>
                    </div>
                    <span className={`badge shrink-0 ${s.quantity === 0 ? 'badge-red' : 'badge-yellow'}`}>
                      {s.quantity} uds
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-3">Inventario saludable</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
