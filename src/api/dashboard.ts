import type { ApiResponse, DashboardOverview, DashboardTrendPoint } from '@/types/admin'
import { alovaClient } from './client'

export type TrendDays = 7 | 30 | 90

export const adminDashboardApi = {
  overview() {
    return alovaClient.Get<ApiResponse<DashboardOverview>>('/admin/dashboard/overview')
  },
  userTrend(days: TrendDays) {
    return alovaClient.Get<ApiResponse<DashboardTrendPoint[]>>('/admin/dashboard/user-trend', { params: { days } })
  },
  foodTrend(days: TrendDays) {
    return alovaClient.Get<ApiResponse<DashboardTrendPoint[]>>('/admin/dashboard/food-trend', { params: { days } })
  },
  visionTrend(days: TrendDays) {
    return alovaClient.Get<ApiResponse<DashboardTrendPoint[]>>('/admin/dashboard/vision-trend', { params: { days } })
  },
}
