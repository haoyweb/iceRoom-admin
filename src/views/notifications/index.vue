<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from 'naive-ui'
import type { AdminNotificationPublicationListItem, NotificationPublicationStatus } from '@/types/admin'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { adminNotificationsApi, type ListNotificationPublicationsParams } from '@/api/notifications'
import { useScreen } from '@/composables/useScreen'
import { useAuthStore } from '@/stores/auth.store'
import { formatDateTime } from '@/utils/format'

const auth = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const { isMobile } = useScreen()

const filter = reactive<ListNotificationPublicationsParams>({
  page: 1,
  pageSize: 20,
  keyword: '',
  status: undefined,
})

const list = ref<AdminNotificationPublicationListItem[]>([])
const total = ref(0)
const loading = ref(false)
const publishVisible = ref(false)
const publishing = ref(false)
const formRef = ref<FormInst | null>(null)
const form = reactive({
  title: '',
  content: '',
  clientRequestId: '',
})

const statusOptions: Array<{ label: string, value: NotificationPublicationStatus }> = [
  { label: '待发布', value: 'pending' },
  { label: '发布中', value: 'publishing' },
  { label: '已完成', value: 'completed' },
  { label: '部分失败', value: 'partial_failed' },
  { label: '失败', value: 'failed' },
]

const rules: FormRules = {
  title: [
    { required: true, message: '请输入通知标题', trigger: ['input', 'blur'] },
    { max: 80, message: '标题不能超过 80 字', trigger: ['input', 'blur'] },
  ],
  content: [
    { required: true, message: '请输入通知内容', trigger: ['input', 'blur'] },
    { max: 1000, message: '内容不能超过 1000 字', trigger: ['input', 'blur'] },
  ],
}

