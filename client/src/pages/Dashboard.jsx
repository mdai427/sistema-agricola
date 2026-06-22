import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatMXN } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ShoppingCart, DollarSign, AlertTriangle, Truck, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CHANNEL_LABELS = { TIENDA_FISICA: 'Tienda', MERCADO_LIBRE: 'ML', AMAZON: 'Amazon', WHATSAPP: 'WA', WEB: 'Web' }

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-verde-700" /></div>
  if (!data) return null

  const channelData = (data.salesByChannel || []).map(c => ({ name: CHANNEL_LABELS[c.channel] || c.channel, ventas: parseFloat(c._sum?.total || 0), pedidos: c._count }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground">Resumen operativo en tiempo real</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-verde-700">{formatMXN(data.todaySales?._sum?.total)}</div>
            <p className="text-xs text-muted-foreground">{data.todaySales?._count || 0} pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-verde-700">{formatMXN(data.monthSales?._sum?.total)}</div>
            <p className="text-xs text-muted-foreground">{data.monthSales?._count || 0} pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">Por procesar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregas Pendientes</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.pendingDeliveries || 0}</div>
            <p className="text-xs text-muted-foreground">Sin completar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por canal */}
        <Card>
          <CardHeader><CardTitle>Ventas por Canal (Mes)</CardTitle></CardHeader>
          <CardContent>
            {channelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => formatMXN(v)} />
                  <Bar dataKey="ventas" fill="#1a5c2a" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-10">Sin datos</p>}
          </CardContent>
        </Card>

        {/* Stock bajo */}
        <Card>
          <CardHeader className="flex items-center flex-row gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle>Alertas de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockItems?.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockItems.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.product?.name}</p>
                      <p className="text-xs text-muted-foreground">{s.warehouse?.name}</p>
                    </div>
                    <Badge variant={s.quantity === 0 ? 'destructive' : 'warning'}>
                      {s.quantity} uds
                    </Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-center text-muted-foreground py-8">Sin alertas</p>}
          </CardContent>
        </Card>
      </div>

      {/* Top productos */}
      <Card>
        <CardHeader><CardTitle>Top 10 Productos (Mes)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.topProducts || []).map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm font-bold text-muted-foreground w-6">{i+1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.product?.name || 'Producto'}</p>
                  <div className="h-2 bg-gray-100 rounded-full mt-1">
                    <div className="h-2 bg-verde-600 rounded-full" style={{ width: `${Math.min(100, (parseFloat(p._sum?.subtotal || 0) / parseFloat(data.topProducts[0]?._sum?.subtotal || 1)) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-verde-700">{formatMXN(p._sum?.subtotal)}</span>
              </div>
            ))}
            {(!data.topProducts || data.topProducts.length === 0) && <p className="text-center text-muted-foreground py-4">Sin ventas este mes</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
