import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { formatMXN, formatDateTime } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

const TYPE_LABELS = { INGRESO: 'Ingreso', EGRESO: 'Egreso', APERTURA: 'Apertura', CIERRE: 'Cierre' }
const TYPE_VARIANTS = { INGRESO: 'success', EGRESO: 'destructive', APERTURA: 'default', CIERRE: 'secondary' }
const PAYMENT_LABELS = { EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta', MERCADO_PAGO: 'Mercado Pago' }

export default function Cash() {
  const [movements, setMovements] = useState([])
  const [summary, setSummary] = useState({ ingresos: 0, egresos: 0, balance: 0 })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'INGRESO', amount: '', paymentMethod: 'EFECTIVO', concept: '', reference: '' })
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/cash', { params: { date: dateFrom } })
      setMovements(r.data.movements || [])
      setSummary(r.data.summary || { ingresos: 0, egresos: 0, balance: 0 })
    } catch { setMovements([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [dateFrom])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/cash', form)
      toast.success('Movimiento registrado')
      setOpen(false)
      setForm({ type: 'INGRESO', amount: '', paymentMethod: 'EFECTIVO', concept: '', reference: '' })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Caja</h1><p className="text-muted-foreground">Control de ingresos y egresos</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar Movimiento</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Día</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMXN(summary.ingresos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Egresos del Día</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatMXN(summary.egresos)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-verde-700' : 'text-red-600'}`}>{formatMXN(summary.balance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell><Badge variant={TYPE_VARIANTS[m.type]}>{TYPE_LABELS[m.type]}</Badge></TableCell>
                    <TableCell>{m.concept}</TableCell>
                    <TableCell>{PAYMENT_LABELS[m.paymentMethod] || m.paymentMethod}</TableCell>
                    <TableCell className={`font-bold ${m.type === 'INGRESO' || m.type === 'APERTURA' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.type === 'INGRESO' || m.type === 'APERTURA' ? '+' : '-'}{formatMXN(m.amount)}
                    </TableCell>
                    <TableCell>{m.user?.name}</TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos este día</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Movimiento de Caja</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INGRESO">Ingreso</SelectItem>
                    <SelectItem value="EGRESO">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Método de Pago</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f=>({...f,paymentMethod:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Monto *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required /></div>
            <div><Label>Concepto *</Label><Input value={form.concept} onChange={e => setForm(f=>({...f,concept:e.target.value}))} placeholder="Descripción del movimiento" required /></div>
            <div><Label>Referencia</Label><Input value={form.reference} onChange={e => setForm(f=>({...f,reference:e.target.value}))} placeholder="Folio, factura, etc." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
