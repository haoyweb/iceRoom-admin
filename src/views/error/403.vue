<script setup lang="ts">
import { NButton, NResult } from 'naive-ui'
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
    <NResult status="403" title="没有权限访问运营后台" description="该账号未被授予 admin 权限,如需访问请联系管理员。">
      <template #footer>
        <NButton type="primary" @click="goHome">
          回首页
        </NButton>
        <NButton style="margin-left: 12px" @click="onLogout">
          换个账号登录
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
