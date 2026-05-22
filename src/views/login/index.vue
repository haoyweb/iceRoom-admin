<script setup lang="ts">
import { Key, User as UserIcon } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const formRef = ref<FormInstance>()
const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)

const rules: FormRules<typeof form> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度 3-32 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度 6-32 位', trigger: 'blur' },
  ],
}

async function onSubmit() {
  if (!formRef.value)
    return
  const ok = await formRef.value.validate().catch(() => false)
  if (!ok)
    return

  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    ElMessage.success(`欢迎回来，${auth.userInfo?.nickname || auth.userInfo?.username}`)
    const redirect = (route.query.redirect as string) || '/dashboard'
    router.replace(redirect)
  }
  catch (err: any) {
    // ApiError 的业务 message 已在 client.ts 弹过 toast；其它本地校验失败这里补一道
    if (err?.name !== 'ApiError') {
      ElMessage.error(err?.message || '登录失败，请稍后重试')
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-card__brand">
        <div class="login-card__logo">
          HY
        </div>
        <div class="login-card__title">
          hy-iceRoom 运营后台
        </div>
        <div class="login-card__subtitle">
          冰箱食材管家 · 运营管理
        </div>
      </div>

      <ElForm
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        class="login-card__form"
        @keyup.enter="onSubmit"
      >
        <ElFormItem prop="username">
          <ElInput v-model="form.username" placeholder="用户名" :prefix-icon="UserIcon" autocomplete="username" />
        </ElFormItem>
        <ElFormItem prop="password">
          <ElInput
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Key"
            show-password
            autocomplete="current-password"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" class="login-card__submit" :loading="loading" @click="onSubmit">
            登 录
          </ElButton>
        </ElFormItem>
      </ElForm>

      <div class="login-card__tip">
        仅管理员账号可登录。普通用户请前往
        <a href="https://cook.stardustseek.com" target="_blank" rel="noreferrer">C 端</a>
        登录。
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at 12% 8%, rgba(224, 82, 45, 0.18) 0 18%, transparent 38%),
    linear-gradient(135deg, #2b2b35, #1a1a22);
}

.login-card {
  width: 420px;
  padding: 40px 36px 28px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.25);
}

.login-card__brand {
  margin-bottom: 28px;
  text-align: center;
}

.login-card__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #e0522d, #b8421f);
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 12px 24px rgba(224, 82, 45, 0.3);
}

.login-card__title {
  margin-bottom: 6px;
  font-size: 22px;
  font-weight: 800;
  color: #1f2937;
  letter-spacing: 1px;
}

.login-card__subtitle {
  font-size: 13px;
  color: #6b7280;
}

.login-card__form {
  margin-top: 8px;
}

.login-card__submit {
  width: 100%;
}

.login-card__tip {
  margin-top: 8px;
  color: #9ca3af;
  font-size: 12px;
  text-align: center;

  a {
    color: var(--el-color-primary);
  }
}
</style>
