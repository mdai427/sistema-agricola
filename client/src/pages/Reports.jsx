import { useEffect, useState } from 'react'
import api from '../lib/api'
import { formatMXN } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { Loader2, Download, BarChart2 } from 'lucide-react'

const COLORS = ['#1a5c2a', '#2a7540', '#3a9150', '#5cad6d', '#8ec99a', '#bbdfc1']
const CHANNEL_LABELS = { TIENDA_FISICA: 'Tienda', MERCADO_LIBRE: 'ML', AMAZON: 'Amazon', WHATSAPP: 'WA', WEB: 'Web' }

export default function Reports() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('month')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/reports/sales', { params: { period, dateFrom, dateTo } })
      setData(r.data)
    } catch { setData(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [period, dateFrom, dateTo])

  const channelData = data?.byChannel?.map(c => ({
    name: CHANNEL_LABELS[c.channel] || c.channel,
    ventas: parseFloat(c._sum?.total || 0),
    pedidos: parseInt(c._count || 0)
  })) || []

  const dailyData = data?.daily?.map(d => ({
    fecha: new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    ventas: parseFloat(d.total || 0)
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Análisis de ventas e inventario</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoy</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Año</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === 'custom' && (
              <>
                <div><Label>Desde</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" /></div>
                <div><Label>Hasta</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" /></div>
              </>
            )}
            <Button onClick={load} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4 mr-2" />}
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-verde-700" /></div>}

      {data && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Ventas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-verde-700">{formatMXN(data.totals?.sales)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pedidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.totals?.orders || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ticket Promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{formatMXN(data.totals?.avg)}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Margen Bruto</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600">{formatMXN(data.totals?.margin)}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily trend */}
            {dailyData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Tendencia de Ventas</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => formatMXN(v)} />
                      <Line type="monotone" dataKey="ventas" stroke="#1a5c2a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* By channel */}
            {channelData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Ventas por Canal</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={channelData} dataKey="ventas" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                        {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatMXN(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top products */}
          {data.topProducts?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Productos Más Vendidos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Producto</TableHead><TableHead>Cantidad</TableHead><TableHead>Ingresos</TableHead><TableHead>% del Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.topProducts.map((p, i) => {
                      const pct = data.totals?.sales > 0 ? ((parseFloat(p._sum?.subtotal || 0) / parseFloat(data.totals.sales)) * 100).toFixed(1) : 0
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground font-bold">{i+1}</TableCell>
                          <TableCell className="font-medium">{p.product?.name}</TableCell>
                          <TableCell>{p._sum?.quantity || 0} uds</TableCell>
                          <TableCell className="font-bold text-verde-700">{formatMXN(p._sum?.subtotal)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-verde-600 rounded-full" style={{ width: `${pct}%` }} /></div>
                              <span className="text-xs text-muted-foreground">{pct}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
