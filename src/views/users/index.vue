<script setup lang="ts">
import type { DataTableColumns, DropdownOption } from 'naive-ui'
import type { AdminUserListItem, UserRole, UserStatus } from '@/types/admin'
import { EllipsisHorizontalOutline } from '@vicons/ionicons5'
import {
  NAvatar,
  NButton,
  NCard,
  NDataTable,
  NDropdown,
  NIcon,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { adminUsersApi, type ListUsersParams } from '@/api/users'
import { useScreen } from '@/composables/useScreen'
import { usePromptDialog } from '@/composables/usePromptDialog'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/utils/format'
import UserDrawer from './UserDrawer.vue'

const auth = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const prompt = usePromptDialog()
const { isMobile } = useScreen()

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
    message.warning('不能封禁自己')
    return
  }
  if (isSuperAdmin(row.role)) {
    message.warning('super_admin 不能被封禁')
    return
  }
  const reason = await prompt({
    title: `确认要封禁 ${row.nickname || row.username} 吗?`,
    placeholder: '封禁原因(选填,1-200 字符)',
    positiveText: '封禁',
    validator: (val) => {
      if (val && val.length > 200)
        return '原因不能超过 200 字符'
      return true
    },
  })
  if (reason === null)
    return
  try {
    await adminUsersApi.ban(row.id, reason.trim())
    message.success('已封禁')
    await loadList()
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    message.error('封禁失败')
  }
}

function onUnban(row: AdminUserListItem) {
  dialog.warning({
    title: '解封用户',
    content: `确认要解封 ${row.nickname || row.username} 吗?`,
    positiveText: '解封',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await adminUsersApi.unban(row.id)
        message.success('已解封')
        await loadList()
      }
      catch (err: any) {
        if (err?.name === 'ApiError')
          return
        message.error('解封失败')
      }
    },
  })
}

async function onResetPassword(row: AdminUserListItem) {
  if (isSelf(row.id)) {
    message.warning('不能在这里重置自己的密码')
    return
  }
  if (isSuperAdmin(row.role)) {
    message.warning('super_admin 密码不能在此重置')
    return
  }
  const value = await prompt({
    title: `为 ${row.nickname || row.username} 设置新密码:`,
    inputType: 'password',
    placeholder: '6-20 位新密码',
    positiveText: '重置',
    validator: (val) => {
      if (!val)
        return '请输入新密码'
      if (val.length < 6 || val.length > 20)
        return '长度需在 6-20 位'
      return true
    },
  })
  if (value === null)
    return
  try {
    await adminUsersApi.resetPassword(row.id, value)
    message.success('密码已重置,请告知用户')
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    message.error('重置失败')
  }
}

async function onSetVisionDailyLimit(row: AdminUserListItem) {
  const value = await prompt({
    title: `设置 ${row.nickname || row.username} 的每日识别额度`,
    placeholder: `当前 ${row.visionDailyLimit} 次，输入 0-100`,
    positiveText: '保存',
    validator: (val) => {
      if (!val.trim())
        return '请输入额度'
      const limit = Number(val)
      if (!Number.isInteger(limit) || limit < 0 || limit > 100)
        return '额度需为 0-100 的整数'
      return true
    },
  })
  if (value === null)
    return
  try {
    await adminUsersApi.updateVisionDailyLimit(row.id, Number(value))
    message.success('识别额度已更新')
    await loadList()
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    message.error('额度更新失败')
  }
}

function roleTag(role: UserRole): { text: string, type: 'success' | 'warning' | 'error' | 'info' } {
  if (role === 'super_admin')
    return { text: 'super_admin', type: 'error' }
  if (role === 'admin')
    return { text: 'admin', type: 'warning' }
  return { text: 'user', type: 'info' }
}

function statusTag(status: UserStatus): { text: string, type: 'success' | 'error' } {
  return status === 'banned'
    ? { text: '已封禁', type: 'error' }
    : { text: '正常', type: 'success' }
}

const roleOptions = [
  { label: 'user', value: 'user' },
  { label: 'admin', value: 'admin' },
  { label: 'super_admin', value: 'super_admin' },
]

