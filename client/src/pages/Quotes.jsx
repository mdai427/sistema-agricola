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

const STATUS_LABELS = { BORRADOR: 'Borrador', ENVIADA: 'Enviada', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', VENCIDA: 'Vencida' }
const STATUS_VARIANTS = { BORRADOR: 'secondary', ENVIADA: 'default', ACEPTADA: 'success', RECHAZADA: 'destructive', VENCIDA: 'warning' }

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewQuote, setViewQuote] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ customerId: '', validDays: 15, notes: '', items: [] })
  const [productSearch, setProductSearch] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/quotes', { params: { search, page, limit: 20 } })
      setQuotes(r.data.quotes || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1)
    } catch { setQuotes([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/products', { params: { limit: 300 } }).then(r => setProducts(r.data.products || []))
    api.get('/customers', { params: { limit: 300 } }).then(r => setCustomers(r.data.customers || []))
  }, [])

  useEffect(() => { load() }, [search, page])

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
      await api.post('/quotes', { ...form, subtotal: totals, total: totals })
      toast.success('Cotización creada')
      setOpen(false)
      setForm({ customerId: '', validDays: 15, notes: '', items: [] })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/quotes/${id}/status`, { status })
      toast.success('Estado actualizado')
      load()
    } catch { toast.error('Error al actualizar') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Cotizaciones</h1><p className="text-muted-foreground">{total} cotizaciones registradas</p></div>
        <Button onClick={() => { setForm({ customerId: '', validDays: 15, notes: '', items: [] }); setOpen(true) }}><Plus className="h-4 w-4 mr-2" />Nueva Cotización</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cotizaciones..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Total</TableHead><TableHead>Válida Hasta</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {quotes.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-bold">{q.folio}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(q.createdAt)}</TableCell>
                    <TableCell>{q.customer?.name || 'Público General'}</TableCell>
                    <TableCell className="font-bold text-verde-700">{formatMXN(q.total)}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(q.validUntil)}</TableCell>
                    <TableCell>
                      <Select value={q.status} onValueChange={v => updateStatus(q.id, v)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => setViewQuote(q)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {quotes.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay cotizaciones</TableCell></TableRow>}
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

      {/* New Quote Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Cotización</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente</Label>
                <Select value={form.customerId} onValueChange={v => setForm(f=>({...f,customerId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vigencia (días)</Label><Input type="number" value={form.validDays} onChange={e => setForm(f=>({...f,validDays:parseInt(e.target.value)}))} /></div>
            </div>
            <div>
              <Label>Agregar Productos</Label>
              <div className="relative">
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto..." />
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
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={e => updateQty(i, e.target.value)} className="w-20 h-8" min={1} /></TableCell>
                        <TableCell>{formatMXN(item.price)}</TableCell>
                        <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" type="button" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-gray-50 text-right font-bold text-lg">Total: <span className="text-verde-700">{formatMXN(totals)}</span></div>
              </div>
            )}
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Condiciones, observaciones..." /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear Cotización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewQuote && (
        <Dialog open={!!viewQuote} onOpenChange={() => setViewQuote(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Cotización {viewQuote.folio}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{viewQuote.customer?.name || '-'}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={STATUS_VARIANTS[viewQuote.status]}>{STATUS_LABELS[viewQuote.status]}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewQuote.items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMXN(item.price)}</TableCell>
                      <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right text-xl font-bold">Total: <span className="text-verde-700">{formatMXN(viewQuote.total)}</span></div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
