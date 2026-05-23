<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="error-page">
    <NResult status="404" title="页面不存在" description="访问的地址不对劲,回去看看吧。">
      <template #footer>
        <NButton type="primary" @click="router.replace({ name: 'dashboard' })">
          回首页
        </NButton>
      </template>
    </NResult>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}
</style>
