<script setup>
import { computed, ref, watch } from 'vue'
import { useElementSize, useFullscreen, useScreenOrientation, useTimeoutFn } from '@vueuse/core'
import { NIcon } from 'naive-ui'
import { Restart } from '@vicons/carbon'

// 纯播放器视图,列表卡片与放大弹窗共用:B 站流式铺满;抖音固定 1280×720 桌面渲染再 contain 缩到容器。
const props = defineProps({
  // { bv?, dy? } —— bv 为 B 站号,dy 为抖音视频 ID,二选一
  video: { type: Object, required: true },
  // 懒挂载门控:卡片按可见性传入;false 时不创建 iframe,由内部占位覆盖。放大弹窗内默认 true
  ready: { type: Boolean, default: true },
})

// 防白闪:第三方 iframe 在目标页绘出前会短暂以白底填充(且 allowtransparency 会露出下层白底)。
// 故 iframe 初始透明,监听 @load 拿到内容后淡入;root 黑底作为加载前兜底,配合卡片黑占位形成连续暗色不闪白。
const loaded = ref(false)
// 同一实例切换视频源时(src 变化)重置,避免新页加载过程中直接露出旧态/白底
watch(
  () => props.video.bv || props.video.dy,
  () => (loaded.value = false),
)

// iframe loaded 后不立即撤占位:此时内部首帧未必画出,直接撤会露白。
// 策略:全显再停 ~200ms(由 CSS delay-200 实现),然后用 300ms 淡出,末尾卸载停掉转圈。
// 卸载延时 600ms = 200 停留 + 300 淡出 + 100 缓冲,确保淡到透明后才移除节点。
const removePlaceholder = ref(false)
const { start: scheduleRemove, stop: cancelRemove } = useTimeoutFn(() => (removePlaceholder.value = true), 600, {
  immediate: false,
})
// ready && loaded 同时成立才进入「停留→淡出→卸载」;否则(切源/滚出视口)取消计时并立即恢复全显占位
watch(
  () => props.ready && loaded.value,
  (shown) => {
    if (shown) scheduleRemove()
    else {
      cancelRemove()
      removePlaceholder.value = false
    }
  },
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
  if (!props.ready) return false // iframe 尚未挂载:交给卡片回退弹窗,避免全屏一个空黑框
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
    <!-- B 站 iframe 嵌入(仅 ready 时创建) -->
    <iframe
      v-if="ready && video.bv"
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
    <div v-else-if="ready && video.dy" class="absolute inset-0 flex items-center justify-center">
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
    <!-- 加载占位:未就绪或未 loaded 时全显;二者就绪后停 ~200ms 再淡出,末尾卸载停转圈 -->
    <div
      v-if="!removePlaceholder"
      class="absolute inset-0 flex items-center justify-center text-white transition-opacity duration-300"
    >
      <NIcon :component="Restart" :size="40" class="animate-spin" />
    </div>
  </div>
</template>
