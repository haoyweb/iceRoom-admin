<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { AdminVisionJobListItem, AdminVisionStats, VisionRecognitionStatus } from '@/types/admin'
import dayjs from 'dayjs'
import {
  NButton,
  NCard,
  NDataTable,
  NDatePicker,
  NInput,
  NRadioButton,
  NRadioGroup,
  NSelect,
  NSpin,
  NTag,
} from 'naive-ui'
import { computed, h, onMounted, reactive, ref } from 'vue'
import { adminVisionJobsApi, type ListJobsParams } from '@/api/vision-jobs'
import MetricCard from '@/components/common/MetricCard.vue'
import { useScreen } from '@/composables/useScreen'
import { formatDateTime, formatNumber, formatUsd } from '@/utils/format'
import JobDrawer from './JobDrawer.vue'

type QuickRange = 'today' | '7d' | '30d' | 'custom'

const { isMobile } = useScreen()

const filter = reactive({
  page: 1,
  pageSize: 20,
  status: undefined as VisionRecognitionStatus | undefined,
  provider: '',
  userId: '',
  // Naive 的 daterange 返回 [number, number](毫秒时间戳),不再是字符串
  dateRange: null as [number, number] | null,
  quickRange: 'today' as QuickRange,
})

const list = ref<AdminVisionJobListItem[]>([])
const total = ref(0)
const loading = ref(false)
const stats = ref<AdminVisionStats | null>(null)
const statsLoading = ref(false)

const drawerVisible = ref(false)
const currentJobId = ref('')

const successRate = computed(() => {
  if (!stats.value || stats.value.totalJobs === 0)
    return '-'
  return `${((stats.value.successCount / stats.value.totalJobs) * 100).toFixed(1)}%`
})

function buildDateRange(): { dateFrom?: string, dateTo?: string } {
  if (filter.quickRange === 'today') {
    return { dateFrom: dayjs().startOf('day').toISOString(), dateTo: dayjs().endOf('day').toISOString() }
  }
  if (filter.quickRange === '7d') {
    return { dateFrom: dayjs().subtract(6, 'day').startOf('day').toISOString(), dateTo: dayjs().endOf('day').toISOString() }
  }
  if (filter.quickRange === '30d') {
    return { dateFrom: dayjs().subtract(29, 'day').startOf('day').toISOString(), dateTo: dayjs().endOf('day').toISOString() }
  }
  if (filter.dateRange && filter.dateRange.length === 2) {
    return {
      dateFrom: dayjs(filter.dateRange[0]).startOf('day').toISOString(),
      dateTo: dayjs(filter.dateRange[1]).endOf('day').toISOString(),
    }
  }
  return {}
}

async function loadList() {
  loading.value = true
  try {
    const range = buildDateRange()
    const params: ListJobsParams = {
      page: filter.page,
      pageSize: filter.pageSize,
      status: filter.status,
      provider: filter.provider.trim() || undefined,
      userId: filter.userId.trim() || undefined,
      ...range,
    }
    const res = await adminVisionJobsApi.list(params)
    list.value = res.data.list
    total.value = res.data.total
  }
  finally {
    loading.value = false
  }
}

async function loadStats() {
  statsLoading.value = true
  try {
    const range = buildDateRange()
    const res = await adminVisionJobsApi.stats(range)
    stats.value = res.data
  }
  finally {
    statsLoading.value = false
  }
}

function onSearch() {
  filter.page = 1
  void Promise.all([loadList(), loadStats()])
}

function onReset() {
  filter.status = undefined
  filter.provider = ''
  filter.userId = ''
  filter.dateRange = null
  filter.quickRange = 'today'
  filter.page = 1
  onSearch()
}

function onQuickRangeChange(value: QuickRange) {
  filter.quickRange = value
  if (value !== 'custom') {
    filter.dateRange = null
  }
  onSearch()
}

function onDateRangeChange(value: [number, number] | null) {
  filter.dateRange = value
  filter.quickRange = value && value.length === 2 ? 'custom' : 'today'
  onSearch()
}

function openDetail(row: AdminVisionJobListItem) {
  currentJobId.value = row.id
  drawerVisible.value = true
}

function statusTag(status: VisionRecognitionStatus): { text: string, type: 'info' | 'success' | 'error' } {
  if (status === 'success')
    return { text: '成功', type: 'success' }
  if (status === 'failed')
    return { text: '失败', type: 'error' }
  return { text: '识别中', type: 'info' }
}

