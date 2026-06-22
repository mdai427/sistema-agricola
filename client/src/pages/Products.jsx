import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { formatMXN } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Textarea } from '../components/ui/textarea'
import { Plus, Search, Edit, Package, Loader2, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react'
import { ProductImport } from '../components/ProductImport'

const STATUS_LABELS = { ACTIVO: 'Activo', AGOTADO: 'Agotado', DESCONTINUADO: 'Descontinuado' }
const STATUS_VARIANTS = { ACTIVO: 'success', AGOTADO: 'warning', DESCONTINUADO: 'secondary' }

const emptyProduct = { sku: '', name: '', description: '', categoryId: '', brandId: '', model: '', costPrice: '', salePrice: '', specialPrice: '', status: 'ACTIVO', barcode: '', minStock: 0 }

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/products', { params: { search, page, limit: 20 } })
      setProducts(r.data.products)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } finally { setLoading(false) }
  }

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)) }, [])
  useEffect(() => { api.get('/brands').then(r => setBrands(r.data)) }, [])
  useEffect(() => { load() }, [search, page])

  const openNew = () => { setEditing(null); setForm(emptyProduct); setOpen(true) }
  const openEdit = (p) => { setEditing(p); setForm({ ...p, costPrice: p.costPrice, salePrice: p.salePrice, specialPrice: p.specialPrice || '', categoryId: p.categoryId, brandId: p.brandId || '' }); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, form)
        toast.success('Producto actualizado')
      } else {
        await api.post('/products', form)
        toast.success('Producto creado')
      }
      setOpen(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const totalStock = (product) => product.stocks?.reduce((a, s) => a + s.quantity, 0) || 0

  const openFicha = async (productId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/fichas/${productId}/ficha-pdf`, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { toast.error('Error al generar ficha') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-muted-foreground">{total} productos en catálogo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="h-4 w-4 mr-2" />Importar Excel</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nuevo Producto</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o SKU..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? <img src={p.images[0].url} className="h-10 w-10 rounded object-cover" alt="" /> : <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center"><Package className="h-4 w-4 text-gray-400" /></div>}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.model && <p className="text-xs text-muted-foreground">{p.model}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category?.name}</TableCell>
                    <TableCell className="text-sm">{p.brand?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{formatMXN(p.costPrice)}</TableCell>
                    <TableCell className="font-medium text-verde-700">{formatMXN(p.salePrice)}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${totalStock(p) <= p.minStock ? 'text-red-500' : 'text-gray-700'}`}>{totalStock(p)}</span>
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[p.status]}>{STATUS_LABELS[p.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openFicha(p.id)} title="Ver Ficha Técnica"><FileText className="h-4 w-4 text-blue-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">Página {page} de {pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU *</Label><Input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} required /></div>
              <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({...f, categoryId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Select value={form.brandId || ''} onValueChange={v => setForm(f => ({...f, brandId: v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Precio Costo *</Label><Input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({...f, costPrice: e.target.value}))} required /></div>
              <div><Label>Precio Venta *</Label><Input type="number" step="0.01" value={form.salePrice} onChange={e => setForm(f => ({...f, salePrice: e.target.value}))} required /></div>
              <div><Label>Precio Especial</Label><Input type="number" step="0.01" value={form.specialPrice} onChange={e => setForm(f => ({...f, specialPrice: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Modelo</Label><Input value={form.model || ''} onChange={e => setForm(f => ({...f, model: e.target.value}))} /></div>
              <div><Label>Código Barras</Label><Input value={form.barcode || ''} onChange={e => setForm(f => ({...f, barcode: e.target.value}))} /></div>
              <div><Label>Stock Mínimo</Label><Input type="number" value={form.minStock} onChange={e => setForm(f => ({...f, minStock: parseInt(e.target.value)}))} /></div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({...f, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="AGOTADO">Agotado</SelectItem>
                  <SelectItem value="DESCONTINUADO">Descontinuado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProductImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={load} />
    </div>
  )
}
