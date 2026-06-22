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

const STATUS_LABELS = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', RECIBIDA: 'Recibida', CANCELADA: 'Cancelada' }
const STATUS_VARIANTS = { PENDIENTE: 'warning', PARCIAL: 'default', RECIBIDA: 'success', CANCELADA: 'destructive' }

export default function Purchases() {
  const [purchases, setPurchases] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewPurchase, setViewPurchase] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', expectedDate: '', notes: '', items: [] })
  const [productSearch, setProductSearch] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/purchases', { params: { search, page, limit: 20 } })
      setPurchases(r.data.purchases || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1)
    } catch { setPurchases([]) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/suppliers', { params: { limit: 200 } }).then(r => setSuppliers(r.data.suppliers || []))
    api.get('/products', { params: { limit: 300 } }).then(r => setProducts(r.data.products || []))
    api.get('/warehouses').then(r => setWarehouses(r.data || []))
  }, [])

  useEffect(() => { load() }, [search, page])

  useEffect(() => {
    if (productSearch.length > 1) setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8))
    else setFilteredProducts([])
  }, [productSearch, products])

  const addItem = (product) => {
    setForm(f => {
      const existing = f.items.find(i => i.productId === product.id)
      if (existing) return { ...f, items: f.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.cost } : i) }
      return { ...f, items: [...f.items, { productId: product.id, productName: product.name, quantity: 1, cost: parseFloat(product.costPrice), subtotal: parseFloat(product.costPrice) }] }
    })
    setProductSearch('')
  }

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const updateQty = (idx, qty) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, quantity: parseInt(qty) || 1, subtotal: (parseInt(qty) || 1) * item.cost } : item) }))

  const totals = form.items.reduce((a, i) => a + i.subtotal, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.items.length) { toast.error('Agrega al menos un producto'); return }
    if (!form.supplierId) { toast.error('Selecciona un proveedor'); return }
    setSaving(true)
    try {
      await api.post('/purchases', { ...form, total: totals })
      toast.success('Orden de compra creada')
      setOpen(false)
      setForm({ supplierId: '', warehouseId: '', expectedDate: '', notes: '', items: [] })
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Compras</h1><p className="text-muted-foreground">{total} órdenes de compra</p></div>
        <Button onClick={() => { setForm({ supplierId: '', warehouseId: '', expectedDate: '', notes: '', items: [] }); setOpen(true) }}><Plus className="h-4 w-4 mr-2" />Nueva Orden de Compra</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar órdenes de compra..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead><TableHead>Proveedor</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-bold">{p.folio}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell>{p.supplier?.name}</TableCell>
                    <TableCell className="font-bold text-verde-700">{formatMXN(p.total)}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => setViewPurchase(p)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {purchases.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay órdenes de compra</TableCell></TableRow>}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Orden de Compra</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Proveedor *</Label>
                <Select value={form.supplierId} onValueChange={v => setForm(f=>({...f,supplierId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Almacén destino</Label>
                <Select value={form.warehouseId} onValueChange={v => setForm(f=>({...f,warehouseId:v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fecha Esperada</Label><Input type="date" value={form.expectedDate} onChange={e => setForm(f=>({...f,expectedDate:e.target.value}))} /></div>
            </div>
            <div>
              <Label>Agregar Productos</Label>
              <div className="relative">
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar producto..." />
                {filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button key={p.id} type="button" className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex justify-between" onClick={() => addItem(p)}>
                        <span>{p.name} ({p.sku})</span>
                        <span className="text-muted-foreground">Costo: {formatMXN(p.costPrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {form.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Qty</TableHead><TableHead>Costo</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={e => updateQty(i, e.target.value)} className="w-20 h-8" min={1} /></TableCell>
                        <TableCell>{formatMXN(item.cost)}</TableCell>
                        <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" type="button" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-4 bg-gray-50 text-right font-bold text-lg">Total: <span className="text-verde-700">{formatMXN(totals)}</span></div>
              </div>
            )}
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear Orden</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {viewPurchase && (
        <Dialog open={!!viewPurchase} onOpenChange={() => setViewPurchase(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Orden de Compra {viewPurchase.folio}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Proveedor:</span> <span className="font-medium">{viewPurchase.supplier?.name}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={STATUS_VARIANTS[viewPurchase.status]}>{STATUS_LABELS[viewPurchase.status]}</Badge></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Cant.</TableHead><TableHead>Costo</TableHead><TableHead>Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {viewPurchase.items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMXN(item.cost)}</TableCell>
                      <TableCell className="font-bold">{formatMXN(item.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right text-xl font-bold">Total: <span className="text-verde-700">{formatMXN(viewPurchase.total)}</span></div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
