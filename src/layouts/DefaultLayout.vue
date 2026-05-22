<script setup lang="ts">
import {
  ArrowDown,
  Expand,
  Fold,
  KnifeFork,
  PictureFilled,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const appStore = useAppStore()

const iconMap = {
  TrendCharts,
  User,
  KnifeFork,
  PictureFilled,
}

interface MenuItem {
  name: string
  title: string
  icon: keyof typeof iconMap
}

const menus: MenuItem[] = [
  { name: 'dashboard', title: '数据看板', icon: 'TrendCharts' },
  { name: 'users', title: '用户管理', icon: 'User' },
  { name: 'recipes', title: '菜谱管理', icon: 'KnifeFork' },
  { name: 'vision-jobs', title: 'AI 识别监控', icon: 'PictureFilled' },
]

const activeMenu = computed(() => {
  const parent = route.meta.parent as string | undefined
  return parent ?? (route.name as string)
})

const breadcrumb = computed(() => {
  const parent = route.meta.parent as string | undefined
  const items: string[] = []
  if (parent) {
    const parentMenu = menus.find(m => m.name === parent)
    if (parentMenu)
      items.push(parentMenu.title)
  }
  if (route.meta.title)
    items.push(String(route.meta.title))
  return items
})

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}

function onMenuSelect(name: string) {
  if (route.name !== name) {
    router.push({ name })
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar" :class="{ 'admin-sidebar--collapsed': appStore.sidebarCollapsed }">
      <div class="admin-sidebar__brand">
        <span v-if="!appStore.sidebarCollapsed" class="admin-sidebar__brand-text">hy-iceRoom</span>
        <span v-else class="admin-sidebar__brand-mini">HY</span>
      </div>
      <ElMenu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        background-color="#2b2b35"
        text-color="#cfd1d7"
        active-text-color="#ffffff"
        class="admin-sidebar__menu"
        @select="onMenuSelect"
      >
        <ElMenuItem v-for="m in menus" :key="m.name" :index="m.name">
          <ElIcon><component :is="iconMap[m.icon]" /></ElIcon>
          <template #title>
            {{ m.title }}
          </template>
        </ElMenuItem>
      </ElMenu>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <ElButton link class="admin-topbar__collapse" @click="appStore.toggleSidebar()">
          <ElIcon :size="20">
            <component :is="appStore.sidebarCollapsed ? Expand : Fold" />
          </ElIcon>
        </ElButton>
        <ElBreadcrumb separator="/" class="admin-topbar__breadcrumb">
          <ElBreadcrumbItem v-for="(item, idx) in breadcrumb" :key="idx">
            {{ item }}
          </ElBreadcrumbItem>
        </ElBreadcrumb>
        <ElDropdown trigger="click" @command="(cmd: string) => cmd === 'logout' && onLogout()">
          <span class="admin-topbar__user">
            <ElAvatar :size="32" :src="auth.userInfo?.avatar ?? undefined">
              {{ (auth.userInfo?.nickname || auth.userInfo?.username || '?').slice(0, 1) }}
            </ElAvatar>
            <span class="admin-topbar__user-name">
              {{ auth.userInfo?.nickname || auth.userInfo?.username || '管理员' }}
              <ElTag v-if="auth.isSuperAdmin" type="danger" size="small" effect="plain" class="admin-topbar__role">
                super_admin
              </ElTag>
              <ElTag v-else type="warning" size="small" effect="plain" class="admin-topbar__role">
                admin
              </ElTag>
            </span>
            <ElIcon><ArrowDown /></ElIcon>
          </span>
          <template #dropdown>
            <ElDropdownMenu>
              <ElDropdownItem command="logout">
                退出登录
              </ElDropdownItem>
            </ElDropdownMenu>
          </template>
        </ElDropdown>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.admin-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.admin-sidebar {
  flex-shrink: 0;
  width: 220px;
  height: 100%;
  background: #2b2b35;
  color: #fff;
  transition: width 0.2s ease;
  overflow: hidden;

  &--collapsed {
    width: 64px;
  }
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 700;
  letter-spacing: 1px;
}

.admin-sidebar__brand-mini {
  font-size: 18px;
}

.admin-sidebar__menu {
  border-right: 0;
}

:deep(.admin-sidebar__menu .el-menu-item.is-active) {
  background-color: rgba(224, 82, 45, 0.18) !important;
  border-right: 3px solid var(--el-color-primary);
}

:deep(.admin-sidebar__menu .el-menu-item:hover) {
  background-color: rgba(255, 255, 255, 0.06) !important;
}

.admin-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.admin-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  height: 56px;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid rgba(229, 231, 235, 0.9);
}

.admin-topbar__collapse {
  color: #5d6680;
}

.admin-topbar__breadcrumb {
  flex: 1;
  min-width: 0;
}

.admin-topbar__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;

  &:hover {
    background: #f5f5f7;
  }
}

.admin-topbar__user-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.admin-topbar__role {
  margin: 0;
}

.admin-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}
</style>
