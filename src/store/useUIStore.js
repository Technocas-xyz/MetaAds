import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: false,       // mobile slide-over
      sidebarCollapsed: false,  // desktop icon-only mode
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      closeSidebar: () => set({ sidebarOpen: false }),
    }),
    {
      name: 'ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
)

export default useUIStore
