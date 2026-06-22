import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useToastStore } from '../store/toastStore'
import { Plus, Search, FileText, CheckCircle, XCircle, Send, ShoppingCart, Trash2, X, Eye, Download } from 'lucide-react'
import { cn } from '../lib/utils'

const STATUS_CONFIG = {
  BORRADOR: { label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  ENVIADA: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  APROBADA: { label: 'Aprobada', color: 'bg-green-100 text-green-700' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  CONVERTIDA: { label: 'Convertida', color: 'bg-purple-100 text-purple-700' },
}

const CFDI_USES = [
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'I04', label: 'I04 — Equipo de cómputo' },
  { value: 'I08', label: 'I08 — Otra maquinaria y equipo' },
  { value: 'P01', label: 'P01 — Por definir' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
]

const emptyForm = {
  customerId: '', currency: 'MXN', notes: '', internalNotes: '', terms: '',
  validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  discount: 0, items: []
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.BORRADOR
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
}

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewQuote, setViewQuote] = useState(null)
  const [products, setProducts] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [productSearch, setProductSearch] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const [rejectDialog, setRejectDialog] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [convertDialog, setConvertDialog] = useState(null)
  const { addToast } = useToastStore()

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(search && { search }), ...(statusFilter && { status: statusFilter }) })
      const r = await api.get(`/quotes?${params}`)
      setQuotes(r.data.quotes || [])
      setTotal(r.data.total || 0)
      setPages(r.data.pages || 1)
    } catch { setQuotes([]) }
    setLoading(false)
  }

  useEffect(() => {
    api.get('/products?limit=500').then(r => setProducts(r.data.products || []))
    api.get('/customers?limit=300').then(r => setCustomers(r.data.customers || []))
  }, [])

  useEffect(() => { load() }, [search, page, statusFilter])

  useEffect(() => {
    if (productSearch.length > 1) {
      setFilteredProducts(products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
      ).slice(0, 8))
    } else setFilteredProducts([])
  }, [productSearch, products])

  const addItem = (product) => {
    setForm(f => {
      const ex = f.items.find(i => i.productId === product.id)
      if (ex) return { ...f, items: f.items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price * (1 - i.discount / 100) } : i) }
      return { ...f, items: [...f.items, { productId: product.id, sku: product.sku, name: product.name, quantity: 1, price: parseFloat(product.salePrice), discount: 0, subtotal: parseFloat(product.salePrice) }] }
    })
    setProductSearch('')
  }

  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const updateItem = (idx, key, val) => setForm(f => {
    const items = [...f.items]
    items[idx] = { ...items[idx], [key]: val }
    const price = parseFloat(items[idx].price || 0)
    const qty = parseFloat(items[idx].quantity || 1)
    const disc = parseFloat(items[idx].discount || 0)
    items[idx].subtotal = parseFloat((price * qty * (1 - disc / 100)).toFixed(2))
    return { ...f, items }
  })

  const subtotal = form.items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0)
  const discountAmt = parseFloat(form.discount || 0)
  const taxBase = subtotal - discountAmt
  const tax = parseFloat((taxBase * 0.16).toFixed(2))
  const totalAmt = parseFloat((taxBase + tax).toFixed(2))

  const fmt = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.items.length) { addToast('Agrega al menos un producto', 'error'); return }
    try {
      await api.post('/quotes', {
        ...form,
        subtotal: subtotal.toFixed(2),
        discount: discountAmt.toFixed(2),
        tax: tax.toFixed(2),
        total: totalAmt.toFixed(2),
        items: form.items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, discount: i.discount, subtotal: i.subtotal }))
      })
      addToast('Cotización creada', 'success')
      setShowForm(false); setForm(emptyForm); load()
    } catch (err) { addToast(err.response?.data?.error || 'Error', 'error') }
  }

  const doApprove = async (id) => {
    try { await api.patch(`/quotes/${id}/approve`); addToast('Cotización aprobada', 'success'); load(); setViewQuote(null) }
    catch { addToast('Error', 'error') }
  }

  const doReject = async () => {
    try { await api.patch(`/quotes/${rejectDialog}/reject`, { reason: rejectReason }); addToast('Cotización rechazada', 'success'); setRejectDialog(null); setRejectReason(''); load(); setViewQuote(null) }
    catch { addToast('Error', 'error') }
  }

  const doSend = async (id) => {
    try { await api.patch(`/quotes/${id}/send`); addToast('Cotización marcada como enviada', 'success'); load() }
    catch { addToast('Error', 'error') }
  }

  const doConvert = async (paymentMethod) => {
    try {
      await api.post(`/quotes/${convertDialog}/convert`, { paymentMethod })
      addToast('Cotización convertida a venta exitosamente', 'success')
      setConvertDialog(null); load(); setViewQuote(null)
    } catch (err) { addToast(err.response?.data?.error || 'Error', 'error') }
  }

  const downloadPDF = async (id, folio) => {
    try {
      const r = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `cotizacion-${folio}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch { addToast('Error al generar PDF', 'error') }
  }

  const openView = async (q) => {
    try {
      const r = await api.get(`/quotes/${q.id}`)
      setViewQuote(r.data)
    } catch { setViewQuote(q) }
  }

  const stats = [
    { label: 'Borradores', value: quotes.filter(q => q.status === 'BORRADOR').length, color: 'text-gray-600' },
    { label: 'Enviadas', value: quotes.filter(q => q.status === 'ENVIADA').length, color: 'text-blue-600' },
    { label: 'Aprobadas', value: quotes.filter(q => q.status === 'APROBADA').length, color: 'text-green-600' },
    { label: 'Rechazadas', value: quotes.filter(q => q.status === 'RECHAZADA').length, color: 'text-red-600' },
    { label: 'Convertidas', value: quotes.filter(q => q.status === 'CONVERTIDA').length, color: 'text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-500 text-sm">{total} cotizaciones — flujo BORRADOR → ENVIADA → APROBADA → VENTA</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nueva Cotización
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Buscar cotización o cliente..." className="input pl-10 w-full"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Folio', 'Fecha', 'Cliente', 'Artículos', 'Subtotal', 'Total', 'Válida hasta', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                No hay cotizaciones
              </td></tr>
            ) : quotes.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold text-green-700">{q.folio}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(q.createdAt).toLocaleDateString('es-MX')}</td>
                <td className="px-4 py-3">{q.customer?.name || 'Público General'}</td>
                <td className="px-4 py-3 text-center">{q.items?.length || 0}</td>
                <td className="px-4 py-3">{fmt(q.subtotal)}</td>
                <td className="px-4 py-3 font-bold text-green-700">{fmt(q.total)}</td>
                <td className="px-4 py-3 text-xs">{q.validUntil ? new Date(q.validUntil).toLocaleDateString('es-MX') : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openView(q)} title="Ver" className="p-1 rounded hover:bg-gray-100">
                      <Eye className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={() => downloadPDF(q.id, q.folio)} title="Descargar PDF" className="p-1 rounded hover:bg-gray-100">
                      <Download className="h-4 w-4 text-gray-500" />
                    </button>
                    {q.status === 'BORRADOR' && (
                      <button onClick={() => doSend(q.id)} title="Marcar enviada" className="p-1 rounded hover:bg-blue-50">
                        <Send className="h-4 w-4 text-blue-500" />
                      </button>
                    )}
                    {(q.status === 'BORRADOR' || q.status === 'ENVIADA') && (
                      <>
                        <button onClick={() => doApprove(q.id)} title="Aprobar" className="p-1 rounded hover:bg-green-50">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </button>
                        <button onClick={() => { setRejectDialog(q.id); setRejectReason('') }} title="Rechazar" className="p-1 rounded hover:bg-red-50">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </button>
                      </>
                    )}
                    {q.status === 'APROBADA' && !q.converted && (
                      <button onClick={() => setConvertDialog(q.id)} title="Convertir a venta" className="p-1 rounded hover:bg-purple-50">
                        <ShoppingCart className="h-4 w-4 text-purple-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t">
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded text-sm ${page === p ? 'bg-green-600 text-white' : 'border hover:bg-gray-50'}`}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* New Quote Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl my-4">
            <div className="flex items-center justify-between p-6 border-b bg-green-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">Nueva Cotización</h2>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="label">Cliente</label>
                  <select className="input" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                    <option value="">Público General (sin cliente)</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.rfc ? `— ${c.rfc}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Válida hasta</label>
                  <input type="date" className="input" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                    {['MXN', 'USD', 'EUR'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Descuento general ($)</label>
                  <input type="number" step="0.01" className="input" value={form.discount}
                    onChange={e => setForm({ ...form, discount: e.target.value })} />
                </div>
              </div>

              {/* Product search */}
              <div>
                <label className="label">Agregar Productos</label>
                <div className="relative">
                  <input className="input w-full" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar por nombre o SKU..." />
                  {filteredProducts.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-56 overflow-y-auto">
                      {filteredProducts.map(p => (
                        <button key={p.id} type="button" className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm flex justify-between items-center border-b last:border-0"
                          onClick={() => addItem(p)}>
                          <div>
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-400 ml-2 text-xs">{p.sku}</span>
                          </div>
                          <span className="font-bold text-green-700">{fmt(p.salePrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              {form.items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['SKU', 'Producto', 'Cant.', 'Precio Unit.', 'Dscto %', 'Subtotal', ''].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.sku}</td>
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" min={1} className="input w-16 py-1 text-center text-sm" value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" className="input w-24 py-1 text-sm" value={item.price}
                              onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min={0} max={100} className="input w-16 py-1 text-center text-sm" value={item.discount}
                              onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-3 py-2 font-bold text-green-700">{fmt(item.subtotal)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totals */}
                  <div className="bg-gray-50 px-4 py-3 flex justify-end">
                    <div className="text-sm space-y-1 min-w-48">
                      <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(subtotal)}</span></div>
                      {discountAmt > 0 && <div className="flex justify-between"><span className="text-gray-500">Descuento:</span><span className="text-red-600">-{fmt(discountAmt)}</span></div>}
                      <div className="flex justify-between"><span className="text-gray-500">IVA 16%:</span><span>{fmt(tax)}</span></div>
                      <div className="flex justify-between text-lg font-bold border-t pt-1">
                        <span>TOTAL {form.currency}:</span><span className="text-green-700">{fmt(totalAmt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Notas para el cliente</label>
                  <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Tiempo de entrega, condiciones..." />
                </div>
                <div>
                  <label className="label">Términos y condiciones</label>
                  <textarea className="input" rows={2} value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} placeholder="Dejar en blanco para usar términos predeterminados..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Cotización</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quote Dialog */}
      {viewQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b bg-green-700 rounded-t-xl">
              <div>
                <h2 className="text-xl font-bold text-white">{viewQuote.folio}</h2>
                <StatusBadge status={viewQuote.status} />
              </div>
              <button onClick={() => setViewQuote(null)} className="text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{viewQuote.customer?.name || 'Público General'}</span></div>
                <div><span className="text-gray-500">RFC:</span> <span className="font-mono">{viewQuote.customer?.rfc || 'XAXX010101000'}</span></div>
                <div><span className="text-gray-500">Válida hasta:</span> <span className="font-medium">{viewQuote.validUntil ? new Date(viewQuote.validUntil).toLocaleDateString('es-MX') : '—'}</span></div>
                <div><span className="text-gray-500">Moneda:</span> <span className="font-medium">{viewQuote.currency || 'MXN'}</span></div>
              </div>
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-50"><tr>
                  {['Producto', 'SKU', 'Cant.', 'Precio', 'Desc.', 'Subtotal'].map(h => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y">
                  {viewQuote.items?.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.product?.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{item.product?.sku}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2">{fmt(item.price)}</td>
                      <td className="px-3 py-2">{item.discount > 0 ? `${item.discount}%` : '—'}</td>
                      <td className="px-3 py-2 font-bold">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="text-sm space-y-1 min-w-44">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal:</span><span>{fmt(viewQuote.subtotal)}</span></div>
                  {parseFloat(viewQuote.discount) > 0 && <div className="flex justify-between"><span className="text-gray-500">Descuento:</span><span className="text-red-500">-{fmt(viewQuote.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">IVA 16%:</span><span>{fmt(viewQuote.tax)}</span></div>
                  <div className="flex justify-between text-base font-bold border-t pt-1"><span>Total:</span><span className="text-green-700">{fmt(viewQuote.total)}</span></div>
                </div>
              </div>
              {viewQuote.notes && <div className="bg-gray-50 p-3 rounded text-sm"><span className="text-gray-500">Notas: </span>{viewQuote.notes}</div>}
              {viewQuote.rejectedReason && <div className="bg-red-50 p-3 rounded text-sm text-red-700"><span className="font-medium">Motivo rechazo: </span>{viewQuote.rejectedReason}</div>}
              {viewQuote.approvedAt && <div className="bg-green-50 p-3 rounded text-sm text-green-700">✓ Aprobada el {new Date(viewQuote.approvedAt).toLocaleDateString('es-MX')}</div>}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <button onClick={() => downloadPDF(viewQuote.id, viewQuote.folio)} className="btn-secondary flex items-center gap-1 text-sm">
                  <Download className="h-4 w-4" /> PDF
                </button>
                {viewQuote.status === 'BORRADOR' && (
                  <button onClick={() => doSend(viewQuote.id)} className="btn-secondary flex items-center gap-1 text-sm text-blue-600 border-blue-200">
                    <Send className="h-4 w-4" /> Marcar Enviada
                  </button>
                )}
                {(viewQuote.status === 'BORRADOR' || viewQuote.status === 'ENVIADA') && (
                  <>
                    <button onClick={() => doApprove(viewQuote.id)} className="btn-primary flex items-center gap-1 text-sm bg-green-600">
                      <CheckCircle className="h-4 w-4" /> Aprobar
                    </button>
                    <button onClick={() => { setRejectDialog(viewQuote.id); setRejectReason('') }} className="btn-secondary flex items-center gap-1 text-sm text-red-600 border-red-200">
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                  </>
                )}
                {viewQuote.status === 'APROBADA' && !viewQuote.converted && (
                  <button onClick={() => setConvertDialog(viewQuote.id)} className="btn-primary flex items-center gap-1 text-sm bg-purple-600">
                    <ShoppingCart className="h-4 w-4" /> Convertir a Venta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">Rechazar Cotización</h3>
            <label className="label">Motivo del rechazo</label>
            <textarea className="input w-full mb-4" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Ej: Precio fuera de presupuesto..." />
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectDialog(null)} className="btn-secondary">Cancelar</button>
              <button onClick={doReject} className="btn-primary bg-red-600 hover:bg-red-700">Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Dialog */}
      {convertDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Convertir a Venta</h3>
            <p className="text-gray-500 text-sm mb-4">Se creará un pedido con los artículos de esta cotización.</p>
            <label className="label">Método de pago</label>
            <select className="input w-full mb-4" id="pm">
              {['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CREDITO'].map(m => <option key={m}>{m}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConvertDialog(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => doConvert(document.getElementById('pm').value)} className="btn-primary bg-purple-600 hover:bg-purple-700">
                <ShoppingCart className="h-4 w-4 mr-1" /> Crear Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
