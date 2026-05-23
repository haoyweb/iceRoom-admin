import { useBreakpoints } from '@vueuse/core'

// 与 Element Plus 旧版断点对齐：mobile < 768 < tablet < 1024 ≤ desktop。
// 768 是平板纵向、640 之上的安全分界——再小一档（< 768）走 mobile 卡片视图。
// 1024 之上才认为是桌面（侧栏 inline、表格本体、详情 drawer 右滑）。
export function useScreen() {
  const bp = useBreakpoints({
    mobile: 0,
    tablet: 768,
    desktop: 1024,
  })
  return {
    isMobile: bp.smaller('tablet'),
    isTablet: bp.between('tablet', 'desktop'),
    isDesktop: bp.greaterOrEqual('desktop'),
  }
}
