import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Bell, Package, FileText, ShoppingCart, Truck, X } from 'lucide-react'
import { Badge } from './ui/badge'

const TYPE_ICONS = {
  STOCK_BAJO: Package,
  PENDIENTE_FACTURA: FileText,
  PEDIDO_SIN_ATENDER: ShoppingCart,
  ENTREGA_HOY: Truck,
}

const SEVERITY_STYLES = {
  CRITICO: 'border-l-4 border-red-500 bg-red-50',
  ADVERTENCIA: 'border-l-4 border-yellow-500 bg-yellow-50',
  INFO: 'border-l-4 border-blue-500 bg-blue-50',
}

const SEVERITY_BADGE = {
  CRITICO: 'destructive',
  ADVERTENCIA: 'warning',
  INFO: 'secondary',
}

export function AlertsPanel({ onClose }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState([])

  useEffect(() => {
    api.get('/alerts').then(r => setAlerts(r.data)).finally(() => setLoading(false))
  }, [])

  const visible = alerts.filter(a => !dismissed.includes(a.id))

  return (
    <div className="fixed right-4 top-16 z-50 w-96 max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-2xl border">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-verde-700" />
          <span className="font-semibold">Alertas</span>
          {visible.length > 0 && <Badge variant="destructive" className="text-xs">{visible.length}</Badge>}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-3 space-y-2">
        {loading && <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-verde-700 rounded-full border-t-transparent" /></div>}
        {!loading && visible.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Sin alertas pendientes</p>
          </div>
        )}
        {visible.map(alert => {
          const Icon = TYPE_ICONS[alert.type] || Bell
          return (
            <div key={alert.id} className={`p-3 rounded-lg ${SEVERITY_STYLES[alert.severity]} flex gap-3`}>
              <Icon className="h-5 w-5 mt-0.5 shrink-0 text-gray-600" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <Badge variant={SEVERITY_BADGE[alert.severity]} className="text-xs shrink-0">{alert.severity}</Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
              </div>
              <button onClick={() => setDismissed(d => [...d, alert.id])} className="shrink-0 hover:bg-white/50 rounded p-0.5">
                <X className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
