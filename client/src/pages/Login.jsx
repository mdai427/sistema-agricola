import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { toast } from '../store/toastStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Tractor, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('admin@agromaq.mx')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-800 to-verde-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-verde-700 p-4 rounded-full">
              <Tractor className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">AgroMaq</CardTitle>
          <CardDescription>Sistema de Gestión Comercial</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.mx" required />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar sesión
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Demo: admin@agromaq.mx / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
