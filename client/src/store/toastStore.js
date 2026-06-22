import { create } from 'zustand'

export const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now()
    set(s => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = {
  success: (msg) => useToastStore.getState().addToast({ type: 'success', message: msg }),
  error: (msg) => useToastStore.getState().addToast({ type: 'error', message: msg }),
  info: (msg) => useToastStore.getState().addToast({ type: 'info', message: msg }),
}