const statusOptions = [
  { label: '识别中', value: 'pending' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
]

const columns = computed<DataTableColumns<AdminVisionJobListItem>>(() => [
  {
    title: '时间',
    key: 'createdAt',
    width: 160,
    render: row => formatDateTime(row.createdAt),
  },
  {
    title: '用户',
    key: 'user',
    minWidth: 140,
    render: row => h('div', { style: 'display: flex; flex-direction: column; line-height: 1.4;' }, [
      h('span', null, row.nickname || row.username),
      h('span', { style: 'color: #9ca3af; font-size: 12px;' }, `@${row.username}`),
    ]),
  },
  {
    title: 'Provider',
    key: 'provider',
    width: 100,
    render: row => row.provider || '—',
  },
  {
    title: '模型',
    key: 'model',
    minWidth: 140,
    render: row => row.model || '—',
  },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => {
      const t = statusTag(row.status)
      return h(NTag, { type: t.type, size: 'small', bordered: false }, { default: () => t.text })
    },
  },
  { title: '识别项', key: 'itemCount', width: 80, align: 'center' },
  {
    title: 'tokens',
    key: 'totalTokens',
    width: 100,
    align: 'center',
    render: row => formatNumber(row.totalTokens),
  },
  {
    title: '成本',
    key: 'costUSD',
    width: 100,
    align: 'center',
    render: row => formatUsd(row.costUSD, 4),
  },
  {
    title: '来源',
    key: 'source',
    width: 100,
    render: row => row.detectedSourceType || row.requestedSourceType,
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: row => h(NButton, {
      text: true,
      type: 'primary',
      size: 'small',
      onClick: (e: Event) => {
        e.stopPropagation()
        openDetail(row)
      },
    }, { default: () => '详情' }),
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

function onRowProps(row: AdminVisionJobListItem) {
  return {
    style: 'cursor: pointer;',
    onClick: () => openDetail(row),
  }
}

onMounted(() => {
  void loadList()
  void loadStats()
})
</script>

<template>
  <div class="vision-page">
    <NSpin :show="statsLoading">
      <div class="vision-page__metrics">
        <MetricCard variant="primary" label="时间段内任务数" :value="formatNumber(stats?.totalJobs)" />
        <MetricCard variant="success" label="成功率" :value="successRate" :hint="`成功 ${formatNumber(stats?.successCount)} · 失败 ${formatNumber(stats?.failedCount)}`" />
        <MetricCard label="累计 tokens" :value="formatNumber(stats?.totalTokens)" />
        <MetricCard variant="warning" label="累计成本" :value="formatUsd(stats?.totalCostUSD, 4)" />
      </div>
    </NSpin>

    <NCard :bordered="false">
      <div class="vision-page__filter">
        <NRadioGroup
          :value="filter.quickRange"
          size="small"
          @update:value="(v) => onQuickRangeChange(v as QuickRange)"
        >
          <NRadioButton value="today">
            今日
          </NRadioButton>
          <NRadioButton value="7d">
            近 7 天
          </NRadioButton>
          <NRadioButton value="30d">
            近 30 天
          </NRadioButton>
        </NRadioGroup>
        <NDatePicker
          :value="filter.dateRange"
          type="daterange"
          clearable
          style="width: 280px; max-width: 100%;"
          @update:value="onDateRangeChange"
        />
        <NSelect
          v-model:value="filter.status"
          placeholder="状态"
          clearable
          :options="statusOptions"
          style="width: 120px;"
          @update:value="onSearch"
        />
        <NInput
          v-model:value="filter.provider"
          placeholder="Provider(如 qwen)"
          clearable
          style="width: 160px;"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <NInput
          v-model:value="filter.userId"
          placeholder="用户 ID"
          clearable
          style="width: 200px;"
          @keyup.enter="onSearch"
          @clear="onSearch"
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
      <div v-else class="vision-page__cards">
        <div
          v-for="row in list"
          :key="row.id"
          class="job-card"
          @click="openDetail(row)"
        >
          <div class="job-card__head">
            <NTag :type="statusTag(row.status).type" size="small" :bordered="false">
              {{ statusTag(row.status).text }}
            </NTag>
            <span class="job-card__time">{{ formatDateTime(row.createdAt) }}</span>
          </div>
          <div class="job-card__user">
            {{ row.nickname || row.username }}
            <span class="job-card__user-id">@{{ row.username }}</span>
          </div>
          <div class="job-card__meta">
            <span>{{ row.provider || '—' }} · {{ row.model || '—' }}</span>
            <span class="job-card__dot">·</span>
            <span>{{ row.itemCount }} 项</span>
          </div>
          <div class="job-card__meta">
            <span>tokens {{ formatNumber(row.totalTokens) }}</span>
            <span class="job-card__dot">·</span>
            <span>{{ formatUsd(row.costUSD, 4) }}</span>
          </div>
        </div>
        <div v-if="!loading && list.length === 0" class="vision-page__empty">
          暂无识别任务
        </div>
        <div v-if="total > filter.pageSize" class="vision-page__mobile-pager">
          <NButton
            size="small"
            :disabled="filter.page === 1"
            @click="() => { filter.page--; loadList() }"
          >
            上一页
          </NButton>
          <span class="vision-page__page-indicator">
            {{ filter.page }} / {{ Math.ceil(total / filter.pageSize) }}
          </span>
          <NButton
            size="small"
            :disabled="filter.page * filter.pageSize >= total"
            @click="() => { filter.page++; loadList() }"
          >
            下一页
          </NButton>
        </div>
      </div>
    </NCard>

    <JobDrawer v-model:visible="drawerVisible" :job-id="currentJobId" />
  </div>
</template>

<style scoped lang="scss">
.vision-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vision-page__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.vision-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.vision-page__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.job-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: 10px;
  cursor: pointer;

  &:active {
    background: #fafafa;
  }
}

.job-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.job-card__time {
  color: #9ca3af;
  font-size: 12px;
  margin-left: auto;
}

.job-card__user {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.job-card__user-id {
  color: #9ca3af;
  font-size: 12px;
  font-weight: 400;
  margin-left: 6px;
}

.job-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.job-card__dot {
  color: #d1d5db;
}

.vision-page__empty {
  padding: 40px 0;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.vision-page__mobile-pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 14px 0 4px;
}

.vision-page__page-indicator {
  font-size: 13px;
  color: #6b7280;
}

@media (max-width: 767px) {
  .vision-page__metrics {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
</style>
