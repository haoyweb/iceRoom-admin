import { defineStore } from 'pinia'

interface AppState {
  sidebarCollapsed: boolean
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },
  },

  persist: {
    key: 'admin_app',
    paths: ['sidebarCollapsed'],
  },
})
