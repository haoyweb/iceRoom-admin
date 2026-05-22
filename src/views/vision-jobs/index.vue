<script setup lang="ts">
import type { AdminVisionJobListItem, AdminVisionStats, VisionRecognitionStatus } from '@/types/admin'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { adminVisionJobsApi, type ListJobsParams } from '@/api/vision-jobs'
import MetricCard from '@/components/common/MetricCard.vue'
import { formatDateTime, formatNumber, formatUsd } from '@/utils/format'
import JobDrawer from './JobDrawer.vue'

type QuickRange = 'today' | '7d' | '30d' | 'custom'

const filter = reactive({
  page: 1,
  pageSize: 20,
  status: undefined as VisionRecognitionStatus | undefined,
  provider: '',
  userId: '',
  dateRange: [] as [string, string] | [],
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
    const start = dayjs().startOf('day').toISOString()
    const end = dayjs().endOf('day').toISOString()
    return { dateFrom: start, dateTo: end }
  }
  if (filter.quickRange === '7d') {
    return { dateFrom: dayjs().subtract(6, 'day').startOf('day').toISOString(), dateTo: dayjs().endOf('day').toISOString() }
  }
  if (filter.quickRange === '30d') {
    return { dateFrom: dayjs().subtract(29, 'day').startOf('day').toISOString(), dateTo: dayjs().endOf('day').toISOString() }
  }
  if (filter.dateRange.length === 2) {
    return { dateFrom: dayjs(filter.dateRange[0]).startOf('day').toISOString(), dateTo: dayjs(filter.dateRange[1]).endOf('day').toISOString() }
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
  filter.dateRange = []
  filter.quickRange = 'today'
  filter.page = 1
  onSearch()
}

function onQuickRangeChange(value: QuickRange) {
  filter.quickRange = value
  if (value !== 'custom') {
    filter.dateRange = []
  }
  onSearch()
}

function onDateRangeChange() {
  filter.quickRange = filter.dateRange.length === 2 ? 'custom' : 'today'
  onSearch()
}

function openDetail(row: AdminVisionJobListItem) {
  currentJobId.value = row.id
  drawerVisible.value = true
}

function statusTag(status: VisionRecognitionStatus): { text: string, type: 'info' | 'success' | 'danger' } {
  if (status === 'success')
    return { text: '成功', type: 'success' }
  if (status === 'failed')
    return { text: '失败', type: 'danger' }
  return { text: '识别中', type: 'info' }
}

onMounted(() => {
  void loadList()
  void loadStats()
})
</script>

<template>
  <div class="vision-page">
    <div v-loading="statsLoading" class="vision-page__metrics">
      <MetricCard variant="primary" label="时间段内任务数" :value="formatNumber(stats?.totalJobs)" />
      <MetricCard variant="success" label="成功率" :value="successRate" :hint="`成功 ${formatNumber(stats?.successCount)} · 失败 ${formatNumber(stats?.failedCount)}`" />
      <MetricCard label="累计 tokens" :value="formatNumber(stats?.totalTokens)" />
      <MetricCard variant="warning" label="累计成本" :value="formatUsd(stats?.totalCostUSD, 4)" />
    </div>

    <ElCard shadow="never">
      <div class="vision-page__filter">
        <ElRadioGroup :model-value="filter.quickRange" size="small" @change="(v: string | number | boolean | undefined) => onQuickRangeChange(v as QuickRange)">
          <ElRadioButton value="today">
            今日
          </ElRadioButton>
          <ElRadioButton value="7d">
            近 7 天
          </ElRadioButton>
          <ElRadioButton value="30d">
            近 30 天
          </ElRadioButton>
        </ElRadioGroup>
        <ElDatePicker
          v-model="filter.dateRange"
          type="daterange"
          range-separator="到"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 280px"
          @change="onDateRangeChange"
        />
        <ElSelect
          v-model="filter.status"
          placeholder="状态"
          clearable
          style="width: 120px"
          @change="onSearch"
        >
          <ElOption label="识别中" value="pending" />
          <ElOption label="成功" value="success" />
          <ElOption label="失败" value="failed" />
        </ElSelect>
        <ElInput
          v-model="filter.provider"
          placeholder="Provider（如 qwen）"
          clearable
          style="width: 160px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElInput
          v-model="filter.userId"
          placeholder="用户 ID"
          clearable
          style="width: 200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <ElButton type="primary" @click="onSearch">
          搜索
        </ElButton>
        <ElButton @click="onReset">
          重置
        </ElButton>
      </div>

      <ElTable v-loading="loading" :data="list" stripe row-key="id" @row-click="openDetail">
        <ElTableColumn label="时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="用户" min-width="140">
          <template #default="{ row }">
            <div class="vision-page__user">
              <span>{{ row.nickname || row.username }}</span>
              <span class="vision-page__user-id">@{{ row.username }}</span>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="Provider" width="100">
          <template #default="{ row }">
            {{ row.provider || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="模型" min-width="140">
          <template #default="{ row }">
            {{ row.model || '—' }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="statusTag(row.status).type" size="small">
              {{ statusTag(row.status).text }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="识别项" prop="itemCount" width="80" align="center" />
        <ElTableColumn label="tokens" width="100" align="center">
          <template #default="{ row }">
            {{ formatNumber(row.totalTokens) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="成本" width="100" align="center">
          <template #default="{ row }">
            {{ formatUsd(row.costUSD, 4) }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="来源" width="100">
          <template #default="{ row }">
            {{ row.detectedSourceType || row.requestedSourceType }}
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link size="small" type="primary" @click.stop="openDetail(row)">
              详情
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="vision-page__pagination">
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.vision-page__filter {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.vision-page__user {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.vision-page__user-id {
  color: #9ca3af;
  font-size: 12px;
}

.vision-page__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
