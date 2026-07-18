import type { User } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { User }

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateProfile: (email: string | null) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

export const useAuthStore = create<AuthState>(set => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password })
    const { user, token } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  register: async (username, password, email) => {
    const response = await api.post('/auth/register', { username, password, email })
    const { user, token } = response.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false })
      return
    }
    try {
      const response = await api.get<User>('/auth/me')
      const user = response.data
      localStorage.setItem('user', JSON.stringify(user))
      set({ user, token, isAuthenticated: true })
    }
    catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },

  updateProfile: async (email) => {
    const response = await api.put<User>('/auth/profile', { email })
    const user = response.data
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  changePassword: async (currentPassword, newPassword) => {
    await api.put('/auth/password', { currentPassword, newPassword })
  },
}))
