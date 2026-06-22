import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDateTime } from '../lib/utils'

const MOVEMENT_LABELS = { ENTRADA: 'Entrada', SALIDA: 'Salida', TRASPASO: 'Traspaso', AJUSTE: 'Ajuste' }
const MOVEMENT_COLORS = { ENTRADA: 'success', SALIDA: 'destructive', TRASPASO: 'default', AJUSTE: 'secondary' }

export default function Inventory() {
  const [tab, setTab] = useState('stocks')
  const [stocks, setStocks] = useState([])
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [form, setForm] = useState({ productId: '', type: 'ENTRADA', quantity: '', fromWarehouseId: '', toWarehouseId: '', reference: '', notes: '', costPrice: '' })

  const loadStocks = async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/stocks', { params: { lowStock: lowStockOnly } })
      setStocks(r.data)
    } finally { setLoading(false) }
  }

  const loadMovements = async () => {
    setLoading(true)
    try {
      const r = await api.get('/inventory/movements', { params: { limit: 50 } })
      setMovements(r.data.movements)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data.products))
    api.get('/warehouses').then(r => setWarehouses(r.data))
  }, [])

  useEffect(() => { if (tab === 'stocks') loadStocks(); else loadMovements() }, [tab, lowStockOnly])

  const handleMovement = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/inventory/movement', form)
      toast.success('Movimiento registrado')
      setOpen(false)
      loadStocks()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Inventario</h1><p className="text-muted-foreground">Control de existencias por almacén</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar Movimiento</Button>
      </div>

      <div className="flex gap-2 border-b">
        {['stocks', 'movements'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-verde-700 text-verde-700' : 'border-transparent text-muted-foreground hover:text-gray-700'}`}>
            {t === 'stocks' ? 'Existencias' : 'Movimientos'}
          </button>
        ))}
      </div>

      {tab === 'stocks' && (
        <Card>
          <CardHeader>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Solo stock bajo
            </label>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Existencia</TableHead>
                    <TableHead>Stock Mín.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.product?.name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.product?.sku}</TableCell>
                      <TableCell>{s.warehouse?.name}</TableCell>
                      <TableCell>
                        <span className={`font-bold text-lg ${s.quantity <= s.product?.minStock ? 'text-red-500' : 'text-verde-700'}`}>{s.quantity}</span>
                      </TableCell>
                      <TableCell>{s.product?.minStock}</TableCell>
                      <TableCell>
                        {s.quantity === 0 ? <Badge variant="destructive">Agotado</Badge> : s.quantity <= s.product?.minStock ? <Badge variant="warning">Stock Bajo</Badge> : <Badge variant="success">OK</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'movements' && (
        <Card>
          <CardContent className="pt-6">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{formatDateTime(m.createdAt)}</TableCell>
                      <TableCell className="font-medium">{m.product?.name}</TableCell>
                      <TableCell><Badge variant={MOVEMENT_COLORS[m.type]}>{MOVEMENT_LABELS[m.type]}</Badge></TableCell>
                      <TableCell className="font-bold">{m.quantity}</TableCell>
                      <TableCell>{m.toWarehouse?.name || m.fromWarehouse?.name || '-'}</TableCell>
                      <TableCell>{m.user?.name}</TableCell>
                      <TableCell className="text-xs">{m.reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Movimiento de Inventario</DialogTitle></DialogHeader>
          <form onSubmit={handleMovement} className="space-y-4">
            <div>
              <Label>Producto *</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({...f, productId: v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Entrada</SelectItem>
                    <SelectItem value="SALIDA">Salida</SelectItem>
                    <SelectItem value="TRASPASO">Traspaso</SelectItem>
                    <SelectItem value="AJUSTE">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Cantidad *</Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} required /></div>
            </div>
            {(form.type === 'SALIDA' || form.type === 'TRASPASO') && (
              <div>
                <Label>Almacén Origen</Label>
                <Select value={form.fromWarehouseId} onValueChange={v => setForm(f => ({...f, fromWarehouseId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {(form.type === 'ENTRADA' || form.type === 'TRASPASO' || form.type === 'AJUSTE') && (
              <div>
                <Label>Almacén Destino</Label>
                <Select value={form.toWarehouseId} onValueChange={v => setForm(f => ({...f, toWarehouseId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Referencia</Label><Input value={form.reference} onChange={e => setForm(f => ({...f, reference: e.target.value}))} placeholder="Folio de compra, etc." /></div>
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} /></div>
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
