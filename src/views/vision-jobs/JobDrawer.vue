<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { AdminVisionJobDetail, VisionRecognitionStatus } from '@/types/admin'
import {
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NImage,
  NSpin,
  NTable,
  NTag,
} from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { adminVisionJobsApi } from '@/api/vision-jobs'
import { useScreen } from '@/composables/useScreen'
import { formatDateTime, formatNumber, formatUsd } from '@/utils/format'

interface Props {
  visible: boolean
  jobId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const detail = ref<AdminVisionJobDetail | null>(null)
const loading = ref(false)
const { isMobile } = useScreen()

const placement = computed(() => isMobile.value ? 'bottom' : 'right')
const drawerSize = computed(() => isMobile.value ? '90%' : 720)
const detailItems = computed(() => Array.isArray(detail.value?.items) ? detail.value.items : [])
const detailIgnored = computed(() => Array.isArray(detail.value?.ignored) ? detail.value.ignored : [])
const detailWarnings = computed(() => Array.isArray(detail.value?.warnings) ? detail.value.warnings : [])

async function load() {
  if (!props.jobId)
    return
  loading.value = true
  try {
    const res = await adminVisionJobsApi.getById(props.jobId)
    detail.value = res.data
  }
  finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val)
      void load()
  },
)

function statusTag(status: VisionRecognitionStatus | undefined): { text: string, type: 'info' | 'success' | 'error' } {
  if (status === 'success')
    return { text: '成功', type: 'success' }
  if (status === 'failed')
    return { text: '失败', type: 'error' }
  return { text: '识别中', type: 'info' }
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
    <NDrawerContent title="识别任务详情" closable>
      <NSpin :show="loading">
        <div class="job-drawer">
          <template v-if="detail">
            <NDescriptions :column="isMobile ? 1 : 2" bordered>
              <NDescriptionsItem label="时间" :span="isMobile ? 1 : 2">
                {{ formatDateTime(detail.createdAt) }}
              </NDescriptionsItem>
              <NDescriptionsItem label="用户">
                {{ detail.user.nickname || detail.user.username }} (@{{ detail.user.username }})
              </NDescriptionsItem>
              <NDescriptionsItem label="状态">
                <NTag :type="statusTag(detail.status).type" size="small" :bordered="false">
                  {{ statusTag(detail.status).text }}
                </NTag>
              </NDescriptionsItem>
              <NDescriptionsItem label="Provider">
                {{ detail.provider || '—' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="模型">
                {{ detail.model || '—' }}
              </NDescriptionsItem>
              <NDescriptionsItem label="来源">
                {{ detail.detectedSourceType || detail.requestedSourceType }}
              </NDescriptionsItem>
              <NDescriptionsItem label="识别项数">
                {{ detail.itemCount }}
              </NDescriptionsItem>
              <NDescriptionsItem label="input tokens">
                {{ formatNumber(detail.inputTokens) }}
              </NDescriptionsItem>
              <NDescriptionsItem label="output tokens">
                {{ formatNumber(detail.outputTokens) }}
              </NDescriptionsItem>
              <NDescriptionsItem label="total tokens">
                {{ formatNumber(detail.totalTokens) }}
              </NDescriptionsItem>
              <NDescriptionsItem label="成本">
                {{ formatUsd(detail.costUSD, 6) }}
              </NDescriptionsItem>
              <NDescriptionsItem v-if="detail.errorMessage" label="错误信息" :span="isMobile ? 1 : 2">
                <span class="job-drawer__error">{{ detail.errorMessage }}</span>
              </NDescriptionsItem>
            </NDescriptions>

            <NDivider title-placement="left">
              原图
            </NDivider>
            <div v-if="detail.imageUrl" class="job-drawer__image">
              <NImage
                :src="detail.imageUrl"
                object-fit="contain"
                class="job-drawer__image-el"
              />
              <div v-if="detail.imageExpiresAt" class="job-drawer__image-hint">
                图片保留至 {{ formatDateTime(detail.imageExpiresAt) }}
              </div>
            </div>
            <div v-else class="job-drawer__image-empty">
              图片已清理或未上传
            </div>

            <NDivider title-placement="left">
              识别项({{ detailItems.length }})
            </NDivider>
            <NTable v-if="detailItems.length" :bordered="false" size="small" striped>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>原文</th>
                  <th>分类</th>
                  <th>数量</th>
                  <th>保质期</th>
                  <th>置信度</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in detailItems" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.rawName || item.name }}</td>
                  <td>{{ item.category || '—' }}</td>
                  <td>
                    <span v-if="item.quantity !== undefined">{{ item.quantity }}{{ item.unit || '' }}</span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ item.freshnessDays ?? '—' }}</td>
                  <td>{{ item.confidence ? `${(item.confidence * 100).toFixed(0)}%` : '—' }}</td>
                </tr>
              </tbody>
            </NTable>
            <NEmpty v-else description="未识别到食材" :size="60" />

            <template v-if="detailIgnored.length">
              <NDivider title-placement="left">
                忽略项({{ detailIgnored.length }})
              </NDivider>
              <NTable :bordered="false" size="small" striped>
                <thead>
                  <tr>
                    <th>文本</th>
                    <th>原因</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in detailIgnored" :key="idx">
                    <td>{{ item.text }}</td>
                    <td>{{ item.reason }}</td>
                  </tr>
                </tbody>
              </NTable>
            </template>

            <template v-if="detailWarnings.length">
              <NDivider title-placement="left">
                警告
              </NDivider>
              <ul class="job-drawer__warnings">
                <li v-for="(w, idx) in detailWarnings" :key="idx">
                  {{ w }}
                </li>
              </ul>
            </template>
          </template>
          <NEmpty v-else-if="!loading" description="选择任务后展示详情" />
        </div>
      </NSpin>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped lang="scss">
.job-drawer {
  min-height: 200px;
}

.job-drawer__error {
  color: #b91c1c;
}

.job-drawer__image {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.job-drawer__image-el {
  max-width: 100%;
  max-height: 360px;
  border-radius: 8px;
  background: #f3f4f6;
}

.job-drawer__image-hint {
  color: #9ca3af;
  font-size: 12px;
}

.job-drawer__image-empty {
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
}

.job-drawer__warnings {
  margin: 0;
  padding-left: 20px;
  color: #b45309;
}
</style>
