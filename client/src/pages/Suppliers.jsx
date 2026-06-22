import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, Search, Edit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const empty = { name: '', rfc: '', email: '', phone: '', contactName: '', address: '', city: '', state: '', paymentTerms: 30, notes: '' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/suppliers', { params: { search, page, limit: 20 } })
      setSuppliers(r.data.suppliers || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1)
    } catch { setSuppliers([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/suppliers/${editing.id}`, form); toast.success('Proveedor actualizado') }
      else { await api.post('/suppliers', form); toast.success('Proveedor creado') }
      setOpen(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Proveedores</h1><p className="text-muted-foreground">{total} proveedores registrados</p></div>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true) }}><Plus className="h-4 w-4 mr-2" />Nuevo Proveedor</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar proveedores..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>RFC</TableHead><TableHead>Contacto</TableHead><TableHead>Teléfono</TableHead><TableHead>Ciudad</TableHead><TableHead>Días Crédito</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {suppliers.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.rfc || '-'}</TableCell>
                    <TableCell>{s.contactName || '-'}</TableCell>
                    <TableCell>{s.phone || '-'}</TableCell>
                    <TableCell>{s.city || '-'}</TableCell>
                    <TableCell>{s.paymentTerms || 0} días</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm(s); setOpen(true) }}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay proveedores</TableCell></TableRow>}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Razón Social *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div><Label>RFC</Label><Input value={form.rfc||''} onChange={e => setForm(f=>({...f,rfc:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nombre Contacto</Label><Input value={form.contactName||''} onChange={e => setForm(f=>({...f,contactName:e.target.value}))} /></div>
              <div><Label>Teléfono</Label><Input value={form.phone||''} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label>Dirección</Label><Input value={form.address||''} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ciudad</Label><Input value={form.city||''} onChange={e => setForm(f=>({...f,city:e.target.value}))} /></div>
              <div><Label>Días de Crédito</Label><Input type="number" value={form.paymentTerms||30} onChange={e => setForm(f=>({...f,paymentTerms:parseInt(e.target.value)}))} /></div>
            </div>
            <div><Label>Notas</Label><Input value={form.notes||''} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
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
