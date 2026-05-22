<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="error-page">
    <ElResult icon="info" title="404 页面不存在" sub-title="访问的地址不对劲，回去看看吧。">
      <template #extra>
        <ElButton type="primary" @click="router.replace({ name: 'dashboard' })">
          回首页
        </ElButton>
      </template>
    </ElResult>
  </div>
</template>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
