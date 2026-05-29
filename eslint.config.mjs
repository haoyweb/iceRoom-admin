import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  // 不开 formatters.css——antfu 会在非 TTY 环境下尝试交互式安装 prettier 依赖导致失败。
  // 内置 stylistic 已经覆盖了 SCSS 之外的所有代码风格；SCSS 的小段样式靠 IDE 兜底足够。
  stylistic: {
    indent: 2,
    quotes: 'single',
  },
  rules: {
    'no-console': 'off',
    'ts/no-explicit-any': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
  },
  ignores: ['dist', 'node_modules', '*.config.js', 'public', '.serena'],
})
