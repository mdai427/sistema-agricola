import { useState, useEffect } from 'react'
import api from '../lib/api'
import { useToastStore } from '../store/toastStore'
import { Package, Plus, Search, Ship, FileText, ChevronDown, ChevronUp, Truck, Clock, CheckCircle, AlertCircle, X, Download } from 'lucide-react'

const STATUS_CONFIG = {
  EN_TRANSITO: { label: 'En Tránsito', color: 'bg-blue-100 text-blue-800', icon: Ship },
  EN_ADUANA: { label: 'En Aduana', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  LIBERADO: { label: 'Liberado', color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
  RECIBIDO: { label: 'Recibido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: X },
}

const DOC_TYPES = ['FACTURA_COMERCIAL', 'PACKING_LIST', 'BL', 'PEDIMENTO', 'SEGURO', 'OTRO']

const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.EN_TRANSITO
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  )
}

const emptyForm = {
  supplierId: '', invoiceNumber: '', invoiceDate: '', invoiceAmount: '', currency: 'USD', exchangeRate: '1',
  containerNumber: '', billOfLading: '', vessel: '', incoterm: 'FOB',
  originPort: '', destinationPort: '', departureDate: '', etaPort: '', arrivalDate: '', customsDate: '', deliveryDate: '',
  freightCost: '0', customsDuty: '0', dta: '0', igi: '0', iva: '0', otherCosts: '0', totalLandedCost: '0',
  pedimentoNumber: '', pedimentoDate: '', customsBroker: '', notes: '', status: 'EN_TRANSITO',
  items: [], documents: []
}

export default function Imports() {
  const [imports, setImports] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [activeTab, setActiveTab] = useState('general')
  const { addToast } = useToastStore()

  useEffect(() => { fetchAll() }, [page, search, statusFilter])
  useEffect(() => {
    api.get('/suppliers?limit=100').then(r => setSuppliers(r.data.suppliers || r.data))
    api.get('/products?limit=500').then(r => setProducts(r.data.products || r.data))
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 15, ...(search && { search }), ...(statusFilter && { status: statusFilter }) })
      const r = await api.get(`/imports?${params}`)
      setImports(r.data.imports)
      setTotal(r.data.total)
    } catch { addToast('Error al cargar importaciones', 'error') }
    setLoading(false)
  }

  const openNew = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setActiveTab('general') }
  const openEdit = (imp) => {
    setForm({
      ...imp,
      invoiceDate: imp.invoiceDate ? imp.invoiceDate.split('T')[0] : '',
      departureDate: imp.departureDate ? imp.departureDate.split('T')[0] : '',
      etaPort: imp.etaPort ? imp.etaPort.split('T')[0] : '',
      arrivalDate: imp.arrivalDate ? imp.arrivalDate.split('T')[0] : '',
      customsDate: imp.customsDate ? imp.customsDate.split('T')[0] : '',
      deliveryDate: imp.deliveryDate ? imp.deliveryDate.split('T')[0] : '',
      pedimentoDate: imp.pedimentoDate ? imp.pedimentoDate.split('T')[0] : '',
    })
    setEditId(imp.id); setShowForm(true); setActiveTab('general')
  }

  const calcLanded = (f) => {
    const n = v => parseFloat(v || 0)
    return (n(f.invoiceAmount) * n(f.exchangeRate) + n(f.freightCost) + n(f.customsDuty) + n(f.dta) + n(f.igi) + n(f.iva) + n(f.otherCosts)).toFixed(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, totalLandedCost: calcLanded(form) }
      if (editId) await api.put(`/imports/${editId}`, payload)
      else await api.post('/imports', payload)
      addToast(editId ? 'Importación actualizada' : 'Importación creada', 'success')
      setShowForm(false); fetchAll()
    } catch (err) { addToast(err.response?.data?.error || 'Error', 'error') }
  }

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/imports/${id}/status`, { status })
      addToast('Estado actualizado', 'success'); fetchAll()
    } catch { addToast('Error al actualizar estado', 'error') }
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', description: '', hsCode: '', quantity: 1, unitCost: 0, totalCost: 0 }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const updateItem = (idx, key, val) => setForm(f => {
    const items = [...f.items]
    items[idx] = { ...items[idx], [key]: val }
    if (key === 'quantity' || key === 'unitCost') items[idx].totalCost = (parseFloat(items[idx].quantity || 0) * parseFloat(items[idx].unitCost || 0)).toFixed(2)
    return { ...f, items }
  })

  const addDoc = () => setForm(f => ({ ...f, documents: [...f.documents, { type: 'FACTURA_COMERCIAL', name: '', notes: '' }] }))
  const removeDoc = (idx) => setForm(f => ({ ...f, documents: f.documents.filter((_, i) => i !== idx) }))
  const updateDoc = (idx, key, val) => setForm(f => { const docs = [...f.documents]; docs[idx] = { ...docs[idx], [key]: val }; return { ...f, documents: docs } })

  const fmt = v => `$${parseFloat(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX') : '—'

  const pages = Math.ceil(total / 15)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importaciones</h1>
          <p className="text-gray-500 text-sm">Control de importaciones, contenedores y despacho aduanal</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" /> Nueva Importación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          const count = imports.filter(i => i.status === key).length
          return (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`card p-4 text-left hover:shadow-md transition-shadow ${statusFilter === key ? 'ring-2 ring-green-500' : ''}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-gray-400" />
                <span className="text-xs text-gray-500">{cfg.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Buscar por referencia, contenedor, BL, factura..." className="input pl-10 w-full"
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
              {['Referencia', 'Proveedor', 'Contenedor', 'BL / Factura', 'Salida', 'ETA Puerto', 'Costo Total', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : imports.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <Ship className="h-12 w-12 mx-auto mb-2 opacity-30" />
                No hay importaciones registradas
              </td></tr>
            ) : imports.map(imp => (
              <>
                <tr key={imp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}>
                  <td className="px-4 py-3 font-medium text-green-700">{imp.reference}</td>
                  <td className="px-4 py-3">{imp.supplier?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{imp.containerNumber || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{imp.billOfLading || '—'}</div>
                    <div className="text-gray-400">{imp.invoiceNumber || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{fmtDate(imp.departureDate)}</td>
                  <td className="px-4 py-3 text-xs">{fmtDate(imp.etaPort)}</td>
                  <td className="px-4 py-3 font-medium">{fmt(imp.totalLandedCost)}</td>
                  <td className="px-4 py-3"><StatusBadge status={imp.status} /></td>
                  <td className="px-4 py-3">
                    {expanded === imp.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </td>
                </tr>
                {expanded === imp.id && (
                  <tr key={`${imp.id}-detail`}><td colSpan={9} className="bg-gray-50 px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Timeline */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Timeline</h4>
                        {[
                          ['Fecha factura comercial', imp.invoiceDate],
                          ['Salida de origen', imp.departureDate],
                          ['ETA puerto', imp.etaPort],
                          ['Llegada a puerto', imp.arrivalDate],
                          ['Despacho aduanal', imp.customsDate],
                          ['Entrega en almacén', imp.deliveryDate],
                        ].map(([label, date]) => (
                          <div key={label} className="flex justify-between text-xs py-1 border-b border-gray-100">
                            <span className="text-gray-500">{label}</span>
                            <span className={date ? 'font-medium' : 'text-gray-300'}>{fmtDate(date)}</span>
                          </div>
                        ))}
                      </div>
                      {/* Costs */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Costos ({imp.currency})</h4>
                        {[
                          ['Factura comercial', imp.invoiceAmount],
                          ['T.C.', `${imp.exchangeRate} MXN`],
                          ['Flete', imp.freightCost],
                          ['Derechos (DTA)', imp.dta],
                          ['IGI / Arancel', imp.igi],
                          ['IVA Aduana', imp.iva],
                          ['Otros gastos', imp.otherCosts],
                        ].map(([label, val]) => (
                          <div key={label} className="flex justify-between text-xs py-1 border-b border-gray-100">
                            <span className="text-gray-500">{label}</span>
                            <span>{typeof val === 'string' ? val : fmt(val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm py-1 font-bold text-green-700">
                          <span>Costo total MXN</span><span>{fmt(imp.totalLandedCost)}</span>
                        </div>
                      </div>
                      {/* Docs & Actions */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Documentos ({imp.documents?.length || 0})</h4>
                        {imp.documents?.map(doc => (
                          <div key={doc.id} className="text-xs flex items-center gap-1 py-1">
                            <FileText className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">{doc.type.replace('_', ' ')}</span>
                            <span className="text-gray-400">— {doc.name}</span>
                          </div>
                        ))}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => openEdit(imp)} className="btn-secondary text-xs px-3 py-1">Editar</button>
                          {imp.status !== 'RECIBIDO' && (
                            <select className="input text-xs py-1" value={imp.status}
                              onChange={e => changeStatus(imp.id, e.target.value)}>
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          )}
                        </div>
                        {imp.pedimentoNumber && (
                          <div className="mt-2 text-xs text-gray-500">
                            Pedimento: <span className="font-mono font-medium">{imp.pedimentoNumber}</span>
                            {imp.customsBroker && ` — Agente: ${imp.customsBroker}`}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Items */}
                    {imp.items?.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-sm mb-2 text-gray-700">Productos ({imp.items.length} SKUs, {imp.items.reduce((s, i) => s + i.quantity, 0)} unidades)</h4>
                        <table className="w-full text-xs border rounded">
                          <thead className="bg-gray-100"><tr>
                            {['SKU', 'Descripción', 'Fracción', 'Cant.', 'Costo Unit.', 'Total', 'Recibido'].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}
                          </tr></thead>
                          <tbody className="divide-y">
                            {imp.items.map(item => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 font-mono">{item.product?.sku}</td>
                                <td className="px-3 py-2">{item.description || item.product?.name}</td>
                                <td className="px-3 py-2 font-mono">{item.hsCode || '—'}</td>
                                <td className="px-3 py-2 text-center">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">{fmt(item.unitCost)}</td>
                                <td className="px-3 py-2 text-right font-medium">{fmt(item.totalCost)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={item.receivedQty >= item.quantity ? 'text-green-600 font-bold' : 'text-orange-500'}>
                                    {item.receivedQty}/{item.quantity}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </td></tr>
                )}
              </>
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl my-4">
            <div className="flex items-center justify-between p-6 border-b bg-green-700 rounded-t-xl">
              <h2 className="text-xl font-bold text-white">{editId ? 'Editar Importación' : 'Nueva Importación'}</h2>
              <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* Tabs */}
              <div className="flex border-b px-6">
                {[['general', 'General'], ['embarque', 'Embarque & Fechas'], ['costos', 'Costos Aduanales'], ['productos', 'Productos'], ['documentos', 'Documentos']].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setActiveTab(key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeTab === key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4">
                {activeTab === 'general' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 grid grid-cols-3 gap-4">
                      <div>
                        <label className="label">Proveedor *</label>
                        <select className="input" required value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                          <option value="">Seleccionar proveedor</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">No. Factura Comercial</label>
                        <input className="input" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="INV-2024-001" />
                      </div>
                      <div>
                        <label className="label">Fecha Factura</label>
                        <input type="date" className="input" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="label">Monto Factura</label>
                      <input type="number" step="0.01" className="input" value={form.invoiceAmount} onChange={e => setForm({ ...form, invoiceAmount: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Moneda</label>
                      <select className="input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                        {['USD', 'EUR', 'CNY', 'MXN'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tipo de Cambio (a MXN)</label>
                      <input type="number" step="0.01" className="input" value={form.exchangeRate} onChange={e => setForm({ ...form, exchangeRate: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">INCOTERM</label>
                      <select className="input" value={form.incoterm} onChange={e => setForm({ ...form, incoterm: e.target.value })}>
                        {INCOTERMS.map(i => <option key={i}>{i}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Estado</label>
                      <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Notas</label>
                      <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>
                )}

                {activeTab === 'embarque' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="label">No. Contenedor</label><input className="input font-mono" value={form.containerNumber} onChange={e => setForm({ ...form, containerNumber: e.target.value })} placeholder="ABCU1234567" /></div>
                    <div><label className="label">Bill of Lading (BL)</label><input className="input font-mono" value={form.billOfLading} onChange={e => setForm({ ...form, billOfLading: e.target.value })} placeholder="MAEU12345678" /></div>
                    <div><label className="label">Buque / Naviera</label><input className="input" value={form.vessel} onChange={e => setForm({ ...form, vessel: e.target.value })} placeholder="Maersk Seletar" /></div>
                    <div><label className="label">Puerto Origen</label><input className="input" value={form.originPort} onChange={e => setForm({ ...form, originPort: e.target.value })} placeholder="Shanghai, China" /></div>
                    <div><label className="label">Puerto Destino</label><input className="input" value={form.destinationPort} onChange={e => setForm({ ...form, destinationPort: e.target.value })} placeholder="Manzanillo, México" /></div>
                    <div><label className="label">Agente Aduanal</label><input className="input" value={form.customsBroker} onChange={e => setForm({ ...form, customsBroker: e.target.value })} /></div>
                    <div><label className="label">No. Pedimento</label><input className="input font-mono" value={form.pedimentoNumber} onChange={e => setForm({ ...form, pedimentoNumber: e.target.value })} placeholder="24 48 0000 0000000" /></div>
                    <div></div>
                    <div><label className="label">Fecha Salida Origen</label><input type="date" className="input" value={form.departureDate} onChange={e => setForm({ ...form, departureDate: e.target.value })} /></div>
                    <div><label className="label">ETA Puerto</label><input type="date" className="input" value={form.etaPort} onChange={e => setForm({ ...form, etaPort: e.target.value })} /></div>
                    <div><label className="label">Llegada Real a Puerto</label><input type="date" className="input" value={form.arrivalDate} onChange={e => setForm({ ...form, arrivalDate: e.target.value })} /></div>
                    <div><label className="label">Fecha Despacho Aduanal</label><input type="date" className="input" value={form.customsDate} onChange={e => setForm({ ...form, customsDate: e.target.value })} /></div>
                    <div><label className="label">Fecha Pedimento</label><input type="date" className="input" value={form.pedimentoDate} onChange={e => setForm({ ...form, pedimentoDate: e.target.value })} /></div>
                    <div><label className="label">Fecha Entrega Almacén</label><input type="date" className="input" value={form.deliveryDate} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} /></div>
                  </div>
                )}

                {activeTab === 'costos' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
                      Todos los costos en MXN. El costo total determina el precio de landed cost por unidad.
                    </div>
                    {[
                      ['Flete Internacional', 'freightCost'],
                      ['Derechos de Trámite Aduanero (DTA)', 'dta'],
                      ['IGI / Arancel', 'igi'],
                      ['IVA Aduana', 'iva'],
                      ['Gastos Aduanales', 'customsDuty'],
                      ['Otros Gastos', 'otherCosts'],
                    ].map(([label, key]) => (
                      <div key={key}>
                        <label className="label">{label} (MXN)</label>
                        <input type="number" step="0.01" className="input" value={form[key]}
                          onChange={e => setForm({ ...form, [key]: e.target.value })} />
                      </div>
                    ))}
                    <div className="col-span-2 bg-green-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">Costo Total Landed (MXN)</span>
                        <span className="text-xl font-bold text-green-700">${parseFloat(calcLanded(form)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Factura ({form.currency} {form.invoiceAmount} × {form.exchangeRate}) + fletes + gastos aduanales
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'productos' && (
                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-medium">Productos en esta importación</span>
                      <button type="button" onClick={addItem} className="btn-secondary text-sm px-3 py-1 flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Agregar
                      </button>
                    </div>
                    {form.items.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sin productos. Haz clic en Agregar.</p>}
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-3">
                          {idx === 0 && <label className="label text-xs">Producto</label>}
                          <select className="input text-sm" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)}>
                            <option value="">Seleccionar</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                          </select>
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && <label className="label text-xs">Descripción Factura</label>}
                          <input className="input text-sm" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Como aparece en factura" />
                        </div>
                        <div className="col-span-2">
                          {idx === 0 && <label className="label text-xs">Fracción Arancelaria</label>}
                          <input className="input text-sm font-mono" value={item.hsCode} onChange={e => updateItem(idx, 'hsCode', e.target.value)} placeholder="8701.92" />
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && <label className="label text-xs">Cant.</label>}
                          <input type="number" className="input text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && <label className="label text-xs">Costo</label>}
                          <input type="number" step="0.01" className="input text-sm" value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && <label className="label text-xs">Total</label>}
                          <input className="input text-sm bg-gray-50" readOnly value={item.totalCost} />
                        </div>
                        <div className="col-span-1">
                          <button type="button" onClick={() => removeItem(idx)} className="w-full h-9 flex items-center justify-center text-red-400 hover:text-red-600 border rounded">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'documentos' && (
                  <div>
                    <div className="flex justify-between mb-3">
                      <span className="text-sm font-medium">Documentos de la importación</span>
                      <button type="button" onClick={addDoc} className="btn-secondary text-sm px-3 py-1 flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Agregar
                      </button>
                    </div>
                    {form.documents.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Registra los documentos asociados a esta importación.</p>}
                    {form.documents.map((doc, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
                        <div className="col-span-3">
                          {idx === 0 && <label className="label text-xs">Tipo</label>}
                          <select className="input text-sm" value={doc.type} onChange={e => updateDoc(idx, 'type', e.target.value)}>
                            {DOC_TYPES.map(t => <option key={t}>{t.replace('_', ' ')}</option>)}
                          </select>
                        </div>
                        <div className="col-span-5">
                          {idx === 0 && <label className="label text-xs">Nombre / Número</label>}
                          <input className="input text-sm" value={doc.name} onChange={e => updateDoc(idx, 'name', e.target.value)} placeholder="Ej: INV-2024-001" />
                        </div>
                        <div className="col-span-3">
                          {idx === 0 && <label className="label text-xs">Notas</label>}
                          <input className="input text-sm" value={doc.notes} onChange={e => updateDoc(idx, 'notes', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <button type="button" onClick={() => removeDoc(idx)} className="w-full h-9 flex items-center justify-center text-red-400 hover:text-red-600 border rounded">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">{editId ? 'Guardar Cambios' : 'Crear Importación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
