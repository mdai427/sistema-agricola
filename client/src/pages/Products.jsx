import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'
import { useToastStore } from '../store/toastStore'
import { Plus, Search, Edit, Package, FileSpreadsheet, FileText, X, Upload, Trash2, ChevronLeft, ChevronRight, Image } from 'lucide-react'
import { ProductImport } from '../components/ProductImport'

const STATUS_CONFIG = {
  ACTIVO: { label: 'Activo', color: 'bg-green-100 text-green-700' },
  AGOTADO: { label: 'Agotado', color: 'bg-yellow-100 text-yellow-700' },
  DESCONTINUADO: { label: 'Descontinuado', color: 'bg-gray-100 text-gray-500' },
}

const emptyProduct = {
  sku: '', name: '', description: '', categoryId: '', brandId: '',
  model: '', costPrice: '', salePrice: '', specialPrice: '',
  status: 'ACTIVO', barcode: '', minStock: 0
}

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
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef()
  const { addToast } = useToastStore()

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

  const openNew = () => {
    setEditing(null); setForm(emptyProduct)
    setImagePreview(null); setImageFile(null); setOpen(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ ...p, costPrice: p.costPrice, salePrice: p.salePrice, specialPrice: p.specialPrice || '', categoryId: p.categoryId, brandId: p.brandId || '' })
    setImagePreview(p.images?.[0]?.url || null)
    setImageFile(null)
    setOpen(true)
  }

  const handleImageSelect = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { addToast('Solo se permiten imágenes', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { addToast('Imagen muy grande (máx 5MB)', 'error'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleImageSelect(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      let saved
      if (editing) {
        saved = await api.put(`/products/${editing.id}`, form)
        addToast('Producto actualizado', 'success')
      } else {
        saved = await api.post('/products', form)
        addToast('Producto creado', 'success')
      }
      // Upload image if selected
      if (imageFile) {
        setUploadingImage(true)
        const formData = new FormData()
        formData.append('image', imageFile)
        await api.post(`/products/${saved.data.id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        setUploadingImage(false)
      }
      setOpen(false); load()
    } catch (err) { addToast(err.response?.data?.error || 'Error al guardar', 'error') }
    finally { setSaving(false); setUploadingImage(false) }
  }

  const removeImage = async () => {
    if (editing?.images?.[0]) {
      try {
        await api.delete(`/products/${editing.id}/images/${editing.images[0].id}`)
        addToast('Imagen eliminada', 'success')
      } catch { }
    }
    setImagePreview(null); setImageFile(null)
  }

  const totalStock = (p) => p.stocks?.reduce((a, s) => a + s.quantity, 0) || 0

  const openFicha = async (productId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/fichas/${productId}/ficha-pdf`, { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch { addToast('Error al generar ficha', 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm">{total} productos en catálogo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <FileSpreadsheet className="h-4 w-4" /> Importar Excel
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Buscar por nombre o SKU..." className="input pl-10 w-full"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['', 'SKU', 'Producto', 'Categoría', 'Marca', 'Costo', 'Precio Venta', 'Stock', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />No hay productos
              </td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  {p.images?.[0] ? (
                    <img src={p.images[0].url} className="h-10 w-10 rounded-lg object-cover border" alt="" />
                  ) : (
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center border">
                      <Package className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.model && <p className="text-xs text-gray-400">{p.model}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.category?.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.brand?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">${parseFloat(p.costPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3 font-bold text-green-700">${parseFloat(p.salePrice).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-3">
                  <span className={`font-medium ${totalStock(p) <= p.minStock ? 'text-red-500' : 'text-gray-700'}`}>{totalStock(p)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[p.status]?.color}`}>
                    {STATUS_CONFIG[p.status]?.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100" title="Editar">
                      <Edit className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={() => openFicha(p.id)} className="p-1.5 rounded hover:bg-blue-50" title="Ficha técnica">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-gray-500">Página {page} de {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b bg-green-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">{editing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Image upload */}
              <div>
                <label className="label flex items-center gap-1"><Image className="h-4 w-4" /> Foto del Producto</label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="shrink-0">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} className="h-28 w-28 rounded-xl object-cover border-2 border-green-200" alt="Preview" />
                        <button type="button" onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-28 w-28 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                        <Package className="h-10 w-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Drop zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 h-28 rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors
                      ${dragOver ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'}`}>
                    <Upload className="h-6 w-6 text-gray-400" />
                    <p className="text-sm text-gray-500 text-center">
                      <span className="text-green-600 font-medium">Haz clic</span> o arrastra la imagen aquí<br />
                      <span className="text-xs">JPG, PNG, WebP — máx 5MB</span>
                    </p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => handleImageSelect(e.target.files[0])} />
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">SKU *</label><input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required /></div>
                <div><label className="label">Nombre *</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Categoría *</label>
                  <select className="input" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} required>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Marca</label>
                  <select className="input" value={form.brandId || ''} onChange={e => setForm({ ...form, brandId: e.target.value })}>
                    <option value="">Sin marca</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Precio Costo *</label><input type="number" step="0.01" className="input" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} required /></div>
                <div><label className="label">Precio Venta *</label><input type="number" step="0.01" className="input" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} required /></div>
                <div><label className="label">Precio Especial</label><input type="number" step="0.01" className="input" value={form.specialPrice} onChange={e => setForm({ ...form, specialPrice: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Modelo</label><input className="input" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
                <div><label className="label">Código Barras</label><input className="input" value={form.barcode || ''} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
                <div><label className="label">Stock Mínimo</label><input type="number" className="input" value={form.minStock} onChange={e => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea className="input" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVO">Activo</option>
                  <option value="AGOTADO">Agotado</option>
                  <option value="DESCONTINUADO">Descontinuado</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={saving || uploadingImage} className="btn-primary">
                  {saving ? 'Guardando...' : uploadingImage ? 'Subiendo imagen...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={load} />
    </div>
  )
}
