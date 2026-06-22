import { useEffect, useState } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'
import {
  MessageCircle, Mail, Calendar, ShoppingBag, Globe,
  CheckCircle, XCircle, Send, Loader2, Settings, Zap
} from 'lucide-react'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [waOpen, setWaOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [waSending, setWaSending] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [waForm, setWaForm] = useState({ to: '', message: '' })
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' })
  const [calEvents, setCalEvents] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/integrations/status'),
      api.get('/integrations/calendar/events')
    ]).then(([s, c]) => {
      setStatus(s.data)
      setCalEvents(c.data)
    }).finally(() => setLoading(false))
  }, [])

  const sendWA = async (e) => {
    e.preventDefault(); setWaSending(true)
    try {
      const r = await api.post('/integrations/whatsapp/send', waForm)
      if (r.data.simulated) toast.info('Mensaje simulado (configura Twilio para envío real)')
      else toast.success('Mensaje enviado por WhatsApp')
      setWaOpen(false); setWaForm({ to: '', message: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setWaSending(false) }
  }

  const sendEmail = async (e) => {
    e.preventDefault(); setEmailSending(true)
    try {
      const r = await api.post('/integrations/email/send', emailForm)
      if (r.data.simulated) toast.info('Email simulado (configura SMTP para envío real)')
      else toast.success('Email enviado')
      setEmailOpen(false); setEmailForm({ to: '', subject: '', body: '' })
    } catch (err) { toast.error(err.response?.data?.error || 'Error') }
    finally { setEmailSending(false) }
  }

  const StatusBadge = ({ configured }) => configured
    ? <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Conectado</Badge>
    : <Badge variant="secondary" className="flex items-center gap-1"><XCircle className="h-3 w-3" />No configurado</Badge>

  const integrationCards = [
    {
      key: 'whatsapp', title: 'WhatsApp', provider: 'Twilio',
      icon: MessageCircle, color: 'bg-green-500',
      description: 'Envía notificaciones automáticas a clientes cuando se confirma, envía o entrega un pedido.',
      features: ['Notificación de pedido confirmado', 'Alerta de envío en camino', 'Confirmación de entrega'],
      action: () => setWaOpen(true), actionLabel: 'Enviar mensaje'
    },
    {
      key: 'email', title: 'Correo Electrónico', provider: 'SMTP / Gmail',
      icon: Mail, color: 'bg-blue-500',
      description: 'Envía cotizaciones, facturas y notificaciones por correo a tus clientes.',
      features: ['Envío de cotizaciones', 'Notificaciones de pedidos', 'Facturas adjuntas en PDF'],
      action: () => setEmailOpen(true), actionLabel: 'Enviar correo'
    },
    {
      key: 'calendar', title: 'Google Calendar', provider: 'Google API',
      icon: Calendar, color: 'bg-yellow-500',
      description: 'Sincroniza las entregas y citas con Google Calendar para tu equipo de repartidores.',
      features: ['Entregas del día', 'Programación de visitas', 'Recordatorios automáticos'],
      action: null, actionLabel: null
    },
    {
      key: 'mercadolibre', title: 'Mercado Libre', provider: 'ML API',
      icon: ShoppingBag, color: 'bg-yellow-400',
      description: 'Importa pedidos automáticamente y sincroniza el stock con tus publicaciones.',
      features: ['Importar pedidos nuevos', 'Sincronizar stock', 'Ver estado de publicaciones'],
      action: null, actionLabel: null
    },
    {
      key: 'amazon', title: 'Amazon Seller', provider: 'SP-API',
      icon: Globe, color: 'bg-orange-500',
      description: 'Gestiona tus ventas de Amazon directamente desde el sistema.',
      features: ['Importar órdenes', 'Actualizar inventario', 'Reportes de ventas'],
      action: null, actionLabel: null
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground">Conecta AgroMaq con tus plataformas de venta y comunicación</p>
      </div>

      {/* Integration cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrationCards.map(card => {
          const Icon = card.icon
          const s = status?.[card.key]
          return (
            <Card key={card.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${card.color} p-2 rounded-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{card.provider}</p>
                    </div>
                  </div>
                  {loading ? <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" /> : <StatusBadge configured={s?.configured} />}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">{card.description}</p>
                <ul className="space-y-1">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <Zap className="h-3 w-3 text-verde-600" />{f}
                    </li>
                  ))}
                </ul>
                {card.action ? (
                  <Button size="sm" className="mt-auto" onClick={card.action}>
                    <Send className="h-3 w-3 mr-2" />{card.actionLabel}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="mt-auto" disabled>
                    <Settings className="h-3 w-3 mr-2" />Configurar en .env
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Calendar events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-verde-700" /> Entregas Programadas
          </CardTitle>
          <CardDescription>Eventos sincronizados desde el módulo de Entregas</CardDescription>
        </CardHeader>
        <CardContent>
          {calEvents.length > 0 ? (
            <div className="space-y-2">
              {calEvents.map(ev => (
                <div key={ev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.date ? new Date(ev.date).toLocaleDateString('es-MX', { dateStyle: 'full' }) : 'Sin fecha'}
                      {ev.assignedTo && ` · Asignado a: ${ev.assignedTo}`}
                    </p>
                  </div>
                  <Badge variant={ev.status === 'ENTREGADO' ? 'success' : ev.status === 'EN_RUTA' ? 'default' : 'secondary'}>
                    {ev.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay entregas programadas</p>
          )}
        </CardContent>
      </Card>

      {/* Config instructions */}
      <Card className="border-verde-200 bg-verde-50">
        <CardHeader>
          <CardTitle className="text-verde-800 flex items-center gap-2">
            <Settings className="h-5 w-5" /> Configurar Integraciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-verde-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-bold mb-1">📱 WhatsApp (Twilio)</p>
              <code className="block bg-white p-2 rounded text-xs">
                TWILIO_ACCOUNT_SID=ACxxxxx{'\n'}
                TWILIO_AUTH_TOKEN=xxxxx{'\n'}
                TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
              </code>
            </div>
            <div>
              <p className="font-bold mb-1">📧 Correo (Gmail SMTP)</p>
              <code className="block bg-white p-2 rounded text-xs">
                SMTP_HOST=smtp.gmail.com{'\n'}
                SMTP_PORT=587{'\n'}
                SMTP_USER=tu@gmail.com{'\n'}
                SMTP_PASS=app_password
              </code>
            </div>
            <div>
              <p className="font-bold mb-1">🛒 Mercado Libre</p>
              <code className="block bg-white p-2 rounded text-xs">
                ML_CLIENT_ID=tu_client_id{'\n'}
                ML_CLIENT_SECRET=tu_secret
              </code>
            </div>
            <div>
              <p className="font-bold mb-1">📦 Amazon</p>
              <code className="block bg-white p-2 rounded text-xs">
                AMAZON_SELLER_ID=tu_seller_id{'\n'}
                AMAZON_MWS_TOKEN=tu_token
              </code>
            </div>
          </div>
          <p className="text-xs text-verde-600 mt-2">Edita el archivo <strong>server/.env</strong> con tus credenciales y reinicia el servidor.</p>
        </CardContent>
      </Card>

      {/* WhatsApp dialog */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-500" />Enviar WhatsApp</DialogTitle></DialogHeader>
          <form onSubmit={sendWA} className="space-y-4">
            <div><Label>Número (con código de país)</Label><Input value={waForm.to} onChange={e => setWaForm(f=>({...f,to:e.target.value}))} placeholder="+521234567890" required /></div>
            <div><Label>Mensaje</Label><Textarea value={waForm.message} onChange={e => setWaForm(f=>({...f,message:e.target.value}))} rows={4} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setWaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={waSending}>{waSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-blue-500" />Enviar Correo</DialogTitle></DialogHeader>
          <form onSubmit={sendEmail} className="space-y-4">
            <div><Label>Para</Label><Input type="email" value={emailForm.to} onChange={e => setEmailForm(f=>({...f,to:e.target.value}))} placeholder="cliente@empresa.com" required /></div>
            <div><Label>Asunto</Label><Input value={emailForm.subject} onChange={e => setEmailForm(f=>({...f,subject:e.target.value}))} required /></div>
            <div><Label>Mensaje</Label><Textarea value={emailForm.body} onChange={e => setEmailForm(f=>({...f,body:e.target.value}))} rows={5} required /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={emailSending}>{emailSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
