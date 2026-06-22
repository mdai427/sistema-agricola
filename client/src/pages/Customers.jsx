import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Plus, Search, Edit, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMXN } from '../lib/utils'

const TYPE_LABELS = { PUBLICO_GENERAL: 'Público', MAYORISTA: 'Mayorista', DISTRIBUIDOR: 'Distribuidor', GOBIERNO: 'Gobierno' }
const TYPE_VARIANTS = { PUBLICO_GENERAL: 'secondary', MAYORISTA: 'default', DISTRIBUIDOR: 'success', GOBIERNO: 'warning' }
const empty = { name: '', rfc: '', email: '', phone: '', whatsapp: '', address: '', city: '', state: '', type: 'PUBLICO_GENERAL', creditLimit: 0, notes: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
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
      const r = await api.get('/customers', { params: { search, page, limit: 20 } })
      setCustomers(r.data.customers); setTotal(r.data.total); setPages(r.data.pages)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) { await api.put(`/customers/${editing.id}`, form); toast.success('Cliente actualizado') }
      else { await api.post('/customers', form); toast.success('Cliente creado') }
      setOpen(false); load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Clientes</h1><p className="text-muted-foreground">{total} clientes registrados</p></div>
        <Button onClick={() => { setEditing(null); setForm(empty); setOpen(true) }}><Plus className="h-4 w-4 mr-2" />Nuevo Cliente</Button>
      </div>
      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar clientes..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>RFC</TableHead><TableHead>Tipo</TableHead><TableHead>Teléfono</TableHead><TableHead>Ciudad</TableHead><TableHead>Crédito</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.rfc || '-'}</TableCell>
                    <TableCell><Badge variant={TYPE_VARIANTS[c.type]}>{TYPE_LABELS[c.type]}</Badge></TableCell>
                    <TableCell className="text-sm">{c.phone || '-'}</TableCell>
                    <TableCell className="text-sm">{c.city || '-'}</TableCell>
                    <TableCell className="text-sm">{c.creditLimit > 0 ? formatMXN(c.creditLimit) : '-'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm(c); setOpen(true) }}><Edit className="h-4 w-4" /></Button></TableCell>
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required /></div>
              <div><Label>RFC</Label><Input value={form.rfc||''} onChange={e => setForm(f=>({...f,rfc:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Teléfono</Label><Input value={form.phone||''} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp||''} onChange={e => setForm(f=>({...f,whatsapp:e.target.value}))} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label>Dirección</Label><Input value={form.address||''} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ciudad</Label><Input value={form.city||''} onChange={e => setForm(f=>({...f,city:e.target.value}))} /></div>
              <div><Label>Estado</Label><Input value={form.state||''} onChange={e => setForm(f=>({...f,state:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f=>({...f,type:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLICO_GENERAL">Público General</SelectItem>
                    <SelectItem value="MAYORISTA">Mayorista</SelectItem>
                    <SelectItem value="DISTRIBUIDOR">Distribuidor</SelectItem>
                    <SelectItem value="GOBIERNO">Gobierno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Límite de Crédito</Label><Input type="number" value={form.creditLimit||0} onChange={e => setForm(f=>({...f,creditLimit:parseFloat(e.target.value)}))} /></div>
            </div>
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
