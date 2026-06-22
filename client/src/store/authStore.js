import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

export const useAuthStore = create(persist(
  (set) => ({
    user: null,
    token: null,
    login: async (email, password) => {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      set({ user: res.data.user, token: res.data.token })
      return res.data
    },
    logout: () => {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    },
  }),
  { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) }
))
