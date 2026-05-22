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

export default router
