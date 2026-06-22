import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { formatMXN, formatDateTime } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, Search, Eye, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_LABELS = { NUEVO:'Nuevo', CONFIRMADO:'Confirmado', EN_PREPARACION:'En Preparación', ENVIADO:'Enviado', ENTREGADO:'Entregado', CANCELADO:'Cancelado', DEVOLUCION:'Devolución' }
const STATUS_VARIANTS = { NUEVO:'secondary', CONFIRMADO:'default', EN_PREPARACION:'warning', ENVIADO:'default', ENTREGADO:'success', CANCELADO:'destructive', DEVOLUCION:'destructive' }
const CHANNEL_LABELS = { TIENDA_FISICA:'Tienda', MERCADO_LIBRE:'Mercado Libre', AMAZON:'Amazon', WHATSAPP:'WhatsApp', WEB:'Web' }

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOrder, setViewOrder] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId: '', channel: 'TIENDA_FISICA', paymentMethod: 'EFECTIVO', notes: '', items: [] })
  const [productSearch, setProductSearch] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/orders', { params: { search, status: statusFilter, page, limit: 20 } })
      setOrders(r.data.orders); setTotal(r.data.total); setPages(r.data.pages)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/products', { params: { limit: 300 } }).then(r => setProducts(r.data.products))
    api.get('/customers', { params: { limit: 300 } }).then(r => setCustomers(r.data.customers))
  }, [])

  useEffect(() => { load() }, [search, statusFilter, page])
  useEffect(() => {
    if (productSearch.length > 1) setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8))
    else setFilteredProducts([])
  }, [productSearch, products])

  const addItem = (product) => {
    setForm(f => {
      const existing = f.items.find(i => i.productId === product.id)
      if (existing) return { ...f, items: f.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i) }
      return { ...f, items: [...f.items, { productId: product.id, productName: product.name, quantity: 1, price: parseFloat(product.salePrice), discount: 0, subtotal: parseFloat(product.salePrice) }] }
    })
    setProductSearch('')
  }

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const updateQty = (idx, qty) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, quantity: parseInt(qty) || 1, subtotal: (parseInt(qty) || 1) * item.price } : item) }))

  const totals = form.items.reduce((a, i) => a + i.subtotal, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.items.length) { toast.error('Agrega al menos un producto'); return }
    setSaving(true)
    try {
      await api.post('/orders', { ...form, subtotal: totals, tax: 0, total: totals, paidAmount: totals })
      toast.success('Pedido creado exitosamente')
      setOpen(false)
      setForm({ customerId: '', channel: 'TIENDA_FISICA', paymentMethod: 'EFECTIVO', notes: '', items: [] })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status })
      toast.success('Estado actualizado')
      load()
    } catch { toast.error('Error al actualizar') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Ventas</h1><p className="text-muted-foreground">{total} pedidos registrados</p></div>
        <Button onClick={() => { setForm({ customerId: '', channel: 'TIENDA_FISICA', paymentMethod: 'EFECTIVO', notes: '', items: [] }); setOpen(true) }}><Plus className="h-4 w-4 mr-2" />Nuevo Pedido</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar pedidos..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
            <Select value={statusFilter || 'ALL'} onValueChange={v => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1) }}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Canal</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-bold">{o.folio}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(o.createdAt)}</TableCell>
                    <TableCell>{o.customer?.name || 'Público General'}</TableCell>
                    <TableCell><Badge variant="secondary">{CHANNEL_LABELS[o.channel]}</Badge></TableCell>
                    <TableCell className="font-bold text-verde-700">{formatMXN(o.total)}</TableCell>
                    <TableCell>
                      <Select value={o.status} onValueChange={v => updateStatus(o.id, v)}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewOrder(o)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Página {page} de {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Order Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Pedido</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f=>({...f,customerId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Público general" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={v => setForm(f=>({...f,channel:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CHANNEL_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pago</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f=>({...f,paymentMethod:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="CREDITO">Crédito</SelectItem>
                    <SelectItem value="MERCADO_PAGO">Mercado Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Agregar Productos</Label>
              <div className="relative">
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto por nombre o SKU..." />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex justify-between" onClick={() => addItem(p)}>
                        <span>{p.name} <span className="text-muted-foreground">({p.sku})</span></span>
                        <span className="font-medium text-verde-700">{formatMXN(p.salePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {form.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Qty</TableHead><TableHead>Precio</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={e => updateQty(i, e.target.value)} className="w-20 h-8" min={1} /></TableCell>
                        <TableCell>{formatMXN(item.price)}</TableCell>
                        <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" type="button" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-gray-50 text-right">
                  <p className="text-lg font-bold">Total: <span className="text-verde-700">{formatMXN(totals)}</span></p>
                </div>
              </div>
            )}

            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Instrucciones especiales..." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear Pedido</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Order Dialog */}
      {viewOrder && (
        <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Pedido {viewOrder.folio}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{viewOrder.customer?.name || 'Público General'}</span></div>
                <div><span className="text-muted-foreground">Canal:</span> <span className="font-medium">{CHANNEL_LABELS[viewOrder.channel]}</span></div>
                <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{formatDateTime(viewOrder.createdAt)}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={STATUS_VARIANTS[viewOrder.status]}>{STATUS_LABELS[viewOrder.status]}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewOrder.items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMXN(item.price)}</TableCell>
                      <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right text-xl font-bold">Total: <span className="text-verde-700">{formatMXN(viewOrder.total)}</span></div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