async function loadList() {
  loading.value = true
  try {
    const res = await adminNotificationsApi.list({
      page: filter.page,
      pageSize: filter.pageSize,
      keyword: filter.keyword?.trim() || undefined,
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
  filter.status = undefined
  filter.page = 1
  void loadList()
}

function openPublishModal() {
  form.title = ''
  form.content = ''
  form.clientRequestId = crypto.randomUUID?.() ?? `${Date.now()}`
  publishVisible.value = true
}

async function submitPublish() {
  await formRef.value?.validate()
  dialog.warning({
    title: '确认发布系统通知',
    content: '这条通知将发送给所有 active 用户，封禁用户不会收到。发布后本期不支持撤回，确认继续吗？',
    positiveText: '确认发布',
    negativeText: '取消',
    onPositiveClick: publishSystem,
  })
}

async function publishSystem() {
  publishing.value = true
  try {
    await adminNotificationsApi.publishSystem({
      title: form.title.trim(),
      content: form.content.trim(),
      clientRequestId: form.clientRequestId,
    })
    message.success('系统通知已发布')
    publishVisible.value = false
    await loadList()
  }
  catch (err: any) {
    if (err?.name === 'ApiError')
      return
    message.error('发布失败')
  }
  finally {
    publishing.value = false
  }
}

function statusText(status: NotificationPublicationStatus) {
  return {
    pending: '待发布',
    publishing: '发布中',
    completed: '已完成',
    partial_failed: '部分失败',
    failed: '失败',
  }[status]
}

function statusType(status: NotificationPublicationStatus): 'default' | 'info' | 'success' | 'warning' | 'error' {
  return {
    pending: 'default',
    publishing: 'info',
    completed: 'success',
    partial_failed: 'warning',
    failed: 'error',
  }[status] as 'default' | 'info' | 'success' | 'warning' | 'error'
}

function readRate(row: AdminNotificationPublicationListItem) {
  if (row.successCount === 0)
    return '0%'
  return `${Math.round((row.readCount / row.successCount) * 100)}%`
}

function previewContent(value: string) {
  return value.length > 56 ? `${value.slice(0, 56)}…` : value
}

const columns = computed<DataTableColumns<AdminNotificationPublicationListItem>>(() => [
  {
    title: '标题',
    key: 'title',
    minWidth: 180,
    render: row => h('div', { class: 'notification-title' }, [
      h('div', { class: 'notification-title__main' }, row.title),
      h('div', { class: 'notification-title__sub' }, previewContent(row.content)),
    ]),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: row => h(NTag, { type: statusType(row.status), size: 'small', bordered: false }, { default: () => statusText(row.status) }),
  },
  { title: '目标', key: 'targetCount', width: 80, align: 'center' },
  { title: '成功', key: 'successCount', width: 80, align: 'center' },
  { title: '失败', key: 'failedCount', width: 80, align: 'center' },
  {
    title: '已读',
    key: 'readCount',
    width: 120,
    align: 'center',
    render: row => `${row.readCount}/${row.successCount} (${readRate(row)})`,
  },
  {
    title: '操作人',
    key: 'operatorName',
    width: 120,
    render: row => row.operatorName || row.operatorId,
  },
  {
    title: '发布时间',
    key: 'createdAt',
    width: 170,
    render: row => formatDateTime(row.createdAt),
  },
  {
    title: '错误',
    key: 'errorMessage',
    minWidth: 160,
    render: row => row.errorMessage || '—',
  },
])

const currentPage = computed(() => filter.page ?? 1)
const currentPageSize = computed(() => filter.pageSize ?? 20)

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

function prevPage() {
  if (currentPage.value <= 1)
    return
  filter.page = currentPage.value - 1
  void loadList()
}

function nextPage() {
  if (currentPage.value * currentPageSize.value >= total.value)
    return
  filter.page = currentPage.value + 1
  void loadList()
}

onMounted(loadList)
</script>

<template>
  <div class="notifications-page">
    <NCard :bordered="false">
      <div class="notifications-page__filter">
        <NInput
          v-model:value="filter.keyword"
          placeholder="搜索标题 / 内容"
          clearable
          style="width: 260px; max-width: 100%;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NSelect
          v-model:value="filter.status"
          placeholder="发布状态"
          clearable
          :options="statusOptions"
          style="width: 150px;"
          @update:value="onSearch"
        />
        <NButton type="primary" @click="onSearch">
          搜索
        </NButton>
        <NButton @click="onReset">
          重置
        </NButton>
        <NButton v-if="auth.isSuperAdmin" type="success" class="notifications-page__publish" @click="openPublishModal">
          发布系统通知
        </NButton>
      </div>

      <NAlert v-if="!auth.isSuperAdmin" type="info" :bordered="false" class="notifications-page__alert">
        当前账号可查看通知发布记录；发布系统通知需要 super_admin 权限。
      </NAlert>

      <NDataTable
        v-if="!isMobile"
        remote
        striped
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="pagination"
        :row-key="row => row.id"
        :scroll-x="1120"
      />

      <div v-else class="notifications-mobile">
        <div v-if="loading" class="notifications-mobile__empty">
          加载中...
        </div>
        <template v-else-if="list.length">
          <div v-for="item in list" :key="item.id" class="notification-card">
            <div class="notification-card__header">
              <strong>{{ item.title }}</strong>
              <NTag :type="statusType(item.status)" size="small" :bordered="false">
                {{ statusText(item.status) }}
              </NTag>
            </div>
            <p class="notification-card__content">
              {{ item.content }}
            </p>
            <div class="notification-card__meta">
              <span>目标 {{ item.targetCount }}</span>
              <span>成功 {{ item.successCount }}</span>
              <span>已读 {{ item.readCount }}/{{ item.successCount }} ({{ readRate(item) }})</span>
            </div>
            <div class="notification-card__meta">
              <span>{{ item.operatorName || item.operatorId }}</span>
              <span>{{ formatDateTime(item.createdAt) }}</span>
            </div>
            <NAlert v-if="item.errorMessage" type="error" :bordered="false" class="notification-card__error">
              {{ item.errorMessage }}
            </NAlert>
          </div>
        </template>
        <div v-else class="notifications-mobile__empty">
          暂无通知发布记录
        </div>
        <div class="notifications-mobile__pager">
          <NButton :disabled="currentPage <= 1" @click="prevPage">
            上一页
          </NButton>
          <span>第 {{ currentPage }} 页 / 共 {{ total }} 条</span>
          <NButton :disabled="currentPage * currentPageSize >= total" @click="nextPage">
            下一页
          </NButton>
        </div>
      </div>
    </NCard>

    <NModal v-model:show="publishVisible" preset="card" title="发布系统通知" class="publish-modal" :mask-closable="!publishing">
      <NAlert type="warning" :bordered="false" class="publish-modal__alert">
        系统通知会发送给所有 active 用户，封禁用户不会收到。本期不支持撤回，请确认文案无误后再发布。
      </NAlert>
      <NForm ref="formRef" :model="form" :rules="rules" label-placement="top">
        <NFormItem label="标题" path="title">
          <NInput v-model:value="form.title" maxlength="80" show-count placeholder="请输入通知标题" />
        </NFormItem>
        <NFormItem label="内容" path="content">
          <NInput
            v-model:value="form.content"
            type="textarea"
            maxlength="1000"
            show-count
            placeholder="请输入通知内容"
            :autosize="{ minRows: 5, maxRows: 10 }"
          />
        </NFormItem>
      </NForm>
      <template #footer>
        <NSpace justify="end">
          <NButton :disabled="publishing" @click="publishVisible = false">
            取消
          </NButton>
          <NButton type="primary" :loading="publishing" @click="submitPublish">
            发布
          </NButton>
        </NSpace>
      </template>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.notifications-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.notifications-page__publish {
  margin-left: auto;
}

.notifications-page__alert {
  margin-bottom: 16px;
}

:deep(.notification-title__main) {
  font-weight: 600;
  color: #111827;
}

:deep(.notification-title__sub) {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.notifications-mobile {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-card {
  padding: 14px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: #fff;
}

.notification-card__header,
.notification-card__meta {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.notification-card__content {
  margin: 10px 0;
  color: #4b5563;
  line-height: 1.6;
  white-space: pre-wrap;
}

.notification-card__meta {
  justify-content: flex-start;
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}

.notification-card__error {
  margin-top: 10px;
}

.notifications-mobile__empty {
  padding: 32px 0;
  color: #6b7280;
  text-align: center;
}

.notifications-mobile__pager {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
}

.publish-modal {
  width: min(640px, calc(100vw - 32px));
}

.publish-modal__alert {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .notifications-page__filter {
    align-items: stretch;
  }

  .notifications-page__filter > * {
    width: 100% !important;
  }

  .notifications-page__publish {
    margin-left: 0;
  }
}
</style>
