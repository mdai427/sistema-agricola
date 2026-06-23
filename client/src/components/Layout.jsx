import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users, Truck,
  DollarSign, Settings, LogOut, FileText, ShoppingBag, BarChart2,
  Moon, Sun, Tractor, Bell, Zap, Ship, ChevronLeft, ChevronRight,
  Search, Menu, X, ChevronDown
} from 'lucide-react'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { AlertsPanel } from './AlertsPanel'

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    ]
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Ventas', icon: ShoppingCart, path: '/ventas' },
      { label: 'Cotizaciones', icon: FileText, path: '/cotizaciones' },
      { label: 'Clientes', icon: Users, path: '/clientes' },
      { label: 'Entregas', icon: Truck, path: '/entregas' },
    ]
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos', icon: Package, path: '/productos' },
      { label: 'Inventario', icon: Warehouse, path: '/inventario' },
      { label: 'Compras', icon: ShoppingBag, path: '/compras' },
      { label: 'Importaciones', icon: Ship, path: '/importaciones' },
      { label: 'Proveedores', icon: ShoppingBag, path: '/proveedores' },
    ]
  },
  {
    label: 'Finanzas',
    items: [
      { label: 'Caja', icon: DollarSign, path: '/caja' },
      { label: 'Facturación', icon: FileText, path: '/facturacion' },
      { label: 'Reportes', icon: BarChart2, path: '/reportes' },
    ]
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Integraciones', icon: Zap, path: '/integraciones' },
      { label: 'Configuración', icon: Settings, path: '/configuracion' },
    ]
  },
]

export function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const alertsRef = useRef(null)

  useEffect(() => {
    api.get('/alerts').then(r => {
      setAlertCount(r.data.filter(a => a.severity === 'CRITICO' || a.severity === 'ADVERTENCIA').length)
    }).catch(() => {})
  }, [location.pathname])

  useEffect(() => {
    const handler = (e) => { if (alertsRef.current && !alertsRef.current.contains(e.target)) setShowAlerts(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative z-50 lg:z-auto flex flex-col h-full transition-all duration-300 shrink-0',
        'border-r border-white/5',
        collapsed ? 'w-[68px]' : 'w-[260px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
        style={{ background: 'linear-gradient(180deg, #0a1f10 0%, #0d2615 50%, #0a1f10 100%)' }}
      >
        {/* Brand */}
        <div className={cn('flex items-center gap-3 px-4 h-16 border-b shrink-0', 'border-white/8')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0 shadow-lg">
            <Tractor className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight truncate">AgroMaq ERP</p>
              <p className="text-[11px] text-green-400/80 truncate">San Raul Agroindustries</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-1">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn('sidebar-link', active && 'active', collapsed && 'justify-center')}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" size={18} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-white/8 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-white/40 truncate">{user?.role}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} className={cn('sidebar-link w-full', collapsed && 'justify-center')}>
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-4 shrink-0">
          {/* Mobile menu / collapse */}
          <button
            onClick={() => { window.innerWidth >= 1024 ? setCollapsed(!collapsed) : setMobileOpen(!mobileOpen) }}
            className="btn-ghost btn-icon text-muted-foreground"
          >
            <Menu size={18} />
          </button>

          {/* Breadcrumb / title */}
          <div className="flex-1 hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">AgroMaq</span>
            <ChevronRight size={14} className="text-muted-foreground/40" />
            <span className="font-semibold text-foreground">
              {NAV_SECTIONS.flatMap(s => s.items).find(i => i.path === location.pathname)?.label || 'Panel'}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Alerts */}
            <div className="relative" ref={alertsRef}>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="btn-ghost btn-icon relative"
              >
                <Bell size={18} />
                {alertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card" />
                )}
              </button>
              {showAlerts && (
                <div className="absolute right-0 top-full mt-2 z-50 animate-fade-up">
                  <AlertsPanel onClose={() => setShowAlerts(false)} />
                </div>
              )}
            </div>

            {/* Dark mode */}
            <button onClick={toggleDark} className="btn-ghost btn-icon">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center ml-1 cursor-default">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-6 animate-fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
