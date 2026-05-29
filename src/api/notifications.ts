import type { AdminNotificationPublicationListItem, ApiResponse, NotificationPublicationStatus, PageResult } from '@/types/admin'
import { alovaClient } from './client'

export interface ListNotificationPublicationsParams {
  page?: number
  pageSize?: number
  keyword?: string
  status?: NotificationPublicationStatus
}

export interface PublishSystemNotificationPayload {
  title: string
  content: string
  clientRequestId?: string
}

export const adminNotificationsApi = {
  list(params: ListNotificationPublicationsParams) {
    return alovaClient.Get<ApiResponse<PageResult<AdminNotificationPublicationListItem>>>('/admin/notifications', { params })
  },
  publishSystem(payload: PublishSystemNotificationPayload) {
    return alovaClient.Post<ApiResponse<AdminNotificationPublicationListItem>>('/admin/notifications/system', payload)
  },
}
