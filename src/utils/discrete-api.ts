import { createDiscreteApi } from 'naive-ui'
import { themeOverrides } from '@/styles/naive-theme'

// Naive UI 的 message/dialog/loadingBar 默认必须在 setup 上下文里通过 useMessage()/useDialog() 拿到。
// 但 api/client.ts 这种拦截器、router/guard.ts 这种守卫不是 setup 上下文，
// 用 createDiscreteApi 创建一组"游离实例"——内部自挂一个 NConfigProvider，独立 render 到 body。
//
// 关键：themeOverrides 必须传进去，否则游离实例会用 Naive 默认蓝色，与 provider 实例视觉不一致。
const { message, dialog, loadingBar } = createDiscreteApi(
  ['message', 'dialog', 'loadingBar'],
  { configProviderProps: { themeOverrides } },
)

export { dialog, loadingBar, message }
