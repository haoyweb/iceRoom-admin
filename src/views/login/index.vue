<script setup lang="ts">
import type { FormInst, FormRules } from 'naive-ui'
import { KeyOutline, PersonOutline } from '@vicons/ionicons5'
import { NButton, NForm, NFormItem, NIcon, NInput, useMessage } from 'naive-ui'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst>()
const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)

const rules: FormRules = {
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
  try {
    await formRef.value.validate()
  }
  catch {
    return
  }

  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    const redirect = (route.query.redirect as string) || '/dashboard'
    await router.replace(redirect)
    message.success(`欢迎回来，${auth.userInfo?.nickname || auth.userInfo?.username}`)
  }
  catch (err: any) {
    // ApiError 的业务 message 已在 client.ts 弹过 toast；其它本地校验失败这里补一道
    if (err?.name !== 'ApiError') {
      message.error(err?.message || '登录失败，请稍后重试')
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

      <NForm
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        :show-label="false"
        class="login-card__form"
        @keyup.enter="onSubmit"
      >
        <NFormItem path="username">
          <NInput v-model:value="form.username" placeholder="用户名" autocomplete="username">
            <template #prefix>
              <NIcon><PersonOutline /></NIcon>
            </template>
          </NInput>
        </NFormItem>
        <NFormItem path="password">
          <NInput
            v-model:value="form.password"
            type="password"
            placeholder="密码"
            show-password-on="click"
            autocomplete="current-password"
          >
            <template #prefix>
              <NIcon><KeyOutline /></NIcon>
            </template>
          </NInput>
        </NFormItem>
        <NFormItem :show-label="false" :show-feedback="false">
          <NButton type="primary" :loading="loading" class="login-card__submit" @click="onSubmit">
            登 录
          </NButton>
        </NFormItem>
      </NForm>

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
  padding: 20px;
  background:
    radial-gradient(circle at 12% 8%, rgba(224, 82, 45, 0.18) 0 18%, transparent 38%),
    linear-gradient(135deg, #2b2b35, #1a1a22);
}

.login-card {
  width: 100%;
  max-width: 420px;
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
    color: #e0522d;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 36px 24px 24px;
  }
}

@media (max-width: 340px) {
  .login-card {
    padding: 32px 20px 22px;
  }
}
</style>
