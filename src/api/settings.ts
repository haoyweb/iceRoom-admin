import type { AdminSettings, ApiResponse } from '@/types/admin'
import { alovaClient } from './client'

export const adminSettingsApi = {
  get() {
    return alovaClient.Get<ApiResponse<AdminSettings>>('/admin/settings')
  },
  updateRegistration(enabled: boolean) {
    return alovaClient.Patch<ApiResponse<AdminSettings['registration']>>('/admin/settings/registration', { enabled })
  },
}
