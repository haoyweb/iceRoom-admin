import type { GlobalThemeOverrides } from 'naive-ui'

// 主色对齐 C 端 #e0522d,浅/深色阶按 Element Plus 旧版色阶 1:1 对应。
// 其它视觉决策:
//   - 圆角从 Naive 默认 3px 上调到 8px:Naive 默认偏硬角,3px 在 14px 字号下视觉接近直角;
//     C 端「冰箱食材管家」整体走柔和圆润感(uniapp 端 8px 起),admin 对齐才不会让运营在
//     C 端 / B 端之间切换时感到风格断层
//   - 输入框 / 按钮 large size 高度从 40px 提到 44px:满足 iOS HIG 触摸目标 44pt,
//     mobile 上指头按得准;desktop 上看着更"踏实"
//   - 按钮字重提到 600:Naive 默认 400 在橘色背景上对比偏弱,加重读着更有"主按钮"感
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#e0522d',
    primaryColorHover: '#ea7e5e',
    primaryColorPressed: '#b8421f',
    primaryColorSuppl: '#e0522d',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    fontWeightStrong: '600',
  },
  Button: {
    heightLarge: '44px',
    heightMedium: '36px',
    fontWeight: '600',
    fontWeightStrong: '600',
    borderRadiusLarge: '10px',
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusTiny: '4px',
  },
  Input: {
    heightLarge: '44px',
    heightMedium: '36px',
    borderRadius: '8px',
  },
  Form: {
    blankHeightLarge: '44px',
    blankHeightMedium: '36px',
  },
  Card: {
    borderRadius: '12px',
  },
  Tag: {
    borderRadius: '4px',
  },
}
