<script setup lang="ts">
import type { AdminVisionJobDetail, VisionRecognitionStatus } from '@/types/admin'
import { ref, watch } from 'vue'
import { adminVisionJobsApi } from '@/api/vision-jobs'
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

function statusTag(status: VisionRecognitionStatus | undefined): { text: string, type: 'info' | 'success' | 'danger' } {
  if (status === 'success')
    return { text: '成功', type: 'success' }
  if (status === 'failed')
    return { text: '失败', type: 'danger' }
  return { text: '识别中', type: 'info' }
}
</script>

<template>
  <ElDrawer
    :model-value="visible"
    title="识别任务详情"
    size="720px"
    direction="rtl"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <div v-loading="loading" class="job-drawer">
      <template v-if="detail">
        <ElDescriptions :column="2" border>
          <ElDescriptionsItem label="时间" :span="2">
            {{ formatDateTime(detail.createdAt) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="用户">
            {{ detail.user.nickname || detail.user.username }} (@{{ detail.user.username }})
          </ElDescriptionsItem>
          <ElDescriptionsItem label="状态">
            <ElTag :type="statusTag(detail.status).type" size="small">
              {{ statusTag(detail.status).text }}
            </ElTag>
          </ElDescriptionsItem>
          <ElDescriptionsItem label="Provider">
            {{ detail.provider || '—' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="模型">
            {{ detail.model || '—' }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="来源">
            {{ detail.detectedSourceType || detail.requestedSourceType }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="识别项数">
            {{ detail.itemCount }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="input tokens">
            {{ formatNumber(detail.inputTokens) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="output tokens">
            {{ formatNumber(detail.outputTokens) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="total tokens">
            {{ formatNumber(detail.totalTokens) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem label="成本">
            {{ formatUsd(detail.costUSD, 6) }}
          </ElDescriptionsItem>
          <ElDescriptionsItem v-if="detail.errorMessage" label="错误信息" :span="2">
            <span class="job-drawer__error">{{ detail.errorMessage }}</span>
          </ElDescriptionsItem>
        </ElDescriptions>

        <ElDivider content-position="left">
          原图
        </ElDivider>
        <div v-if="detail.imageUrl" class="job-drawer__image">
          <ElImage
            :src="detail.imageUrl"
            fit="contain"
            :preview-src-list="[detail.imageUrl]"
            hide-on-click-modal
            class="job-drawer__image-el"
          />
          <div v-if="detail.imageExpiresAt" class="job-drawer__image-hint">
            图片保留至 {{ formatDateTime(detail.imageExpiresAt) }}
          </div>
        </div>
        <div v-else class="job-drawer__image-empty">
          图片已清理或未上传
        </div>

        <ElDivider content-position="left">
          识别项（{{ detail.items.length }}）
        </ElDivider>
        <ElTable v-if="detail.items.length" :data="detail.items" size="small" stripe>
          <ElTableColumn label="名称" prop="name" width="120" />
          <ElTableColumn label="原文">
            <template #default="{ row }">
              {{ row.rawName || row.name }}
            </template>
          </ElTableColumn>
          <ElTableColumn label="分类" prop="category" width="100" />
          <ElTableColumn label="数量" width="100">
            <template #default="{ row }">
              <span v-if="row.quantity !== undefined">{{ row.quantity }}{{ row.unit || '' }}</span>
              <span v-else>—</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="保质期" prop="freshnessDays" width="80" align="center" />
          <ElTableColumn label="置信度" width="80" align="center">
            <template #default="{ row }">
              {{ row.confidence ? `${(row.confidence * 100).toFixed(0)}%` : '—' }}
            </template>
          </ElTableColumn>
        </ElTable>
        <ElEmpty v-else description="未识别到食材" :image-size="60" />

        <ElDivider v-if="detail.ignored.length" content-position="left">
          忽略项（{{ detail.ignored.length }}）
        </ElDivider>
        <ElTable v-if="detail.ignored.length" :data="detail.ignored" size="small" stripe>
          <ElTableColumn label="文本" prop="text" min-width="200" />
          <ElTableColumn label="原因" prop="reason" min-width="200" />
        </ElTable>

        <ElDivider v-if="detail.warnings.length" content-position="left">
          警告
        </ElDivider>
        <ul v-if="detail.warnings.length" class="job-drawer__warnings">
          <li v-for="(w, idx) in detail.warnings" :key="idx">
            {{ w }}
          </li>
        </ul>
      </template>
      <ElEmpty v-else-if="!loading" description="选择任务后展示详情" />
    </div>
  </ElDrawer>
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
