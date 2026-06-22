import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useToastStore } from '../store/toastStore'
import { Plus, Edit, Settings, Warehouse, Tag, Package, Users, Building2, Receipt, X, CheckCircle, AlertCircle } from 'lucide-react'

export default function Config() {
  const [tab, setTab] = useState('empresa')
  const [company, setCompany] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editType, setEditType] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [companyForm, setCompanyForm] = useState({})
  const [finkocForm, setFinkocForm] = useState({})
  const [quoteForm, setQuoteForm] = useState({})
  const [savingCompany, setSavingCompany] = useState(false)
  const [savingFinkoc, setSavingFinkoc] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [finkocStatus, setFinkocStatus] = useState(null)
  const { addToast } = useToastStore()

  const loadAll = async () => {
    setLoading(true)
    try {
      const [w, c, b, u, co, fk] = await Promise.all([
        api.get('/warehouses').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/brands').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/auth/company').catch(() => ({ data: null })),
        api.get('/billing/config').catch(() => ({ data: {} })),
      ])
      setWarehouses(w.data || [])
      setCategories(c.data || [])
      setBrands(b.data || [])
      setUsers(u.data || [])
      if (co.data) {
        setCompany(co.data)
        setCompanyForm(co.data)
        setFinkocForm({
          finkocUser: co.data.finkocUser || '',
          finkocPassword: '',
          finkocRfc: co.data.finkocRfc || co.data.rfc || '',
          finkocEnv: co.data.finkocEnv || 'sandbox',
        })
        setQuoteForm({
          quoteTerms: co.data.quoteTerms || '',
          quoteValidity: co.data.quoteValidity || 15,
          quoteCurrency: co.data.quoteCurrency || 'MXN',
        })
      }
      setFinkocStatus(fk.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const saveCompany = async (e) => {
    e.preventDefault(); setSavingCompany(true)
    try {
      await api.put('/auth/company', companyForm)
      addToast('Datos de empresa guardados', 'success'); loadAll()
    } catch { addToast('Error al guardar', 'error') }
    setSavingCompany(false)
  }

  const saveFinkoc = async (e) => {
    e.preventDefault(); setSavingFinkoc(true)
    try {
      await api.put('/auth/company', finkocForm)
      addToast('Configuración FINKOC guardada', 'success'); loadAll()
    } catch { addToast('Error al guardar', 'error') }
    setSavingFinkoc(false)
  }

  const saveQuote = async (e) => {
    e.preventDefault(); setSavingQuote(true)
    try {
      await api.put('/auth/company', quoteForm)
      addToast('Configuración de cotizaciones guardada', 'success'); loadAll()
    } catch { addToast('Error al guardar', 'error') }
    setSavingQuote(false)
  }

  const openCreate = (type) => { setEditType(type); setEditing(null); setForm({ name: '' }); setOpen(true) }
  const openEdit = (type, item) => { setEditType(type); setEditing(item); setForm(item); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault()
    const endpoints = { warehouses: '/warehouses', categories: '/categories', brands: '/brands' }
    try {
      if (editing) await api.put(`${endpoints[editType]}/${editing.id}`, form)
      else await api.post(endpoints[editType], form)
      addToast(editing ? 'Actualizado' : 'Creado', 'success')
      setOpen(false); loadAll()
    } catch (err) { addToast(err.response?.data?.error || 'Error', 'error') }
  }

  const tabs = [
    { key: 'empresa', label: 'Empresa', icon: Building2 },
    { key: 'finkoc', label: 'FINKOC / Facturación', icon: Receipt },
    { key: 'cotizaciones', label: 'Cotizaciones', icon: Package },
    { key: 'warehouses', label: 'Almacenes', icon: Warehouse },
    { key: 'categories', label: 'Categorías', icon: Tag },
    { key: 'brands', label: 'Marcas', icon: Package },
    { key: 'users', label: 'Usuarios', icon: Users },
  ]

  const REGIMENES = [
    { value: '601', label: '601 — General de Ley Personas Morales' },
    { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
    { value: '612', label: '612 — Personas Físicas con Actividades Empresariales' },
    { value: '616', label: '616 — Sin Obligaciones Fiscales' },
    { value: '621', label: '621 — Incorporación Fiscal' },
    { value: '626', label: '626 — Régimen Simplificado de Confianza' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm">Empresa, facturación FINKOC, almacenes y catálogos</p>
      </div>

      <div className="flex gap-1 border-b flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Company */}
      {tab === 'empresa' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Datos de la Empresa</h2>
          <form onSubmit={saveCompany} className="grid grid-cols-2 gap-4">
            <div><label className="label">Razón Social *</label><input className="input" value={companyForm.name || ''} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} required /></div>
            <div><label className="label">RFC *</label><input className="input font-mono" value={companyForm.rfc || ''} onChange={e => setCompanyForm({ ...companyForm, rfc: e.target.value })} required placeholder="AMM200101ABC" /></div>
            <div className="col-span-2"><label className="label">Dirección Fiscal</label><input className="input" value={companyForm.address || ''} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} /></div>
            <div><label className="label">Teléfono</label><input className="input" value={companyForm.phone || ''} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
            <div><label className="label">Correo</label><input type="email" className="input" value={companyForm.email || ''} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} /></div>
            <div>
              <label className="label">Régimen Fiscal</label>
              <select className="input" value={companyForm.regimenFiscal || '601'} onChange={e => setCompanyForm({ ...companyForm, regimenFiscal: e.target.value })}>
                {REGIMENES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><label className="label">Serie de Documentos</label><input className="input" value={companyForm.docSeries || 'A'} onChange={e => setCompanyForm({ ...companyForm, docSeries: e.target.value })} /></div>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={savingCompany} className="btn-primary">{savingCompany ? 'Guardando...' : 'Guardar Empresa'}</button>
            </div>
          </form>
        </div>
      )}

      {/* FINKOC */}
      {tab === 'finkoc' && (
        <div className="space-y-4">
          {/* Status card */}
          <div className={`card p-4 flex items-center gap-4 ${finkocStatus?.hasCredentials ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
            {finkocStatus?.hasCredentials ? (
              <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="h-8 w-8 text-yellow-500 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{finkocStatus?.hasCredentials ? 'FINKOC Configurado' : 'FINKOC No Configurado'}</p>
              <p className="text-sm text-gray-600">
                {finkocStatus?.hasCredentials
                  ? `Usuario: ${finkocStatus.finkocUser} — Ambiente: ${finkocStatus.finkocEnv === 'production' ? 'Producción' : 'Pruebas (Sandbox)'}`
                  : 'Configura tus credenciales FINKOC para emitir CFDIs 4.0 reales. Sin credenciales, el sistema simula los timbres.'}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-1">Credenciales FINKOC</h2>
            <p className="text-sm text-gray-500 mb-4">
              FINKOC es un PAC (Proveedor Autorizado de Certificación) para timbrado de CFDI 4.0 ante el SAT.
              Obtén tus credenciales en <span className="font-medium text-green-700">www.finkoc.com</span>
            </p>
            <form onSubmit={saveFinkoc} className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Usuario FINKOC</label>
                <input className="input" value={finkocForm.finkocUser || ''} onChange={e => setFinkocForm({ ...finkocForm, finkocUser: e.target.value })} placeholder="usuario@empresa.com" />
              </div>
              <div>
                <label className="label">Contraseña FINKOC</label>
                <input type="password" className="input" value={finkocForm.finkocPassword || ''} onChange={e => setFinkocForm({ ...finkocForm, finkocPassword: e.target.value })} placeholder="Dejar en blanco para no cambiar" />
              </div>
              <div>
                <label className="label">RFC del Emisor</label>
                <input className="input font-mono" value={finkocForm.finkocRfc || ''} onChange={e => setFinkocForm({ ...finkocForm, finkocRfc: e.target.value })} placeholder="RFC de la empresa para timbrado" />
              </div>
              <div>
                <label className="label">Ambiente</label>
                <select className="input" value={finkocForm.finkocEnv || 'sandbox'} onChange={e => setFinkocForm({ ...finkocForm, finkocEnv: e.target.value })}>
                  <option value="sandbox">Sandbox (Pruebas)</option>
                  <option value="production">Producción (Real)</option>
                </select>
              </div>
              <div className="col-span-2 bg-blue-50 p-3 rounded text-sm text-blue-700">
                <p className="font-medium">Flujo de facturación:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Crear cotización → Aprobar → Convertir a Venta</li>
                  <li>Desde <strong>Facturación</strong>, seleccionar la venta y generar CFDI 4.0</li>
                  <li>FINKOC timbrará el comprobante y lo enviará al SAT</li>
                  <li>Se genera PDF del CFDI para el cliente</li>
                </ol>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" disabled={savingFinkoc} className="btn-primary">{savingFinkoc ? 'Guardando...' : 'Guardar Credenciales FINKOC'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quote Config */}
      {tab === 'cotizaciones' && (
        <div className="card p-6">
          <h2 className="text-lg font-bold mb-4">Configuración de Cotizaciones</h2>
          <form onSubmit={saveQuote} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Vigencia predeterminada (días)</label>
                <input type="number" className="input" value={quoteForm.quoteValidity || 15} onChange={e => setQuoteForm({ ...quoteForm, quoteValidity: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className="label">Moneda predeterminada</label>
                <select className="input" value={quoteForm.quoteCurrency || 'MXN'} onChange={e => setQuoteForm({ ...quoteForm, quoteCurrency: e.target.value })}>
                  <option>MXN</option><option>USD</option><option>EUR</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Términos y condiciones predeterminados</label>
              <textarea className="input w-full" rows={4} value={quoteForm.quoteTerms || ''}
                onChange={e => setQuoteForm({ ...quoteForm, quoteTerms: e.target.value })}
                placeholder="Aparecerán en el PDF de cotización. Ej: Precios en MXN con IVA incluido. Cotización sujeta a disponibilidad. Tiempo de entrega de 5 a 10 días hábiles." />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingQuote} className="btn-primary">{savingQuote ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Warehouses */}
      {tab === 'warehouses' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div><h2 className="font-bold">Almacenes</h2><p className="text-sm text-gray-500">Ubicaciones de inventario</p></div>
            <button onClick={() => openCreate('warehouses')} className="btn-primary flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />Nuevo</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Nombre', 'Descripción', 'Ubicación', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {warehouses.map(w => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-gray-500">{w.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{w.location || '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => openEdit('warehouses', w)} className="text-gray-400 hover:text-gray-700"><Edit className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {warehouses.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sin almacenes</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div><h2 className="font-bold">Categorías</h2><p className="text-sm text-gray-500">Clasificación de productos</p></div>
            <button onClick={() => openCreate('categories')} className="btn-primary flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />Nueva</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Nombre', 'Productos', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c._count?.products || 0}</td>
                  <td className="px-4 py-3"><button onClick={() => openEdit('categories', c)} className="text-gray-400 hover:text-gray-700"><Edit className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin categorías</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Brands */}
      {tab === 'brands' && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div><h2 className="font-bold">Marcas</h2><p className="text-sm text-gray-500">Fabricantes y marcas</p></div>
            <button onClick={() => openCreate('brands')} className="btn-primary flex items-center gap-1 text-sm"><Plus className="h-4 w-4" />Nueva</button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Nombre', 'Productos', ''].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {brands.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3">{b._count?.products || 0}</td>
                  <td className="px-4 py-3"><button onClick={() => openEdit('brands', b)} className="text-gray-400 hover:text-gray-700"><Edit className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {brands.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin marcas</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-bold">Usuarios del Sistema</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              {['Nombre', 'Email', 'Rol', 'Estado'].map(h => <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">{u.role}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.active ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-400">Sin usuarios</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editing ? 'Editar' : 'Nuevo'} {editType === 'warehouses' ? 'Almacén' : editType === 'categories' ? 'Categoría' : 'Marca'}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div><label className="label">Nombre *</label><input className="input w-full" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              {editType === 'warehouses' && <div><label className="label">Ubicación</label><input className="input w-full" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Dirección o referencia" /></div>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
