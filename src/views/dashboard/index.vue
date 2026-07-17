<script setup lang="ts">
import type { AdminSettings, DashboardOverview, DashboardTrendPoint } from '@/types/admin'
import { NAlert, NButton, NCard, NEmpty, NRadioButton, NRadioGroup, NSpace, NSpin, NSwitch, useMessage } from 'naive-ui'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { adminDashboardApi, type TrendDays } from '@/api/dashboard'
import { adminSettingsApi } from '@/api/settings'
import MetricCard from '@/components/common/MetricCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { formatNumber, formatUsd } from '@/utils/format'

const auth = useAuthStore()
const message = useMessage()
const overview = ref<DashboardOverview | null>(null)
const settings = ref<AdminSettings | null>(null)
const overviewLoading = ref(false)
const settingsLoading = ref(false)
const overviewError = ref('')
const settingsError = ref('')
const days = ref<TrendDays>(7)

const userTrend = ref<DashboardTrendPoint[]>([])
const foodTrend = ref<DashboardTrendPoint[]>([])
const visionTrend = ref<DashboardTrendPoint[]>([])
const userTrendLoading = ref(false)
const foodTrendLoading = ref(false)
const visionTrendLoading = ref(false)
const userTrendError = ref('')
const foodTrendError = ref('')
const visionTrendError = ref('')

const LineChart = defineAsyncComponent(() => import('@/components/charts/LineChart.vue'))
const trendsLoading = computed(() => userTrendLoading.value || foodTrendLoading.value || visionTrendLoading.value)

async function loadOverview() {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    const res = await adminDashboardApi.overview()
    overview.value = res.data
  }
  catch (err: any) {
    overviewError.value = err?.message || '数据概览加载失败'
  }
  finally {
    overviewLoading.value = false
  }
}

