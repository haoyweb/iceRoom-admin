<script setup lang="ts">
import { NAlert, NButton, NCard, NSkeleton, NSpace, NSwitch, NText, useMessage } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { adminSettingsApi } from '@/api/settings'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const registrationEnabled = ref(true)

async function loadSettings() {
  loading.value = true
  try {
    const res = await adminSettingsApi.get()
    registrationEnabled.value = res.data.registration.enabled
  }
  finally {
    loading.value = false
  }
}

async function saveRegistrationSetting() {
  saving.value = true
  try {
    const res = await adminSettingsApi.updateRegistration(registrationEnabled.value)
    registrationEnabled.value = res.data.enabled
    message.success('注册开关已保存')
  }
  catch (err: any) {
    if (err?.name !== 'ApiError')
      message.error('保存失败')
    await loadSettings()
  }
  finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="settings-page">
    <NCard title="系统设置" :bordered="false">
      <NSkeleton v-if="loading" text :repeat="3" />
      <template v-else>
        <NAlert v-if="!auth.isSuperAdmin" type="info" :bordered="false" class="settings-page__alert">
          只有 super_admin 可以修改系统设置，admin 账号仅可查看当前状态。
        </NAlert>
        <div class="setting-item">
        <div class="setting-item__content">
          <div class="setting-item__title">
            用户注册
          </div>
          <NText depth="3">
            关闭后，小程序新用户不能自行注册；已有用户仍可登录使用。
          </NText>
        </div>
        <NSpace align="center" :size="12">
          <NText :type="registrationEnabled ? 'success' : 'error'">
            {{ registrationEnabled ? '已开放' : '已关闭' }}
          </NText>
          <NSwitch v-model:value="registrationEnabled" :disabled="saving || !auth.isSuperAdmin" />
          <NButton type="primary" :loading="saving" :disabled="!auth.isSuperAdmin" @click="saveRegistrationSetting">
            保存
          </NButton>
        </NSpace>
        </div>
      </template>
    </NCard>
  </div>
</template>

<style scoped lang="scss">
.settings-page {
  width: 100%;
}

.settings-page__alert {
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 4px 0;
}

.setting-item__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-item__title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

@media (max-width: 768px) {
  .setting-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
