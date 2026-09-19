<script setup>
import { computed, ref, watch } from 'vue'
import { useElementSize, useFullscreen, useScreenOrientation } from '@vueuse/core'
import VideoPlaceholder from './VideoPlaceholder.vue'

// 纯播放器视图,列表卡片与放大弹窗共用:B 站流式铺满;抖音固定 1280×720 桌面渲染再 contain 缩到容器。
const props = defineProps({
  // { bv?, dy? } —— bv 为 B 站号,dy 为抖音视频 ID,二选一
  video: { type: Object, required: true },
})

// 防白闪:第三方 iframe 在目标页绘出前会短暂以白底填充(且 allowtransparency 会露出下层白底)。
// 故 iframe 初始透明,监听 @load 拿到内容后淡入;root 黑底作为加载前兜底,配合卡片黑占位形成连续暗色不闪白。
const loaded = ref(false)
// 同一实例切换视频源时(src 变化)重置,避免新页加载过程中直接露出旧态/白底
watch(
  () => props.video.bv || props.video.dy,
  () => (loaded.value = false),
)

// B 站官方嵌入式播放器:高清 + 关弹幕 + 不自动播放
const bilibiliEmbedUrl = (bv) =>
  `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0`
// 抖音开放平台 iframe 播放器
const douyinEmbedUrl = (dy) => `https://open.douyin.com/player/video?vid=${dy}&autoplay=0`

// 抖音无小尺寸嵌入模式:iframe 布局盒必须保持 1280×720 才出桌面版,再 CSS 等比缩到容器内
const DOUYIN_RENDER_WIDTH = 1280
const DOUYIN_RENDER_HEIGHT = 720

const rootEl = ref(null)

// 抖音 contain 缩放:取宽/高较小比值,任意容器比例都完整可见;尺寸未就绪先按 1 占位避免首帧闪烁
const { width, height } = useElementSize(rootEl)
const douyinScale = computed(() =>
  width.value <= 0 || height.value <= 0
    ? 1
    : Math.min(width.value / DOUYIN_RENDER_WIDTH, height.value / DOUYIN_RENDER_HEIGHT),
)

// 全屏 + best-effort 锁横屏:须在用户手势同步栈发起;iOS 非 video 元素不支持 → enterFullscreen 返回 false 由卡片回退弹窗,锁向失败静默
const { isFullscreen, enter } = useFullscreen(rootEl, { autoExit: true })
const { lockOrientation, unlockOrientation } = useScreenOrientation()
// 退出全屏时解锁方向,避免锁定残留
watch(isFullscreen, (active) => !active && unlockOrientation())

// 返回是否成功进入全屏;false 时由调用方(卡片)回退打开弹窗
async function enterFullscreen() {
  try {
    await enter()
  } catch {
    return false // iOS 等会 reject
  }
  if (!isFullscreen.value) return false // 不支持时 VueUse 静默 no-op
  try {
    await lockOrientation('landscape')
  } catch {
    // 桌面/iOS 不支持或被拒:保持当前方向
  }
  return true
}
// 全屏能力上抛给父组件(卡片点击时优先走全屏,不支持再回退弹窗)
defineExpose({ enterFullscreen })
</script>

<template>
  <div
    ref="rootEl"
    class="absolute inset-0 overflow-hidden bg-black"
    :class="isFullscreen ? 'h-[100dvh] w-screen' : ''"
  >
    <!-- B 站 iframe 嵌入 -->
    <iframe
      v-if="video.bv"
      class="absolute inset-0 h-full w-full border-0 transition-opacity duration-300"
      :class="loaded ? 'opacity-100' : 'opacity-0'"
      :src="bilibiliEmbedUrl(video.bv)"
      @load="loaded = true"
      scrolling="no"
      frameborder="0"
      allowfullscreen
      allowtransparency
      loading="lazy"
    ></iframe>
    <!-- 盒保持 1280×720 出桌面版;外层 flex 居中(溢出时仍等量居中,优于 margin:auto),transform 只做纯视觉缩放 -->
    <div v-else-if="video.dy" class="absolute inset-0 flex items-center justify-center">
      <iframe
        class="shrink-0 origin-center border-0 transition-opacity duration-300"
        :class="loaded ? 'opacity-100' : 'opacity-0'"
        :src="douyinEmbedUrl(video.dy)"
        :style="{ transform: `scale(${douyinScale})` }"
        @load="loaded = true"
        width="1280"
        height="720"
        scrolling="no"
        frameborder="0"
        allowfullscreen
        allowtransparency
        loading="lazy"
      ></iframe>
    </div>
    <!-- iframe 加载完成前(opacity-0)用与卡片同款占位 + 转圈兑底,与未挂载态视觉连续不闪白 -->
    <VideoPlaceholder v-if="!loaded" :video="video" loading />
  </div>
</template>
