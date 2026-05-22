<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

function goHome() {
  if (auth.isLoggedIn && auth.isAdmin) {
    router.replace({ name: 'dashboard' })
  }
  else {
    router.replace({ name: 'login' })
  }
}

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="error-page">
    <ElResult icon="warning" title="403 没有权限访问运营后台" sub-title="该账号未被授予 admin 权限，如需访问请联系管理员。">
      <template #extra>
        <ElButton type="primary" @click="goHome">
          回首页
        </ElButton>
        <ElButton @click="onLogout">
          换个账号登录
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
