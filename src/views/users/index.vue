<script setup lang="ts">
import type { AdminUserListItem, UserRole, UserStatus } from '@/types/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { adminUsersApi, type ListUsersParams } from '@/api/users'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/utils/format'
import UserDrawer from './UserDrawer.vue'

const auth = useAuthStore()

const filter = reactive<ListUsersParams>({
  page: 1,
  pageSize: 20,
  keyword: '',
  role: undefined,
  status: undefined,
})

const list = ref<AdminUserListItem[]>([])
const total = ref(0)
const loading = ref(false)
const drawerVisible = ref(false)
const currentUserId = ref('')

async function loadList() {
  loading.value = true
  try {
    const res = await adminUsersApi.list({
      page: filter.page,
      pageSize: filter.pageSize,
      keyword: filter.keyword?.trim() || undefined,
      role: filter.role,
      status: filter.status,
    })
    list.value = res.data.list
    total.value = res.data.total
  }
  finally {
    loading.value = false
  }
}

function onSearch() {
  filter.page = 1
  void loadList()
}

function onReset() {
  filter.keyword = ''
  filter.role = undefined
  filter.status = undefined
  filter.page = 1
  void loadList()
}

function openDetail(row: AdminUserListItem) {
  currentUserId.value = row.id
  drawerVisible.value = true
}

function isSelf(id: string) {
  return auth.userInfo?.id === id
}

function isSuperAdmin(role: UserRole) {
  return role === 'super_admin'
}

async function onBan(row: AdminUserListItem) {
  if (isSelf(row.id)) {
    ElMessage.warning('不能封禁自己')
    return
  }
  if (isSuperAdmin(row.role)) {
    ElMessage.warning('super_admin 不能被封禁')
    return
  }
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `确认要封禁 ${row.nickname || row.username} 吗？`,
      '封禁用户',
      {
        confirmButtonText: '封禁',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        inputPlaceholder: '封禁原因（选填，1-200 字符）',
        inputValidator: (val) => {
          if (val && val.length > 200)
            return '原因不能超过 200 字符'
          return true
        },
      },
    )
    await adminUsersApi.ban(row.id, reason?.trim() ?? '')
    ElMessage.success('已封禁')
    await loadList()
  }
  catch (err: any) {
    if (err === 'cancel')
      return
    if (err?.name === 'ApiError')
      return
    ElMessage.error('封禁失败')
  }
}

async function onUnban(row: AdminUserListItem) {
  try {
    await ElMessageBox.confirm(
      `确认要解封 ${row.nickname || row.username} 吗？`,
      '解封用户',
      { confirmButtonText: '解封', cancelButtonText: '取消' },
    )
    await adminUsersApi.unban(row.id)
    ElMessage.success('已解封')
    await loadList()
  }
  catch (err: any) {
    if (err === 'cancel')
      return
    if (err?.name === 'ApiError')
      return
    ElMessage.error('解封失败')
  }
}

async function onResetPassword(row: AdminUserListItem) {
  if (isSelf(row.id)) {
    ElMessage.warning('不能在这里重置自己的密码')
    return
  }
  if (isSuperAdmin(row.role)) {
    ElMessage.warning('super_admin 密码不能在此重置')
    return
  }
  try {
    const { value } = await ElMessageBox.prompt(
      `为 ${row.nickname || row.username} 设置新密码：`,
      '重置密码',
      {
        confirmButtonText: '重置',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPlaceholder: '6-20 位新密码',
        inputValidator: (val) => {
          if (!val)
            return '请输入新密码'
          if (val.length < 6 || val.length > 20)
            return '长度需在 6-20 位'
          return true
        },
      },
    )
    if (!value)
      return
    await adminUsersApi.resetPassword(row.id, value)
    ElMessage.success('密码已重置，请告知用户')
  }
  catch (err: any) {
    if (err === 'cancel')
      return
    if (err?.name === 'ApiError')
      return
    ElMessage.error('重置失败')
  }
}

function roleTag(role: UserRole): { text: string, type: 'success' | 'warning' | 'danger' | 'info' } {
  if (role === 'super_admin')
    return { text: 'super_admin', type: 'danger' }
  if (role === 'admin')
    return { text: 'admin', type: 'warning' }
  return { text: 'user', type: 'info' }
}

function statusTag(status: UserStatus): { text: string, type: 'success' | 'danger' } {
  return status === 'banned'
    ? { text: '已封禁', type: 'danger' }
    : { text: '正常', type: 'success' }
}

onMounted(loadList)
</script>

<template>
  <div class="users-page">
    <ElCard shadow="never">
      <div class="users-page__filter">
        <ElInput
          v-model="filter.keyword"
          placeholder="搜索用户名 / 昵称"
          clearable
          style="width: 220px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElSelect
          v-model="filter.role"
          placeholder="角色"
          clearable
          style="width: 140px"
          @change="onSearch"
        >
          <ElOption label="user" value="user" />
          <ElOption label="admin" value="admin" />
          <ElOption label="super_admin" value="super_admin" />
        </ElSelect>
        <ElSelect
          v-model="filter.status"
          placeholder="状态"
          clearable
          style="width: 120px"
          @change="onSearch"
        >
          <ElOption label="正常" value="active" />
          <ElOption label="已封禁" value="banned" />
        </ElSelect>
        <ElButton type="primary" @click="onSearch">
          搜索
        </ElButton>
        <ElButton @click="onReset">
          重置
        </ElButton>
      </div>

      <ElTable
        v-loading="loading"
        :data="list"
        stripe
        row-key="id"
        @row-click="openDetail"
      >
        <ElTableColumn label="头像" width="72">
          <template #default="{ row }">
            <ElAvatar :size="36" :src="row.avatar ?? undefined">
              {{ (row.nickname || row.username || '?').slice(0, 1) }}
            </ElAvatar>
          </template>
        </ElTableColumn>
        <ElTableColumn label="用户名" prop="username" min-width="140" />
        <ElTableColumn label="昵称" min-width="140">
          <template #default="{ row }">
            {{ row.nickname || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="角色" width="120">
          <template #default="{ row }">
            <ElTag :type="roleTag(row.role).type" size="small">
              {{ roleTag(row.role).text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusTag(row.status).type" size="small">
              {{ statusTag(row.status).text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="冰箱" prop="fridgeCount" width="80" align="center" />
        <ElTableColumn label="识别次数" prop="visionJobCount" width="90" align="center" />
        <ElTableColumn label="注册时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton link size="small" type="primary" @click.stop="openDetail(row)">
              详情
            </ElButton>
            <ElButton
              v-if="row.status === 'active'"
              link
              size="small"
              type="danger"
              :disabled="isSelf(row.id) || isSuperAdmin(row.role)"
              @click.stop="onBan(row)"
            >
              封禁
            </ElButton>
            <ElButton
              v-else
              link
              size="small"
              type="success"
              :disabled="isSelf(row.id) || isSuperAdmin(row.role)"
              @click.stop="onUnban(row)"
            >
              解封
            </ElButton>
            <ElButton
              link
              size="small"
              :disabled="isSelf(row.id) || isSuperAdmin(row.role)"
              @click.stop="onResetPassword(row)"
            >
              重置密码
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="users-page__pagination">
        <ElPagination
          v-model:current-page="filter.page"
          v-model:page-size="filter.pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadList"
          @size-change="loadList"
        />
      </div>
    </ElCard>

    <UserDrawer v-model:visible="drawerVisible" :user-id="currentUserId" @changed="loadList" />
  </div>
</template>

<style scoped lang="scss">
.users-page {
  width: 100%;
}

.users-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.users-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
