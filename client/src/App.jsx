import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/Layout'
import { Toaster } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Quotes from './pages/Quotes'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Purchases from './pages/Purchases'
import Shipments from './pages/Shipments'
import Cash from './pages/Cash'
import Reports from './pages/Reports'
import Config from './pages/Config'
import Billing from './pages/Billing'
import Integrations from './pages/Integrations'
import Imports from './pages/Imports'

function Protected({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Protected><Dashboard /></Protected>} />
        <Route path="/productos" element={<Protected><Products /></Protected>} />
        <Route path="/inventario" element={<Protected><Inventory /></Protected>} />
        <Route path="/ventas" element={<Protected><Orders /></Protected>} />
        <Route path="/cotizaciones" element={<Protected><Quotes /></Protected>} />
        <Route path="/clientes" element={<Protected><Customers /></Protected>} />
        <Route path="/proveedores" element={<Protected><Suppliers /></Protected>} />
        <Route path="/compras" element={<Protected><Purchases /></Protected>} />
        <Route path="/importaciones" element={<Protected><Imports /></Protected>} />
        <Route path="/entregas" element={<Protected><Shipments /></Protected>} />
        <Route path="/caja" element={<Protected><Cash /></Protected>} />
        <Route path="/reportes" element={<Protected><Reports /></Protected>} />
        <Route path="/configuracion" element={<Protected><Config /></Protected>} />
        <Route path="/facturacion" element={<Protected><Billing /></Protected>} />
        <Route path="/integraciones" element={<Protected><Integrations /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}
