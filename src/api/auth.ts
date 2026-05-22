import type { ApiResponse, AuthLoginResponse, AuthUserPublic } from '@/types/admin'
import { alovaClient } from './client'

export interface LoginPayload {
  username: string
  password: string
}

export const authApi = {
  login(payload: LoginPayload) {
    return alovaClient.Post<ApiResponse<AuthLoginResponse>>('/auth/login', payload)
  },
  logout() {
    return alovaClient.Post<ApiResponse<null>>('/auth/logout')
  },
  refresh(refreshToken: string) {
    return alovaClient.Post<ApiResponse<{ token: string, refreshToken: string }>>('/auth/refresh', { refreshToken })
  },
  me() {
    return alovaClient.Get<ApiResponse<AuthUserPublic>>('/users/me')
  },
}
