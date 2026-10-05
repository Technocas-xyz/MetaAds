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
      navGroupsClosed: {},      // sidebar section id -> true when folded
      toggleNavGroup: (id) =>
        set((s) => ({ navGroupsClosed: { ...s.navGroupsClosed, [id]: !s.navGroupsClosed[id] } })),
    }),
    {
      name: 'ui',
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, navGroupsClosed: s.navGroupsClosed }),
    }
  )
)

export default useUIStore
