import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { formatMXN, formatDateTime, formatDate } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Truck, Search, Loader2, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { generateDeliveryPDF } from '../lib/pdf'

const dlDeliveryPDF = async (shipment) => {
  const cr = await api.get('/config/company').catch(() => ({ data: null }))
  await generateDeliveryPDF(shipment, cr.data)
}

const STATUS_LABELS = { PENDIENTE: 'Pendiente', EN_RUTA: 'En Ruta', ENTREGADO: 'Entregado', FALLIDO: 'Fallido' }
const STATUS_VARIANTS = { PENDIENTE: 'warning', EN_RUTA: 'default', ENTREGADO: 'success', FALLIDO: 'destructive' }
const TYPE_LABELS = { DOMICILIO: 'A domicilio', SUCURSAL: 'Sucursal', MENSAJERIA: 'Mensajería' }

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewShipment, setViewShipment] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/shipments', { params: { search, page, limit: 20 } })
      setShipments(r.data.shipments || []); setTotal(r.data.total || 0); setPages(r.data.pages || 1)
    } catch { setShipments([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search, page])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/shipments/${id}/status`, { status })
      toast.success('Estado actualizado')
      load()
    } catch { toast.error('Error al actualizar') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entregas</h1>
          <p className="text-muted-foreground">{total} envíos registrados</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar entregas..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Fecha Prog.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-bold">{s.order?.folio}</TableCell>
                    <TableCell>{s.order?.customer?.name || 'Público General'}</TableCell>
                    <TableCell><Badge variant="secondary">{TYPE_LABELS[s.type] || s.type}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{s.address || '-'}</TableCell>
                    <TableCell className="text-xs">{s.scheduledDate ? formatDate(s.scheduledDate) : '-'}</TableCell>
                    <TableCell>
                      <Select value={s.status} onValueChange={v => updateStatus(s.id, v)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(STATUS_LABELS).map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setViewShipment(s)}><Truck className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {shipments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay entregas registradas</TableCell></TableRow>}
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

      {viewShipment && (
        <Dialog open={!!viewShipment} onOpenChange={() => setViewShipment(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Detalle de Entrega</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Pedido:</span> <span className="font-bold font-mono">{viewShipment.order?.folio}</span></div>
                <div><span className="text-muted-foreground">Estado:</span> <Badge variant={STATUS_VARIANTS[viewShipment.status]}>{STATUS_LABELS[viewShipment.status]}</Badge></div>
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{viewShipment.order?.customer?.name || 'Público General'}</span></div>
                <div><span className="text-muted-foreground">Tipo:</span> <span>{TYPE_LABELS[viewShipment.type] || viewShipment.type}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> <span>{viewShipment.address || '-'}</span></div>
                {viewShipment.trackingNumber && <div className="col-span-2"><span className="text-muted-foreground">Guía:</span> <span className="font-mono">{viewShipment.trackingNumber}</span></div>}
                {viewShipment.notes && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> <span>{viewShipment.notes}</span></div>}
              </div>
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => dlDeliveryPDF(viewShipment)} className="gap-2">
                  <Download className="h-4 w-4" /> Nota de Entrega PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
