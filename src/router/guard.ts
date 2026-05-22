import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

/**
 * 路由守卫：
 *   - requiresAuth 且未登录 → /login（带 redirect 参数，登录后跳回）
 *   - 已登录访问 /login → /dashboard
 *   - 已登录但 role 不是 admin/super_admin → /403
 *
 * banned 状态由 API 401/403 兜底，前端守卫只看 role——
 * 避免 store 中的 status 被本地缓存撑得不准时锁死用户在 403 页（refresh 时后端会再判）。
 */
export function setupRouterGuard(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const baseTitle = import.meta.env.VITE_APP_TITLE || '运营后台'
    document.title = to.meta.title ? `${to.meta.title} · ${baseTitle}` : baseTitle

    const requiresAuth = to.matched.some(r => r.meta.requiresAuth !== false && r.meta.requiresAuth !== undefined)

    if (!auth.isLoggedIn) {
      if (requiresAuth) {
        return { name: 'login', query: { redirect: to.fullPath } }
      }
      return true
    }

    if (to.name === 'login') {
      return { name: 'dashboard' }
    }

    if (requiresAuth && !auth.isAdmin) {
      return { name: '403' }
    }

    return true
  })
}