const statusOptions = [
  { label: '正常', value: 'active' },
  { label: '已封禁', value: 'banned' },
]

function buildRowMenuOptions(row: AdminUserListItem): DropdownOption[] {
  const disabled = isSelf(row.id) || isSuperAdmin(row.role)
  return [
    { label: '详情', key: 'detail' },
    {
      label: row.status === 'active' ? '封禁' : '解封',
      key: row.status === 'active' ? 'ban' : 'unban',
      disabled,
      props: { style: row.status === 'active' ? 'color: var(--n-error-color);' : 'color: var(--n-success-color);' },
    },
    { label: '设置识别额度', key: 'vision-limit' },
    { label: '重置密码', key: 'reset-password', disabled },
  ]
}

function onRowAction(key: string, row: AdminUserListItem) {
  if (key === 'detail')
    openDetail(row)
  else if (key === 'ban')
    void onBan(row)
  else if (key === 'unban')
    onUnban(row)
  else if (key === 'reset-password')
    void onResetPassword(row)
  else if (key === 'vision-limit')
    void onSetVisionDailyLimit(row)
}

const columns = computed<DataTableColumns<AdminUserListItem>>(() => [
  {
    title: '头像',
    key: 'avatar',
    width: 72,
    render: row => h(NAvatar, { size: 36, src: row.avatar ?? undefined, round: true }, {
      default: () => (row.nickname || row.username || '?').slice(0, 1),
    }),
  },
  { title: '用户名', key: 'username', minWidth: 140 },
  {
    title: '昵称',
    key: 'nickname',
    minWidth: 140,
    render: row => row.nickname || '—',
  },
  {
    title: '角色',
    key: 'role',
    width: 120,
    render: (row) => {
      const t = roleTag(row.role)
      return h(NTag, { type: t.type, size: 'small', bordered: false }, { default: () => t.text })
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => {
      const t = statusTag(row.status)
      return h(NTag, { type: t.type, size: 'small', bordered: false }, { default: () => t.text })
    },
  },
  { title: '冰箱', key: 'fridgeCount', width: 80, align: 'center' },
  { title: '识别次数', key: 'visionJobCount', width: 90, align: 'center' },
  { title: '每日额度', key: 'visionDailyLimit', width: 90, align: 'center' },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 160,
    render: row => formatDateTime(row.createdAt),
  },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right',
    render: (row) => {
      const disabled = isSelf(row.id) || isSuperAdmin(row.role)
      return h(NSpace, { size: 4 }, {
        default: () => [
          h(NButton, { text: true, type: 'primary', size: 'small', onClick: (e: Event) => { e.stopPropagation(); openDetail(row) } }, { default: () => '详情' }),
          row.status === 'active'
            ? h(NButton, { text: true, type: 'error', size: 'small', disabled, onClick: (e: Event) => { e.stopPropagation(); void onBan(row) } }, { default: () => '封禁' })
            : h(NButton, { text: true, type: 'success', size: 'small', disabled, onClick: (e: Event) => { e.stopPropagation(); onUnban(row) } }, { default: () => '解封' }),
          h(NButton, { text: true, size: 'small', onClick: (e: Event) => { e.stopPropagation(); void onSetVisionDailyLimit(row) } }, { default: () => '设置额度' }),
          h(NButton, { text: true, size: 'small', disabled, onClick: (e: Event) => { e.stopPropagation(); void onResetPassword(row) } }, { default: () => '重置密码' }),
        ],
      })
    },
  },
])

const pagination = computed(() => ({
  page: filter.page,
  pageSize: filter.pageSize,
  itemCount: total.value,
  pageSizes: [20, 50, 100],
  showSizePicker: true,
  onUpdatePage: (page: number) => {
    filter.page = page
    void loadList()
  },
  onUpdatePageSize: (pageSize: number) => {
    filter.pageSize = pageSize
    filter.page = 1
    void loadList()
  },
}))

function onRowProps(row: AdminUserListItem) {
  return {
    style: 'cursor: pointer;',
    onClick: () => openDetail(row),
  }
}

