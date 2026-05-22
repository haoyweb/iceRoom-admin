import type { AdminVisionJobDetail, AdminVisionJobListItem, AdminVisionStats, ApiResponse, PageResult, VisionRecognitionStatus } from '@/types/admin'
import { alovaClient } from './client'

export interface ListJobsParams {
  page?: number
  pageSize?: number
  status?: VisionRecognitionStatus
  provider?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
}

export interface JobsStatsParams {
  dateFrom?: string
  dateTo?: string
}

export const adminVisionJobsApi = {
  list(params: ListJobsParams) {
    return alovaClient.Get<ApiResponse<PageResult<AdminVisionJobListItem>>>('/admin/vision-jobs', { params })
  },
  getById(id: string) {
    return alovaClient.Get<ApiResponse<AdminVisionJobDetail>>(`/admin/vision-jobs/${id}`)
  },
  stats(params: JobsStatsParams) {
    return alovaClient.Get<ApiResponse<AdminVisionStats>>('/admin/vision-jobs/stats', { params })
  },
}
