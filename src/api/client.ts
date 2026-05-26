import type { ApiResponse } from '@/types/admin'
import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import VueHook from 'alova/vue'
import { message } from '@/utils/discrete-api'

/**
 * Alova 实例 + 拦截器。
 *
 * 设计取自 C 端 `src/api/core/instance.ts`，但针对运营后台做了三处简化：
 *   1. 用 alova/fetch adapter（标准浏览器 fetch），不依赖 uni-app adapter
 *   2. 401 直接跳 /login——不做 refresh 重放（admin 不像 C 端那样追求"无感续期"，
 *      运营退出再登入成本很低，去掉 refresh 队列降低复杂度）
 *   3. 业务错误统一弹 message（discrete api），调用方按需 catch
 *
 * 401 处理：清 store → 跳 /login，避免被「过期 token 仍在用户态」卡死。
 * 这里通过动态 import + 全局 router 拿到跳转能力，避免顶层 import 形成循环依赖。
 */

let bailOutRunning = false
let refreshingPromise: Promise<void> | null = null
const replayedMethods = new WeakSet<object>()

async function bailOutToLogin(reason: string) {
  if (bailOutRunning)
    return
  bailOutRunning = true
  try {
    if (import.meta.env.DEV) {
      console.warn(`[Auth] 兜底跳登录: ${reason}`)
    }
    const { useAuthStore } = await import('@/stores/auth.store')
    const { default: router } = await import('@/router')
    useAuthStore().logout()
    message.warning('登录已过期，请重新登录')
    if (router.currentRoute.value.name !== 'login') {
      await router.replace({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    }
  }
  finally {
    bailOutRunning = false
  }
}

function isAuthEndpoint(url: string) {
  return url === '/auth/login' || url === '/auth/refresh' || url === '/auth/register'
}

async function refreshOnce() {
  if (!refreshingPromise) {
    const { useAuthStore } = await import('@/stores/auth.store')
    refreshingPromise = useAuthStore().refresh().finally(() => {
      refreshingPromise = null
    })
  }
  return refreshingPromise
}

export const alovaClient = createAlova({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  statesHook: VueHook,
  requestAdapter: adapterFetch(),
  timeout: 30000,
  cacheFor: null,

  async beforeRequest(method) {
    if (!isAuthEndpoint(method.url) && refreshingPromise) {
      await refreshingPromise.catch(() => {})
    }

    const { useAuthStore } = await import('@/stores/auth.store')
    const auth = useAuthStore()
    const token = auth.token
    if (token && !isAuthEndpoint(method.url)) {
      method.config.headers.Authorization = `Bearer ${token}`
    }
    if (['POST', 'PUT', 'PATCH'].includes(method.type)) {
      method.config.headers['Content-Type'] = method.config.headers['Content-Type'] ?? 'application/json'
    }
  },

  responded: {
    async onSuccess(response, method) {
      // fetch adapter 返回 Response 对象
      if (response.status === 401) {
        const json = await response.json().catch(() => ({})) as ApiResponse<null>
        const msg = json.message || '登录已过期'
        if (isAuthEndpoint(method.url)) {
          message.error(msg)
          throw new ApiError(msg, response.status, json)
        }
        if (replayedMethods.has(method)) {
          await bailOutToLogin('重放后仍 401')
          throw new ApiError(msg, response.status, json)
        }
        try {
          await refreshOnce()
          replayedMethods.add(method)
          return await method.send(true)
        }
        catch {
          await bailOutToLogin('refresh 失败')
          throw new ApiError(msg, response.status, json)
        }
      }

      if (response.status === 403) {
        const json = await response.json().catch(() => ({})) as ApiResponse<null>
        const msg = json.message || '没有权限执行该操作'
        message.error(msg)
        throw new ApiError(msg, response.status, json)
      }

      if (!response.ok) {
        const json = await response.json().catch(() => ({})) as ApiResponse<null>
        const msg = json.message || `请求失败 (${response.status})`
        message.error(msg)
        throw new ApiError(msg, response.status, json)
      }

      const json = await response.json() as ApiResponse<unknown>

      if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
        const msg = json.message || '请求失败'
        // 业务码 401xx 类（10101..10104 等）也按鉴权失败处理
        if (json.code >= 10100 && json.code < 10200) {
          if (!isAuthEndpoint(method.url) && !replayedMethods.has(method)) {
            try {
              await refreshOnce()
              replayedMethods.add(method)
              return await method.send(true)
            }
            catch {
              await bailOutToLogin(`业务码 ${json.code}`)
            }
          }
          else if (!isAuthEndpoint(method.url)) {
            await bailOutToLogin(`业务码 ${json.code}`)
          }
        }
        else {
          message.error(msg)
        }
        throw new ApiError(msg, json.code, json)
      }

      return json
    },
    onError(error) {
      if (error instanceof ApiError) {
        throw error
      }
      const msg = error instanceof Error ? error.message : '网络异常'
      message.error(msg)
      throw error
    },
  },
})

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly payload: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
