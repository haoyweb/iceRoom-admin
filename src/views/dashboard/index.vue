<script setup lang="ts">
import type { DashboardOverview, DashboardTrendPoint } from '@/types/admin'
import { onMounted, ref } from 'vue'
import { adminDashboardApi, type TrendDays } from '@/api/dashboard'
import LineChart from '@/components/charts/LineChart.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import { formatNumber, formatUsd } from '@/utils/format'

const overview = ref<DashboardOverview | null>(null)
const overviewLoading = ref(false)
const days = ref<TrendDays>(7)

const userTrend = ref<DashboardTrendPoint[]>([])
const foodTrend = ref<DashboardTrendPoint[]>([])
const visionTrend = ref<DashboardTrendPoint[]>([])
const trendLoading = ref(false)

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res = await adminDashboardApi.overview()
    overview.value = res.data
  }
  finally {
    overviewLoading.value = false
  }
}

async function loadTrends() {
  trendLoading.value = true
  try {
    const [user, food, vision] = await Promise.all([
      adminDashboardApi.userTrend(days.value),
      adminDashboardApi.foodTrend(days.value),
      adminDashboardApi.visionTrend(days.value),
    ])
    userTrend.value = user.data
    foodTrend.value = food.data
    visionTrend.value = vision.data
  }
  finally {
    trendLoading.value = false
  }
}

function onDaysChange(value: TrendDays) {
  days.value = value
  void loadTrends()
}

onMounted(() => {
  void loadOverview()
  void loadTrends()
})
</script>

<template>
  <div class="dashboard">
    <div v-loading="overviewLoading" class="dashboard__metrics">
      <MetricCard variant="primary" label="累计用户" :value="formatNumber(overview?.userCount)" />
      <MetricCard variant="success" label="7 日活跃用户" :value="formatNumber(overview?.activeUserCount7d)" hint="入库或识别动作触发" />
      <MetricCard label="累计食材入库" :value="formatNumber(overview?.foodCount)" />
      <MetricCard label="累计识别任务" :value="formatNumber(overview?.visionJobCount)" />
      <MetricCard variant="warning" label="今日 AI 成本" :value="formatUsd(overview?.todayCostUSD)" />
      <MetricCard label="累计 AI 成本" :value="formatUsd(overview?.totalCostUSD)" />
    </div>

    <ElCard shadow="never" class="dashboard__card">
      <template #header>
        <div class="dashboard__card-header">
          <span class="dashboard__card-title">趋势分析</span>
          <ElRadioGroup :model-value="days" size="small" @change="(v: string | number | boolean | undefined) => onDaysChange(v as TrendDays)">
            <ElRadioButton :value="7">
              7 天
            </ElRadioButton>
            <ElRadioButton :value="30">
              30 天
            </ElRadioButton>
            <ElRadioButton :value="90">
              90 天
            </ElRadioButton>
          </ElRadioGroup>
        </div>
      </template>

      <div class="dashboard__charts">
        <div class="dashboard__chart">
          <div class="dashboard__chart-title">
            用户增长与活跃
          </div>
          <LineChart
            :x-axis="userTrend.map(p => p.date)"
            :series="[
              { name: '新增用户', data: userTrend.map(p => p.newUsers ?? 0), color: '#e0522d' },
              { name: '活跃用户', data: userTrend.map(p => p.activeUsers ?? 0), color: '#3b82f6' },
            ]"
            :loading="trendLoading"
          />
        </div>

        <div class="dashboard__chart">
          <div class="dashboard__chart-title">
            食材入库量
          </div>
          <LineChart
            :x-axis="foodTrend.map(p => p.date)"
            :series="[
              { name: '入库食材数', data: foodTrend.map(p => p.addedFoods ?? 0), color: '#16a34a' },
            ]"
            :loading="trendLoading"
          />
        </div>

        <div class="dashboard__chart">
          <div class="dashboard__chart-title">
            识别量与 AI 成本
          </div>
          <LineChart
            :x-axis="visionTrend.map(p => p.date)"
            :series="[
              { name: '识别任务', data: visionTrend.map(p => p.jobs ?? 0), color: '#0ea5e9' },
              { name: '成功任务', data: visionTrend.map(p => p.successJobs ?? 0), color: '#16a34a' },
              { name: '成本 USD', data: visionTrend.map(p => Number(p.costUSD ?? 0)), color: '#e0522d', yAxisIndex: 1 },
            ]"
            :dual-y-axis="true"
            :loading="trendLoading"
          />
        </div>
      </div>
    </ElCard>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.dashboard__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard__card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.dashboard__charts {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.dashboard__chart-title {
  margin-bottom: 8px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 600;
}
</style>
