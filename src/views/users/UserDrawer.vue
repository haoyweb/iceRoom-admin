<script setup lang="ts">
import type { AdminUserDetail, UserRole, UserStatus } from '@/types/admin'
import { ref, watch } from 'vue'
import { adminUsersApi } from '@/api/users'
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

const detail = ref<AdminUserDetail | null>(null)
const loading = ref(false)

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

function statusTag(status: UserStatus | undefined): { text: string, type: 'success' | 'danger' | 'info' } {
  if (!status)
    return { text: '—', type: 'info' }
  return status === 'banned'
    ? { text: '已封禁', type: 'danger' }
    : { text: '正常', type: 'success' }
}
</script>

<template>
  <ElDrawer
    :model-value="visible"
    title="用户详情"
    size="600px"
    direction="rtl"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <div v-loading="loading" class="user-drawer">
      <ElDescriptions v-if="detail" :column="2" border>
        <ElDescriptionsItem label="用户名">
          {{ detail.username }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="昵称">
          {{ detail.nickname || '—' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="角色">
          {{ roleText(detail.role) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="statusTag(detail.status).type" size="small">
            {{ statusTag(detail.status).text }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="冰箱数">
          {{ detail.fridgeCount }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="食材数">
          {{ detail.foodCount }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="识别次数">
          {{ detail.visionJobCount }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="注册时间">
          {{ formatDateTime(detail.createdAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="detail.status === 'banned'" label="封禁时间" :span="2">
          {{ formatDateTime(detail.bannedAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem v-if="detail.status === 'banned'" label="封禁原因" :span="2">
          {{ detail.banReason || '—' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <ElEmpty v-else-if="!loading" description="选择用户后展示详情" />
    </div>
  </ElDrawer>
</template>

<style scoped lang="scss">
.user-drawer {
  min-height: 200px;
}
</style>
