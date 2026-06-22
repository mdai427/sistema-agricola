import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, Edit, Loader2, Settings, Warehouse, Tag, Package } from 'lucide-react'

export default function Config() {
  const [tab, setTab] = useState('warehouses')
  const [warehouses, setWarehouses] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editType, setEditType] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', location: '' })
  const [saving, setSaving] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [w, c, b, u] = await Promise.all([
        api.get('/warehouses').catch(() => ({ data: [] })),
        api.get('/categories').catch(() => ({ data: [] })),
        api.get('/brands').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
      ])
      setWarehouses(w.data || [])
      setCategories(c.data || [])
      setBrands(b.data || [])
      setUsers(u.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const openCreate = (type) => { setEditType(type); setEditing(null); setForm({ name: '', description: '', location: '' }); setOpen(true) }
  const openEdit = (type, item) => { setEditType(type); setEditing(item); setForm(item); setOpen(true) }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    const endpoints = { warehouses: '/warehouses', categories: '/categories', brands: '/brands' }
    const endpoint = endpoints[editType]
    try {
      if (editing) { await api.put(`${endpoint}/${editing.id}`, form); toast.success('Actualizado correctamente') }
      else { await api.post(endpoint, form); toast.success('Creado correctamente') }
      setOpen(false); loadAll()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const tabs = [
    { key: 'warehouses', label: 'Almacenes', icon: Warehouse },
    { key: 'categories', label: 'Categorías', icon: Tag },
    { key: 'brands', label: 'Marcas', icon: Package },
    { key: 'users', label: 'Usuarios', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Administra los catálogos del sistema</p>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-verde-700 text-verde-700' : 'border-transparent text-muted-foreground hover:text-gray-700'}`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div>}

      {/* Warehouses */}
      {tab === 'warehouses' && !loading && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Almacenes</CardTitle><CardDescription>Ubicaciones de inventario</CardDescription></div>
            <Button onClick={() => openCreate('warehouses')}><Plus className="h-4 w-4 mr-2" />Nuevo</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead>Ubicación</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.description || '-'}</TableCell>
                    <TableCell>{w.location || '-'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit('warehouses', w)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {warehouses.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay almacenes</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {tab === 'categories' && !loading && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Categorías de Productos</CardTitle><CardDescription>Clasificación del catálogo</CardDescription></div>
            <Button onClick={() => openCreate('categories')}><Plus className="h-4 w-4 mr-2" />Nueva</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead>Productos</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.description || '-'}</TableCell>
                    <TableCell>{c._count?.products || 0}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit('categories', c)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay categorías</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Brands */}
      {tab === 'brands' && !loading && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Marcas</CardTitle><CardDescription>Fabricantes y marcas del catálogo</CardDescription></div>
            <Button onClick={() => openCreate('brands')}><Plus className="h-4 w-4 mr-2" />Nueva</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Descripción</TableHead><TableHead>Productos</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {brands.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.description || '-'}</TableCell>
                    <TableCell>{b._count?.products || 0}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit('brands', b)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {brands.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay marcas</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Users */}
      {tab === 'users' && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Sistema</CardTitle>
            <CardDescription>Gestión de accesos y permisos</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell><span className={`text-xs font-medium px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.active ? 'Activo' : 'Inactivo'}</span></TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay usuarios</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog for warehouses/categories/brands */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar' : 'Nuevo'} {editType === 'warehouses' ? 'Almacén' : editType === 'categories' ? 'Categoría' : 'Marca'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
            <div><Label>Descripción</Label><Input value={form.description||''} onChange={e => setForm(f=>({...f,description:e.target.value}))} /></div>
            {editType === 'warehouses' && <div><Label>Ubicación</Label><Input value={form.location||''} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="Dirección o referencia" /></div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
