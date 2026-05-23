import { h, ref } from 'vue'
import { NAlert, NInput, useDialog } from 'naive-ui'

interface PromptOptions {
  title: string
  inputType?: 'text' | 'password'
  placeholder?: string
  /**
   * 返回 true = 通过；返回字符串 = 校验失败时显示的错误信息。
   */
  validator?: (value: string) => true | string
  positiveText?: string
  negativeText?: string
}

/**
 * Naive UI 没有 ElMessageBox.prompt 这种"自带 input 收集"的弹窗。
 * 自己用 dialog.create + h(NInput) 拼一个,返回 Promise<string | null>:
 *   - 用户点确定 + validator 通过 → resolve(value)
 *   - 用户点取消或关闭 → resolve(null)
 *
 * 仅能在 setup 内调用(useDialog 依赖 provider 注入)——这是 Naive 全局 service 的硬约束。
 */
export function usePromptDialog() {
  const dialog = useDialog()

  return function prompt(opts: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const value = ref('')
      const errorMsg = ref('')
      let resolved = false

      const finish = (result: string | null) => {
        if (resolved)
          return
        resolved = true
        resolve(result)
      }

      const d = dialog.create({
        title: opts.title,
        content: () => h('div', { style: 'display: flex; flex-direction: column; gap: 8px;' }, [
          h(NInput, {
            type: opts.inputType ?? 'text',
            placeholder: opts.placeholder,
            value: value.value,
            'onUpdate:value': (v: string) => {
              value.value = v
              errorMsg.value = ''
            },
            showPasswordOn: opts.inputType === 'password' ? 'click' : undefined,
          }),
          errorMsg.value
            ? h(NAlert, { type: 'error', showIcon: false, style: 'padding: 6px 10px;' }, { default: () => errorMsg.value })
            : null,
        ]),
        positiveText: opts.positiveText ?? '确定',
        negativeText: opts.negativeText ?? '取消',
        onPositiveClick: () => {
          if (opts.validator) {
            const r = opts.validator(value.value)
            if (r !== true) {
              errorMsg.value = r
              // 返回 false 阻止 dialog 关闭
              return false
            }
          }
          finish(value.value)
        },
        onNegativeClick: () => {
          finish(null)
        },
        onClose: () => {
          finish(null)
        },
        onMaskClick: () => {
          finish(null)
        },
      })
      return d
    })
  }
}
