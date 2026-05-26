import type { AuthUserPublic } from '@/types/admin'
import { defineStore } from 'pinia'
import { authApi, type LoginPayload } from '@/api/auth'

interface AuthState {
  token: string
  refreshToken: string
  userInfo: AuthUserPublic | null
}

/**
 * 运营后台登录态。
 *
 * 持久化前缀 `admin_` 把所有 key 与 C 端 `rsh_` 隔离——
 * 同源访问时 storage 不互相覆盖。
 *
 * getter `isAdmin`：role 既不能是 banned 也得是 admin/super_admin。
 * banned 兜底：login 时后端已拒，refresh 时也拒；但仍在前端二次判断，避免脏数据。
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: '',
    refreshToken: '',
    userInfo: null,
  }),

  getters: {
    isLoggedIn: state => Boolean(state.token && state.userInfo),
    isSuperAdmin: state => state.userInfo?.role === 'super_admin',
    isAdmin: state => state.userInfo?.role === 'admin' || state.userInfo?.role === 'super_admin',
    isActive: state => state.userInfo?.status === 'active',
  },

  actions: {
    async login(payload: LoginPayload) {
      const res = await authApi.login(payload)
      const { token, refreshToken, userInfo } = res.data
      // 后端会在 banned 时拒绝登录；这里 defensively 再判一道（避免上游遗漏）
      if (userInfo.status === 'banned') {
        throw new Error('账号已被封禁')
      }
      if (userInfo.role !== 'admin' && userInfo.role !== 'super_admin') {
        throw new Error('该账号无运营后台访问权限')
      }
      this.token = token
      this.refreshToken = refreshToken
      this.userInfo = userInfo
    },

    async fetchProfile() {
      const res = await authApi.me()
      this.userInfo = res.data
    },

    async refresh() {
      if (!this.refreshToken) {
        this.logout()
        throw new Error('登录已过期')
      }

      const res = await authApi.refresh(this.refreshToken)
      this.token = res.data.token
      this.refreshToken = res.data.refreshToken
      await this.fetchProfile()

      if (!this.isActive || !this.isAdmin) {
        this.logout()
        throw new Error('该账号无运营后台访问权限')
      }
    },

    logout() {
      this.token = ''
      this.refreshToken = ''
      this.userInfo = null
    },
  },

  persist: {
    key: 'admin_auth',
    paths: ['token', 'refreshToken', 'userInfo'],
  },
})
