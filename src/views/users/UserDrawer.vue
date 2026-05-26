<script setup lang="ts">
import type { AdminUserDetail, UserRole, UserStatus } from '@/types/admin'
import { NAlert, NDescriptions, NDescriptionsItem, NDrawer, NDrawerContent, NEmpty, NSpin, NTag } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { adminUsersApi } from '@/api/users'
import { useScreen } from '@/composables/useScreen'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/utils/format'

interface Props {
  visible: boolean
  userId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'changed': []
}>()

const auth = useAuthStore()
const detail = ref<AdminUserDetail | null>(null)
const loading = ref(false)
const { isMobile } = useScreen()

// mobile 抽屉从底部上滑;desktop 从右侧滑入
const placement = computed(() => isMobile.value ? 'bottom' : 'right')
const drawerSize = computed(() => isMobile.value ? '90%' : 600)

async function load() {
  if (!props.userId)
    return
  loading.value = true
  try {
    const res = await adminUsersApi.getById(props.userId)
    detail.value = res.data
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val && props.userId) {
      void load()
    }
  },
)

function roleText(role: UserRole | undefined) {
  if (!role)
    return '—'
  return role
}

function statusTag(status: UserStatus | undefined): { text: string, type: 'success' | 'error' | 'info' } {
  if (!status)
    return { text: '—', type: 'info' }
  return status === 'banned'
    ? { text: '已封禁', type: 'error' }
    : { text: '正常', type: 'success' }
}
</script>

<template>
  <NDrawer
    :show="visible"
    :placement="placement"
    :width="drawerSize"
    :height="drawerSize"
    @update:show="(v: boolean) => emit('update:visible', v)"
  >
    <NDrawerContent title="用户详情" closable>
      <NSpin :show="loading">
        <div class="user-drawer">
          <NAlert v-if="detail && !auth.isSuperAdmin" type="info" :bordered="false" class="user-drawer__permission-tip">
            当前账号可查看用户详情；每日识别额度、密码等敏感信息调整需要 super_admin 权限。
          </NAlert>

          <NDescriptions v-if="detail" :column="isMobile ? 1 : 2" bordered>
            <NDescriptionsItem label="用户名">
              {{ detail.username }}
            </NDescriptionsItem>
            <NDescriptionsItem label="昵称">
              {{ detail.nickname || '—' }}
            </NDescriptionsItem>
            <NDescriptionsItem label="角色">
              {{ roleText(detail.role) }}
            </NDescriptionsItem>
            <NDescriptionsItem label="状态">
              <NTag :type="statusTag(detail.status).type" size="small" :bordered="false">
                {{ statusTag(detail.status).text }}
              </NTag>
            </NDescriptionsItem>
            <NDescriptionsItem label="冰箱数">
              {{ detail.fridgeCount }}
            </NDescriptionsItem>
            <NDescriptionsItem label="食材数">
              {{ detail.foodCount }}
            </NDescriptionsItem>
            <NDescriptionsItem label="识别次数">
              {{ detail.visionJobCount }}
            </NDescriptionsItem>
            <NDescriptionsItem label="每日识别额度">
              {{ detail.visionDailyLimit }} 次
            </NDescriptionsItem>
            <NDescriptionsItem label="注册时间">
              {{ formatDateTime(detail.createdAt) }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="detail.status === 'banned'" label="封禁时间" :span="2">
              {{ formatDateTime(detail.bannedAt) }}
            </NDescriptionsItem>
            <NDescriptionsItem v-if="detail.status === 'banned'" label="封禁原因" :span="2">
              {{ detail.banReason || '—' }}
            </NDescriptionsItem>
          </NDescriptions>
          <NEmpty v-else-if="!loading" description="选择用户后展示详情" />
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped lang="scss">
.user-drawer {
  min-height: 200px;
}

.user-drawer__permission-tip {
  margin-bottom: 16px;
}
</style>
