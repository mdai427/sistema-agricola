import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './api'

// ─── TTL constants (match server Redis TTLs) ────────────────────────────────
const TTL = {
  CATALOG: 5 * 60_000,   // 5 min — categories, brands, warehouses
  DASHBOARD: 60_000,     // 1 min — KPIs
  STOCK: 30_000,         // 30s — inventory levels
  REPORTS: 2 * 60_000,   // 2 min — reports
  CUSTOMERS: 5 * 60_000, // 5 min — customers, suppliers
  ALERTS: 30_000,        // 30s — alerts badge
  LIVE: 0,               // always fresh — orders list, quotes list
}

// ─── Catalog (rarely changing) ───────────────────────────────────────────────
export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data), staleTime: TTL.CATALOG })

export const useBrands = () =>
  useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands').then(r => r.data), staleTime: TTL.CATALOG })

export const useWarehouses = () =>
  useQuery({ queryKey: ['warehouses'], queryFn: () => api.get('/warehouses').then(r => r.data), staleTime: TTL.CATALOG })

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard').then(r => r.data), staleTime: TTL.DASHBOARD, refetchInterval: TTL.DASHBOARD })

// ─── Alerts (polled) ─────────────────────────────────────────────────────────
export const useAlerts = () =>
  useQuery({ queryKey: ['alerts'], queryFn: () => api.get('/alerts').then(r => r.data), staleTime: TTL.ALERTS, refetchInterval: TTL.ALERTS })

// ─── Inventory ───────────────────────────────────────────────────────────────
export const useStocks = (params = {}) =>
  useQuery({ queryKey: ['stocks', params], queryFn: () => api.get('/inventory/stocks', { params }).then(r => r.data), staleTime: TTL.STOCK })

// ─── Products ────────────────────────────────────────────────────────────────
export const useProducts = (params = {}) =>
  useQuery({ queryKey: ['products', params], queryFn: () => api.get('/products', { params }).then(r => r.data), staleTime: TTL.CATALOG })

// ─── Customers ───────────────────────────────────────────────────────────────
export const useCustomers = (params = {}) =>
  useQuery({ queryKey: ['customers', params], queryFn: () => api.get('/customers', { params }).then(r => r.data), staleTime: TTL.CUSTOMERS })

// ─── Suppliers ───────────────────────────────────────────────────────────────
export const useSuppliers = () =>
  useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data), staleTime: TTL.CUSTOMERS })

// ─── Orders (live — always fresh) ────────────────────────────────────────────
export const useOrders = (params = {}) =>
  useQuery({ queryKey: ['orders', params], queryFn: () => api.get('/orders', { params }).then(r => r.data), staleTime: TTL.LIVE })

// ─── Quotes ──────────────────────────────────────────────────────────────────
export const useQuotes = (params = {}) =>
  useQuery({ queryKey: ['quotes', params], queryFn: () => api.get('/quotes', { params }).then(r => r.data), staleTime: TTL.LIVE })

// ─── Reports ─────────────────────────────────────────────────────────────────
export const useSalesReport = (params = {}) =>
  useQuery({ queryKey: ['reports', 'sales', params], queryFn: () => api.get('/reports/sales', { params }).then(r => r.data), staleTime: TTL.REPORTS })

export const useInventoryReport = () =>
  useQuery({ queryKey: ['reports', 'inventory'], queryFn: () => api.get('/reports/inventory').then(r => r.data), staleTime: TTL.REPORTS })

// ─── Mutation helper — invalidates related queries after write ────────────────
export const useInvalidate = () => {
  const qc = useQueryClient()
  return {
    afterOrder: () => qc.invalidateQueries({ queryKey: ['orders'] })
      .then(() => Promise.all([
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
        qc.invalidateQueries({ queryKey: ['alerts'] }),
        qc.invalidateQueries({ queryKey: ['reports'] }),
      ])),
    afterInventory: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['stocks'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
      qc.invalidateQueries({ queryKey: ['alerts'] }),
    ]),
    afterCatalog: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['categories'] }),
      qc.invalidateQueries({ queryKey: ['brands'] }),
      qc.invalidateQueries({ queryKey: ['products'] }),
    ]),
  }
}
