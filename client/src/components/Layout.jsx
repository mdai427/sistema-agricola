import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users, Truck, DollarSign,
  Settings, ChevronLeft, ChevronRight, LogOut, FileText, ShoppingBag,
  BarChart2, Moon, Sun, Tractor, Bell, Zap, Ship
} from 'lucide-react'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { AlertsPanel } from './AlertsPanel'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Productos', icon: Package, path: '/productos' },
  { label: 'Inventario', icon: Warehouse, path: '/inventario' },
  { label: 'Ventas', icon: ShoppingCart, path: '/ventas' },
  { label: 'Cotizaciones', icon: FileText, path: '/cotizaciones' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Proveedores', icon: ShoppingBag, path: '/proveedores' },
  { label: 'Compras', icon: Package, path: '/compras' },
  { label: 'Importaciones', icon: Ship, path: '/importaciones' },
  { label: 'Entregas', icon: Truck, path: '/entregas' },
  { label: 'Caja', icon: DollarSign, path: '/caja' },
  { label: 'Reportes', icon: BarChart2, path: '/reportes' },
  { label: 'Facturación', icon: FileText, path: '/facturacion' },
  { label: 'Integraciones', icon: Zap, path: '/integraciones' },
  { label: 'Configuración', icon: Settings, path: '/configuracion' },
]

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    api.get('/alerts').then(r => setAlertCount(r.data.filter(a => a.severity === 'CRITICO' || a.severity === 'ADVERTENCIA').length)).catch(() => {})
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleDark = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={cn('flex flex-col bg-verde-800 text-white transition-all duration-300 shrink-0', collapsed ? 'w-16' : 'w-64')}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-verde-700">
          <Tractor className="h-8 w-8 text-white shrink-0" />
          {!collapsed && <div><p className="font-bold text-lg leading-tight">AgroMaq</p><p className="text-xs text-verde-300">Sistema de Gestión</p></div>}
        </div>
        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={cn('sidebar-link text-verde-100', location.pathname === item.path && 'active')}>
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        {/* Footer */}
        <div className="p-2 border-t border-verde-700">
          {!collapsed && <div className="px-3 py-2 text-xs text-verde-300">
            <p className="font-medium text-white">{user?.name}</p>
            <p>{user?.role}</p>
          </div>}
          <button onClick={handleLogout} className="sidebar-link text-verde-100 w-full">
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white dark:bg-gray-800 border-b flex items-center justify-between px-4 py-3 shrink-0">
          <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowAlerts(!showAlerts)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                <Bell className="h-5 w-5" />
                {alertCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">{alertCount > 9 ? '9+' : alertCount}</span>}
              </button>
              {showAlerts && <AlertsPanel onClose={() => setShowAlerts(false)} />}
            </div>
            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
