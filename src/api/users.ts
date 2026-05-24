import type { AdminUserDetail, AdminUserListItem, ApiResponse, PageResult, UserRole, UserStatus } from '@/types/admin'
import { alovaClient } from './client'

export interface ListUsersParams {
  page?: number
  pageSize?: number
  keyword?: string
  role?: UserRole
  status?: UserStatus
}

export const adminUsersApi = {
  list(params: ListUsersParams) {
    return alovaClient.Get<ApiResponse<PageResult<AdminUserListItem>>>('/admin/users', { params })
  },
  getById(id: string) {
    return alovaClient.Get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`)
  },
  ban(id: string, reason: string) {
    return alovaClient.Post<ApiResponse<{ id: string, status: UserStatus, bannedAt: string, banReason: string | null }>>(
      `/admin/users/${id}/ban`,
      reason ? { reason } : {},
    )
  },
  unban(id: string) {
    return alovaClient.Post<ApiResponse<{ id: string, status: UserStatus }>>(
      `/admin/users/${id}/unban`,
    )
  },
  resetPassword(id: string, newPassword: string) {
    return alovaClient.Post<ApiResponse<{ id: string, success: true }>>(
      `/admin/users/${id}/reset-password`,
      { newPassword },
    )
  },
  updateVisionDailyLimit(id: string, visionDailyLimit: number) {
    return alovaClient.Patch<ApiResponse<{ id: string, visionDailyLimit: number }>>(
      `/admin/users/${id}/vision-daily-limit`,
      { visionDailyLimit },
    )
  },
}
