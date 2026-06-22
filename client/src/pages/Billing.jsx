import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { formatMXN, formatDateTime } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const CFDI_USES = [
  { value: 'G01', label: 'G01 - Adquisición de mercancias' },
  { value: 'G03', label: 'G03 - Gastos en general' },
  { value: 'I04', label: 'I04 - Equipo de computo y accesorios' },
  { value: 'I08', label: 'I08 - Otra maquinaria y equipo' },
  { value: 'P01', label: 'P01 - Por definir' },
  { value: 'S01', label: 'S01 - Sin efectos fiscales' },
]

const REGIMENES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
]

export default function Billing() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cfdiOpen, setCfdiOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cfdiData, setCfdiData] = useState(null)
  const [invoiceForm, setInvoiceForm] = useState({ cfdiUse: 'G03', regimenFiscal: '616' })
  const [saving, setSaving] = useState(false)
  const [cfdiLoading, setCfdiLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/orders', { params: { status: 'ENTREGADO', limit: 50 } })
      setOrders(r.data.orders || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCfdi = async (order) => {
    setSelectedOrder(order)
    setCfdiLoading(true)
    setCfdiOpen(true)
    try {
      const r = await api.get(`/billing/${order.id}/cfdi-data`)
      setCfdiData(r.data)
    } catch { toast.error('Error al cargar datos CFDI') }
    finally { setCfdiLoading(false) }
  }

  const markInvoiced = async () => {
    if (!selectedOrder) return
    setSaving(true)
    try {
      await api.patch(`/billing/${selectedOrder.id}/invoice`, invoiceForm)
      toast.success('Pedido marcado como facturado')
      setCfdiOpen(false)
      load()
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-muted-foreground">Gestiona los datos CFDI de tus pedidos entregados</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-3 rounded-lg"><AlertCircle className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes de facturar</p>
                <p className="text-2xl font-bold">{orders.filter(o => !o.cfdiUse).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Facturados</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.cfdiUse).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total entregados</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Pedidos Entregados</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-verde-700" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>CFDI</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-bold">{o.folio}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(o.createdAt)}</TableCell>
                    <TableCell>{o.customer?.name || 'Público General'}</TableCell>
                    <TableCell className="font-mono text-xs">{o.customer?.rfc || <span className="text-muted-foreground">Sin RFC</span>}</TableCell>
                    <TableCell className="font-bold text-verde-700">{formatMXN(o.total)}</TableCell>
                    <TableCell>
                      {o.cfdiUse
                        ? <Badge variant="success" className="flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" />{o.cfdiUse}</Badge>
                        : <Badge variant="warning">Pendiente</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={o.cfdiUse ? 'outline' : 'default'} onClick={() => openCfdi(o)}>
                        <FileText className="h-3 w-3 mr-1" />{o.cfdiUse ? 'Ver CFDI' : 'Facturar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay pedidos entregados</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CFDI Dialog */}
      <Dialog open={cfdiOpen} onOpenChange={setCfdiOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Datos de Facturación — {selectedOrder?.folio}</DialogTitle></DialogHeader>
          {cfdiLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : cfdiData && (
            <div className="space-y-4">
              {/* Emisor */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-bold text-verde-700 mb-2">Emisor</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">RFC:</span> <span className="font-mono">{cfdiData.emisor?.rfc}</span></div>
                  <div><span className="text-muted-foreground">Razón Social:</span> {cfdiData.emisor?.nombre}</div>
                  <div><span className="text-muted-foreground">Régimen:</span> {cfdiData.emisor?.regimenFiscal}</div>
                </div>
              </div>
              {/* Receptor */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-700 mb-2">Receptor</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">RFC:</span> <span className="font-mono">{cfdiData.receptor?.rfc}</span></div>
                  <div><span className="text-muted-foreground">Nombre:</span> {cfdiData.receptor?.nombre}</div>
                </div>
              </div>
              {/* Config CFDI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Uso del CFDI</Label>
                  <Select value={invoiceForm.cfdiUse} onValueChange={v => setInvoiceForm(f=>({...f,cfdiUse:v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CFDI_USES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Régimen Fiscal Receptor</Label>
                  <Select value={invoiceForm.regimenFiscal} onValueChange={v => setInvoiceForm(f=>({...f,regimenFiscal:v}))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REGIMENES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {/* Conceptos */}
              <div>
                <p className="text-sm font-bold mb-2">Conceptos</p>
                <Table>
                  <TableHeader><TableRow><TableHead>Descripción</TableHead><TableHead>Cant.</TableHead><TableHead>Precio</TableHead><TableHead>Importe</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cfdiData.conceptos?.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{c.descripcion}</TableCell>
                        <TableCell>{c.cantidad}</TableCell>
                        <TableCell>{formatMXN(c.valorUnitario)}</TableCell>
                        <TableCell className="font-medium">{formatMXN(c.importe)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totales */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMXN(cfdiData.subTotal)}</span></div>
                <div className="flex justify-between"><span>IVA 16%</span><span>{formatMXN(cfdiData.iva)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span className="text-verde-700">{formatMXN(cfdiData.total)}</span></div>
              </div>
              <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded p-3">
                ⚠️ Estos datos son para tu PAC (Proveedor Autorizado de Certificación). AgroMaq genera la estructura CFDI 4.0; el timbrado lo realiza tu PAC conectado.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCfdiOpen(false)}>Cerrar</Button>
            {!selectedOrder?.cfdiUse && <Button onClick={markInvoiced} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Marcar como Facturado</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
