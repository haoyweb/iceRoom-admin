<script setup lang="ts">
import type { DropdownOption, MenuOption } from 'naive-ui'
import type { Component } from 'vue'
import {
  ChevronDownOutline,
  CloseOutline,
  ImageOutline,
  LogOutOutline,
  MenuOutline,
  NotificationsOutline,
  PersonOutline,
  RestaurantOutline,
  SettingsOutline,
  TrendingUpOutline,
} from '@vicons/ionicons5'
import { NAvatar, NBreadcrumb, NBreadcrumbItem, NButton, NDrawer, NDrawerContent, NDropdown, NIcon, NMenu, NTag } from 'naive-ui'
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScreen } from '@/composables/useScreen'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const appStore = useAppStore()
const { isMobile } = useScreen()

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// 菜单数据驱动。name 同时是 router.name 和 NMenu 的 key——一个数据源避免漂移。
const menuOptions: MenuOption[] = [
  { label: '数据看板', key: 'dashboard', icon: renderIcon(TrendingUpOutline) },
  { label: '用户管理', key: 'users', icon: renderIcon(PersonOutline) },
  { label: '菜谱管理', key: 'recipes', icon: renderIcon(RestaurantOutline) },
  { label: 'AI 识别监控', key: 'vision-jobs', icon: renderIcon(ImageOutline) },
  { label: '通知管理', key: 'notifications', icon: renderIcon(NotificationsOutline) },
  { label: '系统设置', key: 'settings', icon: renderIcon(SettingsOutline) },
]

const activeMenu = computed<string>(() => {
  const parent = route.meta.parent as string | undefined
  return parent ?? (route.name as string ?? 'dashboard')
})

const breadcrumb = computed<string[]>(() => {
  const parent = route.meta.parent as string | undefined
  const items: string[] = []
  if (parent) {
    const parentMenu = menuOptions.find(m => m.key === parent)
    if (parentMenu)
      items.push(String(parentMenu.label))
  }
  if (route.meta.title)
    items.push(String(route.meta.title))
  return items
})

const currentPageTitle = computed<string>(() => {
  return breadcrumb.value.at(-1) ?? '运营后台'
})

const mobileDrawerVisible = ref(false)

// 路由切换后自动关掉 mobile 抽屉，避免点击菜单后还要再点一次关闭。
watch(() => route.name, () => {
  mobileDrawerVisible.value = false
})

function onMenuSelect(key: string) {
  if (route.name !== key) {
    router.push({ name: key })
  }
}

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}

const userDropdownOptions: DropdownOption[] = [
  {
    label: '退出登录',
    key: 'logout',
    icon: renderIcon(LogOutOutline),
  },
]

function onUserDropdownSelect(key: string) {
  if (key === 'logout')
    onLogout()
}
</script>

<template>
  <div class="admin-layout" :class="{ 'admin-layout--mobile': isMobile }">
    <!-- 桌面 inline 侧栏 -->
    <aside
      v-if="!isMobile"
      class="admin-sidebar"
      :class="{ 'admin-sidebar--collapsed': appStore.sidebarCollapsed }"
    >
      <div class="admin-sidebar__brand">
        <span v-if="!appStore.sidebarCollapsed" class="admin-sidebar__brand-text">hy-iceRoom</span>
        <span v-else class="admin-sidebar__brand-mini">HY</span>
      </div>
      <NMenu
        :value="activeMenu"
        :collapsed="appStore.sidebarCollapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :indent="20"
        class="admin-sidebar__menu"
        @update:value="onMenuSelect"
      />
    </aside>

    <!-- 移动端 drawer 侧栏 -->
    <NDrawer
      v-if="isMobile"
      v-model:show="mobileDrawerVisible"
      :width="280"
      placement="left"
    >
      <NDrawerContent title="hy-iceRoom" closable>
        <NMenu
          :value="activeMenu"
          :options="menuOptions"
          :indent="20"
          @update:value="onMenuSelect"
        />
      </NDrawerContent>
    </NDrawer>

    <div class="admin-main">
      <header class="admin-topbar">
        <!-- mobile 汉堡按钮 -->
        <NButton
          v-if="isMobile"
          quaternary
          circle
          class="admin-topbar__menu-btn"
          @click="mobileDrawerVisible = true"
        >
          <template #icon>
            <NIcon :size="22">
              <MenuOutline />
            </NIcon>
          </template>
        </NButton>

        <!-- desktop 折叠按钮 -->
        <NButton
          v-else
          quaternary
          circle
          class="admin-topbar__collapse"
          @click="appStore.toggleSidebar()"
        >
          <template #icon>
            <NIcon :size="20">
              <component :is="appStore.sidebarCollapsed ? MenuOutline : CloseOutline" />
            </NIcon>
          </template>
        </NButton>

        <!-- mobile 顶栏只显示当前页面标题；desktop 显示面包屑 -->
        <div v-if="isMobile" class="admin-topbar__title">
          {{ currentPageTitle }}
        </div>
        <NBreadcrumb v-else class="admin-topbar__breadcrumb">
          <NBreadcrumbItem v-for="(item, idx) in breadcrumb" :key="idx">
            {{ item }}
          </NBreadcrumbItem>
        </NBreadcrumb>

        <NDropdown
          trigger="click"
          :options="userDropdownOptions"
          @select="onUserDropdownSelect"
        >
          <span class="admin-topbar__user">
            <NAvatar :size="32" :src="auth.userInfo?.avatar ?? undefined" round>
              {{ (auth.userInfo?.nickname || auth.userInfo?.username || '?').slice(0, 1) }}
            </NAvatar>
            <span v-if="!isMobile" class="admin-topbar__user-name">
              {{ auth.userInfo?.nickname || auth.userInfo?.username || '管理员' }}
              <NTag v-if="auth.isSuperAdmin" type="error" size="small" :bordered="false">
                super_admin
              </NTag>
              <NTag v-else type="warning" size="small" :bordered="false">
                admin
              </NTag>
            </span>
            <NIcon v-if="!isMobile" :size="14">
              <ChevronDownOutline />
            </NIcon>
          </span>
        </NDropdown>
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
  background: transparent !important;
  border-right: 0;
}

// 让 desktop 侧栏的 NMenu 看着像 dark 主题（NMenu 本身没暗色 prop，靠覆盖）
:deep(.admin-sidebar .n-menu .n-menu-item-content) {
  color: rgba(255, 255, 255, 0.72);

  &:hover {
    background: rgba(255, 255, 255, 0.06) !important;
  }
}

:deep(.admin-sidebar .n-menu .n-menu-item-content--selected) {
  background-color: rgba(224, 82, 45, 0.18) !important;
  color: #fff !important;

  &::before {
    background: rgba(224, 82, 45, 0.18) !important;
  }
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

.admin-topbar__breadcrumb {
  flex: 1;
  min-width: 0;
}

.admin-topbar__title {
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.admin-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.admin-layout--mobile {
  .admin-topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .admin-content {
    padding: 12px;
  }
}
</style>
