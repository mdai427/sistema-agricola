import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) { return twMerge(clsx(inputs)) }

export function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0)
}

export function formatDate(date) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(date))
}

export function formatDateTime(date) {
  if (!date) return '-'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))
}
