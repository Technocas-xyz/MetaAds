import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem('auth_token')
        set({ token: null, user: null })
      },
    }),
    {
      name: 'auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

export default useAuthStore
