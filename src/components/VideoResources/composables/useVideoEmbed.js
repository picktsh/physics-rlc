import { computed } from 'vue'
import { useElementVisibility, useElementSize } from '@vueuse/core'

// B 站官方嵌入式播放器:高清 + 默认关弹幕 + 不自动播放
export const bilibiliEmbedUrl = (bv) =>
  `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0`

// 抖音开放平台 iframe 播放器
export const douyinEmbedUrl = (dy) => `https://open.douyin.com/player/video?vid=${dy}&autoplay=0`

// 抖音播放器无小尺寸嵌入模式,以桌面 1280px 宽度渲染再 CSS 等比缩小到容器宽度
const DOUYIN_RENDER_WIDTH = 1280

/**
 * 视频卡片逻辑层:播放器挂载时机 + 抖音缩放。
 * @param mediaElRef 视频区根容器 ref(B 站/抖音通用)
 */
export function useVideoEmbed(mediaElRef) {
  // 卡片首次真正进入视口才挂载播放器 iframe(全页 25 个播放器同时初始化会拖垮性能);
  // once 触发后自动停止观察,isVisible 定格为 true,配合视图层 v-if 实现「加载后常驻不卸载」
  const isPlayerReady = useElementVisibility(mediaElRef, { rootMargin: '0px 0px', once: true })

  // 每卡自测宽度算缩放比,替代原先跨卡片共享 dyWrappers + ResizeObserver 的写法
  const { width } = useElementSize(mediaElRef)
  const douyinScale = computed(() => (width.value > 0 ? width.value / DOUYIN_RENDER_WIDTH : 1))

  return { isPlayerReady, douyinScale }
}
