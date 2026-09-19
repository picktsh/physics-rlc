import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * 板块级「全屏编辑」:把某个 DOM 区块切换为铺满视口的固定层(盖住页眉/侧栏等非必要元素),
 * 复用区块自身的内部布局(如元件库在左、画布在中、参数在右),避免受页面布局与菜单干扰。
 *
 * 只做纯 CSS 定位切换(由消费者把 isFullscreen 绑定到区块的 class),不移动 / 重建区块内元素,
 * 因此区块内的 WebGL / canvas 上下文天然保留。自带 Esc 退出与背景滚动锁定。
 */
export function useFullscreenSection() {
  const isFullscreen = ref(false)

  function enter() {
    if (isFullscreen.value) return
    isFullscreen.value = true
    // 全屏工作区期间锁页面滚动:切换 UnoCSS 的 overflow-hidden 类(比内联 style 更贴合样式分层,该工具类全站已在模板中生成)
    document.body.classList.add('overflow-hidden')
  }

  function exit() {
    if (!isFullscreen.value) return
    isFullscreen.value = false
    document.body.classList.remove('overflow-hidden')
  }

  function toggle() {
    if (isFullscreen.value) exit()
    else enter()
  }

  function onKeydown(e) {
    if (e.key === 'Escape') exit()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown)
    if (isFullscreen.value) document.body.classList.remove('overflow-hidden')
  })

  return { isFullscreen, enter, exit, toggle }
}
