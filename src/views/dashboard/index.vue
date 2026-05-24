<script setup lang="ts">
import type { AdminSettings, DashboardOverview, DashboardTrendPoint } from '@/types/admin'
import { NAlert, NCard, NRadioButton, NRadioGroup, NSpace, NSpin, NSwitch, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { adminDashboardApi, type TrendDays } from '@/api/dashboard'
import { adminSettingsApi } from '@/api/settings'
import LineChart from '@/components/charts/LineChart.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { formatNumber, formatUsd } from '@/utils/format'

const auth = useAuthStore()
const message = useMessage()
const overview = ref<DashboardOverview | null>(null)
const settings = ref<AdminSettings | null>(null)
const overviewLoading = ref(false)
const settingsLoading = ref(false)
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

async function loadSettings() {
  settingsLoading.value = true
  try {
    const res = await adminSettingsApi.get()
    settings.value = res.data
  }
  finally {
    settingsLoading.value = false
  }
}

async function onRegistrationToggle(enabled: boolean) {
  const previous = settings.value?.registration.enabled ?? true
  if (settings.value)
    settings.value.registration.enabled = enabled
  try {
    const res = await adminSettingsApi.updateRegistration(enabled)
    if (settings.value)
      settings.value.registration = res.data
    message.success(enabled ? 'C 端注册已开启' : 'C 端注册已关闭')
  }
  catch (err: any) {
    if (settings.value)
      settings.value.registration.enabled = previous
    if (err?.name !== 'ApiError')
      message.error('注册开关更新失败')
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

function onDaysChange(value: number) {
  days.value = value as TrendDays
  void loadTrends()
}

onMounted(() => {
  void loadOverview()
  void loadSettings()
  void loadTrends()
})
</script>

<template>
  <div class="dashboard">
    <NCard :bordered="false" class="dashboard__card">
      <template #header>
        <div class="dashboard__card-header">
          <span class="dashboard__card-title">系统设置</span>
          <NSpace align="center" :size="10">
            <span class="dashboard__setting-label">C 端注册</span>
            <NSwitch
              :value="settings?.registration.enabled ?? true"
              :loading="settingsLoading"
              :disabled="!auth.isSuperAdmin"
              @update:value="onRegistrationToggle"
            />
          </NSpace>
        </div>
      </template>
      <NAlert v-if="!auth.isSuperAdmin" type="info" :bordered="false">
        只有 super_admin 可以修改注册开关，admin 账号仅可查看当前状态。
      </NAlert>
    </NCard>

    <NSpin :show="overviewLoading">
      <div class="dashboard__metrics">
        <MetricCard variant="primary" label="累计用户" :value="formatNumber(overview?.userCount)" />
        <MetricCard variant="success" label="7 日活跃用户" :value="formatNumber(overview?.activeUserCount7d)" hint="入库或识别动作触发" />
        <MetricCard label="累计食材入库" :value="formatNumber(overview?.foodCount)" />
        <MetricCard label="累计识别任务" :value="formatNumber(overview?.visionJobCount)" />
        <MetricCard variant="warning" label="今日 AI 成本" :value="formatUsd(overview?.todayCostUSD)" />
        <MetricCard label="累计 AI 成本" :value="formatUsd(overview?.totalCostUSD)" />
      </div>
    </NSpin>

    <NCard :bordered="false" class="dashboard__card">
      <template #header>
        <div class="dashboard__card-header">
          <span class="dashboard__card-title">趋势分析</span>
          <NRadioGroup
            :value="days"
            size="small"
            @update:value="onDaysChange"
          >
            <NRadioButton :value="7">
              7 天
            </NRadioButton>
            <NRadioButton :value="30">
              30 天
            </NRadioButton>
            <NRadioButton :value="90">
              90 天
            </NRadioButton>
          </NRadioGroup>
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
    </NCard>
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.dashboard__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard__card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.dashboard__setting-label {
  color: #4b5563;
  font-size: 14px;
  font-weight: 600;
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

@media (max-width: 767px) {
  .dashboard__metrics {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}
</style>
