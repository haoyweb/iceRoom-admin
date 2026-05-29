import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { setupRouterGuard } from './guard'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false, layout: 'blank' },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: { name: 'dashboard' },
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'TrendCharts' },
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'recipes',
        name: 'recipes',
        component: () => import('@/views/recipes/index.vue'),
        meta: { title: '菜谱管理', icon: 'KnifeFork' },
      },
      {
        path: 'recipes/new',
        name: 'recipe-new',
        component: () => import('@/views/recipes/edit.vue'),
        meta: { title: '新建菜谱', hideInMenu: true, parent: 'recipes' },
      },
      {
        path: 'recipes/:id',
        name: 'recipe-edit',
        component: () => import('@/views/recipes/edit.vue'),
        meta: { title: '编辑菜谱', hideInMenu: true, parent: 'recipes' },
      },
      {
        path: 'vision-jobs',
        name: 'vision-jobs',
        component: () => import('@/views/vision-jobs/index.vue'),
        meta: { title: 'AI 识别监控', icon: 'PictureFilled' },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/views/notifications/index.vue'),
        meta: { title: '通知管理' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限', layout: 'blank' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', layout: 'blank' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

setupRouterGuard(router)

/**
 * 兜底:动态 import chunk 失败时自动 location.reload().
 *
 * 场景:线上重新部署后,老 tab 里的 index.html 还指向旧 chunk hash;
 * vite 拆出来的 hash 命名 chunk 在新 dist 里都换名了,旧 tab 一旦点路由触发
 * 懒加载,就会 "Failed to fetch dynamically imported module" 直接挂着,
 * 用户体验是"点菜单没反应".这里捕获到就 reload 强制拉最新 index.html.
 *
 * 防死循环:5s 内只允许 reload 一次,避免新版本仍然报错时反复刷.
 */
router.onError((error) => {
  const msg = String((error as Error)?.message ?? error ?? '')
  const isChunkLoadError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(msg)
  if (!isChunkLoadError)
    return

  const KEY = '__admin_chunk_reload_at'
  const now = Date.now()
  const last = Number(sessionStorage.getItem(KEY) || 0)
  if (now - last < 5000)
    return

  sessionStorage.setItem(KEY, String(now))
  // 用 location.reload 让浏览器拿带 no-store 的最新 index.html
  location.reload()
})

export default router