async function loadSettings() {
  settingsLoading.value = true
  settingsError.value = ''
  try {
    const res = await adminSettingsApi.get()
    settings.value = res.data
  }
  catch (err: any) {
    settingsError.value = err?.code === 403 ? '当前账号无权查看注册设置' : (err?.message || '系统设置加载失败')
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

async function onVisionRecognitionToggle(enabled: boolean) {
  const previous = settings.value?.visionRecognition.enabled ?? true
  if (settings.value)
    settings.value.visionRecognition.enabled = enabled
  try {
    const res = await adminSettingsApi.updateVisionRecognition(enabled)
    if (settings.value)
      settings.value.visionRecognition = res.data
    message.success(enabled ? '拍照识别已开启' : '拍照识别已关闭')
  }
  catch (err: any) {
    if (settings.value)
      settings.value.visionRecognition.enabled = previous
    if (err?.name !== 'ApiError')
      message.error('拍照识别开关更新失败')
  }
}

async function loadUserTrend() {
  userTrendLoading.value = true
  userTrendError.value = ''
  try {
    const res = await adminDashboardApi.userTrend(days.value)
    userTrend.value = res.data
  }
  catch (err: any) {
    userTrendError.value = err?.message || '用户趋势加载失败'
  }
  finally {
    userTrendLoading.value = false
  }
}

async function loadFoodTrend() {
  foodTrendLoading.value = true
  foodTrendError.value = ''
  try {
    const res = await adminDashboardApi.foodTrend(days.value)
    foodTrend.value = res.data
  }
  catch (err: any) {
    foodTrendError.value = err?.message || '食材趋势加载失败'
  }
  finally {
    foodTrendLoading.value = false
  }
}

async function loadVisionTrend() {
  visionTrendLoading.value = true
  visionTrendError.value = ''
  try {
    const res = await adminDashboardApi.visionTrend(days.value)
    visionTrend.value = res.data
  }
  catch (err: any) {
    visionTrendError.value = err?.message || '识别趋势加载失败'
  }
  finally {
    visionTrendLoading.value = false
  }
}

async function loadTrends() {
  await Promise.allSettled([
    loadUserTrend(),
    loadFoodTrend(),
    loadVisionTrend(),
  ])
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
          <NSpace align="center" :size="14">
            <NSpace align="center" :size="8">
              <span class="dashboard__setting-label">C 端注册</span>
              <NSwitch
                :value="settings?.registration.enabled ?? true"
                :loading="settingsLoading"
                :disabled="!auth.isSuperAdmin"
                @update:value="onRegistrationToggle"
              />
            </NSpace>
            <NSpace align="center" :size="8">
              <span class="dashboard__setting-label">拍照识别</span>
              <NSwitch
                :value="settings?.visionRecognition.enabled ?? true"
                :loading="settingsLoading"
                :disabled="!auth.isSuperAdmin"
                @update:value="onVisionRecognitionToggle"
              />
            </NSpace>
          </NSpace>
        </div>
      </template>
      <NAlert v-if="settingsError" type="warning" :bordered="false">
        {{ settingsError }}
      </NAlert>
      <NAlert v-else-if="!auth.isSuperAdmin" type="info" :bordered="false">
        只有 super_admin 可以修改系统开关，admin 账号仅可查看当前状态。
      </NAlert>
    </NCard>

    <NSpin :show="overviewLoading">
      <NAlert v-if="overviewError" type="error" :bordered="false">
        <div class="dashboard__error-row">
          <span>{{ overviewError }}</span>
          <NButton size="small" secondary @click="loadOverview">
            重试
          </NButton>
        </div>
      </NAlert>
      <div v-else class="dashboard__metrics">
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
            :disabled="trendsLoading"
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
          <NAlert v-if="userTrendError" type="error" :bordered="false">
            <div class="dashboard__error-row">
              <span>{{ userTrendError }}</span>
              <NButton size="small" secondary @click="loadUserTrend">
                重试
              </NButton>
            </div>
          </NAlert>
          <NEmpty v-else-if="!userTrendLoading && userTrend.length === 0" description="暂无用户趋势数据" class="dashboard__empty" />
          <LineChart
            v-else
            :x-axis="userTrend.map(p => p.date)"
            :series="[
              { name: '新增用户', data: userTrend.map(p => p.newUsers ?? 0), color: '#e0522d' },
              { name: '活跃用户', data: userTrend.map(p => p.activeUsers ?? 0), color: '#3b82f6' },
            ]"
            :loading="userTrendLoading"
          />
        </div>

        <div class="dashboard__chart">
          <div class="dashboard__chart-title">
            食材入库量
          </div>
          <NAlert v-if="foodTrendError" type="error" :bordered="false">
            <div class="dashboard__error-row">
              <span>{{ foodTrendError }}</span>
              <NButton size="small" secondary @click="loadFoodTrend">
                重试
              </NButton>
            </div>
          </NAlert>
          <NEmpty v-else-if="!foodTrendLoading && foodTrend.length === 0" description="暂无食材趋势数据" class="dashboard__empty" />
          <LineChart
            v-else
            :x-axis="foodTrend.map(p => p.date)"
            :series="[
              { name: '入库食材数', data: foodTrend.map(p => p.addedFoods ?? 0), color: '#16a34a' },
            ]"
            :loading="foodTrendLoading"
          />
        </div>

        <div class="dashboard__chart">
          <div class="dashboard__chart-title">
            识别量与 AI 成本
          </div>
          <NAlert v-if="visionTrendError" type="error" :bordered="false">
            <div class="dashboard__error-row">
              <span>{{ visionTrendError }}</span>
              <NButton size="small" secondary @click="loadVisionTrend">
                重试
              </NButton>
            </div>
          </NAlert>
          <NEmpty v-else-if="!visionTrendLoading && visionTrend.length === 0" description="暂无识别趋势数据" class="dashboard__empty" />
          <LineChart
            v-else
            :x-axis="visionTrend.map(p => p.date)"
            :series="[
              { name: '识别任务', data: visionTrend.map(p => p.jobs ?? 0), color: '#0ea5e9' },
              { name: '成功任务', data: visionTrend.map(p => p.successJobs ?? 0), color: '#16a34a' },
              { name: '成本 USD', data: visionTrend.map(p => Number(p.costUSD ?? 0)), color: '#e0522d', yAxisIndex: 1 },
            ]"
            :dual-y-axis="true"
            :loading="visionTrendLoading"
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

.dashboard__error-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dashboard__empty {
  padding: 52px 0;
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