onMounted(loadList)
</script>

<template>
  <div class="users-page">
    <NCard :bordered="false">
      <div class="users-page__filter">
        <NInput
          v-model:value="filter.keyword"
          placeholder="搜索用户名 / 昵称"
          clearable
          style="width: 220px; max-width: 100%;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NSelect
          v-model:value="filter.role"
          placeholder="角色"
          clearable
          :options="roleOptions"
          style="width: 140px;"
          @update:value="onSearch"
        />
        <NSelect
          v-model:value="filter.status"
          placeholder="状态"
          clearable
          :options="statusOptions"
          style="width: 120px;"
          @update:value="onSearch"
        />
        <NButton type="primary" @click="onSearch">
          搜索
        </NButton>
        <NButton @click="onReset">
          重置
        </NButton>
      </div>

      <!-- Desktop 表格 -->
      <NDataTable
        v-if="!isMobile"
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-props="onRowProps"
        :scroll-x="1200"
        :bordered="false"
        striped
        remote
      />

      <!-- Mobile 卡片列表 -->
      <div v-else class="users-page__cards">
        <div
          v-for="row in list"
          :key="row.id"
          class="user-card"
          @click="openDetail(row)"
        >
          <NAvatar :size="44" :src="row.avatar ?? undefined" round>
            {{ (row.nickname || row.username || '?').slice(0, 1) }}
          </NAvatar>
          <div class="user-card__body">
            <div class="user-card__title-row">
              <span class="user-card__name">{{ row.nickname || row.username }}</span>
              <NTag :type="roleTag(row.role).type" size="small" :bordered="false">
                {{ roleTag(row.role).text }}
              </NTag>
              <NTag :type="statusTag(row.status).type" size="small" :bordered="false">
                {{ statusTag(row.status).text }}
              </NTag>
            </div>
            <div class="user-card__meta">
              <span>@{{ row.username }}</span>
              <span class="user-card__dot">·</span>
              <span>{{ formatDateTime(row.createdAt) }}</span>
            </div>
            <div class="user-card__counters">
              冰箱 {{ row.fridgeCount }} · 识别 {{ row.visionJobCount }} · 每日额度 {{ row.visionDailyLimit }}
            </div>
          </div>
          <NDropdown
            trigger="click"
            :options="buildRowMenuOptions(row)"
            @select="(key) => onRowAction(key, row)"
          >
            <NButton quaternary circle size="small" @click.stop>
              <template #icon>
                <NIcon :size="18"><EllipsisHorizontalOutline /></NIcon>
              </template>
            </NButton>
          </NDropdown>
        </div>
        <div v-if="!loading && list.length === 0" class="users-page__empty">
          暂无用户
        </div>
        <!-- mobile 分页 -->
        <div v-if="total > filter.pageSize!" class="users-page__mobile-pager">
          <NButton
            size="small"
            :disabled="filter.page === 1"
            @click="() => { filter.page!--; loadList() }"
          >
            上一页
          </NButton>
          <span class="users-page__page-indicator">
            {{ filter.page }} / {{ Math.ceil(total / (filter.pageSize ?? 20)) }}
          </span>
          <NButton
            size="small"
            :disabled="filter.page! * (filter.pageSize ?? 20) >= total"
            @click="() => { filter.page!++; loadList() }"
          >
            下一页
          </NButton>
        </div>
      </div>
    </NCard>

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

.users-page__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #fff;
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: 10px;
  cursor: pointer;
  transition: box-shadow 0.15s;

  &:active {
    background: #fafafa;
  }
}

.user-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-card__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.user-card__name {
  font-size: 15px;
  font-weight: 700;
  color: #1f2937;
}

.user-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.user-card__dot {
  color: #d1d5db;
}

.user-card__counters {
  font-size: 12px;
  color: #9ca3af;
}

.users-page__empty {
  padding: 40px 0;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.users-page__mobile-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 14px 0 4px;
}

.users-page__page-indicator {
  font-size: 13px;
  color: #6b7280;
}
</style>
