<script setup>
import { ref, watch } from 'vue'
import { NIcon, NTooltip } from 'naive-ui'
import { Maximize } from '@vicons/carbon'
import { useElementVisibility, useMediaQuery, useTimeoutFn } from '@vueuse/core'
import VideoPlayer from './VideoPlayer.vue'

const props = defineProps({
  // { title, bv?, dy? } —— bv 为 B 站号,dy 为抖音视频 ID,二选一
  video: { type: Object, required: true },
})

const emit = defineEmits(['expand'])

// 卡片只负责懒加载门控与占位;播放器渲染交给 VideoPlayer(与放大弹窗共用)
const mediaEl = ref(null)
const playerRef = ref(null)

// 性能:整页几十个第三方 iframe 若「进入视口即常驻不卸载」,滚完一遍会累积几十个存活浏览上下文,弱机内存/CPU 直接被打爆。
// 改成跟随可见性挂载——存活数始终 ≈ 屏幕能容纳的卡片数(约 9~12),并双向防抖避免快速滚动反复创建/销毁:
//  - 挂载需持续可见 MOUNT_DELAY:快速滑过、一闪而过的卡片根本不触发 iframe 初始化
//  - 卸载给 UNMOUNT_GRACE 宽限:边缘抖动/小幅回滚直接复用已挂载播放器,不必销毁重建
const MOUNT_DELAY = 150
const UNMOUNT_GRACE = 700
const isVisible = useElementVisibility(mediaEl, { rootMargin: '0px 0px' })
const isPlayerReady = ref(false)
const { start: scheduleMount, stop: cancelMount } = useTimeoutFn(() => (isPlayerReady.value = true), MOUNT_DELAY, {
  immediate: false,
})
const { start: scheduleUnmount, stop: cancelUnmount } = useTimeoutFn(
  () => (isPlayerReady.value = false),
  UNMOUNT_GRACE,
  { immediate: false },
)
watch(isVisible, (visible) => {
  if (visible) {
    cancelUnmount() // 宽限期内滚回:取消卸载,继续复用
    if (!isPlayerReady.value) scheduleMount()
  } else {
    cancelMount() // 已滑走:撤销待挂载,连 iframe 都不必创建
    if (isPlayerReady.value) scheduleUnmount()
  }
})

// 点击必须在同步栈里发起全屏(手势约束);不支持/被拒时回退上抛父组件开弹窗
async function handleExpand() {
  const ok = await playerRef.value?.enterFullscreen()
  if (!ok) emit('expand', props.video)
}

// 触屏无真 hover,点击气泡不自动收起,故按 hover 能力禁用
const canHover = useMediaQuery('(hover: hover)')
</script>

<template>
  <!-- 阴影走主题变量 --card-shadow:黑底自动转深,故不自带边框(见 main.css) -->
  <div class="group overflow-hidden rounded-lg bg-white shadow-[var(--card-shadow)] transition-all duration-200">
    <!-- 视频区:黑底由本容器提供;播放器常驻,iframe 是否挂载与占位转圈均由 VideoPlayer 依 isPlayerReady 内部控制,保证动画连续 -->
    <div ref="mediaEl" class="relative aspect-video overflow-hidden bg-black">
      <VideoPlayer ref="playerRef" :video="video" :ready="isPlayerReady" />
    </div>
    <div class="relative flex items-start gap-1 px-3 py-2.5">
      <p class="flex-1 text-[13px] leading-snug text-[#33415e] line-clamp-2" :title="video.title">
        {{ video.title }}
      </p>
      <NTooltip trigger="hover" placement="top" :disabled="!canHover">
        <template #trigger>
          <!-- PC:默认透明、hover 卡片才显形;触屏无 hover 能力则常驻淡背景描边 -->
          <button
            class="mt-0.5 flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-[#94a3b8] opacity-0 transition duration-200 group-hover:opacity-100 hover:border-[#e2e8f0] hover:bg-[#f1f5f9] hover:text-[#475569] [@media(hover:none)]:border-[#e2e8f0] [@media(hover:none)]:bg-[#f1f5f9] [@media(hover:none)]:text-[#475569] [@media(hover:none)]:opacity-100"
            @click="handleExpand"
          >
            <NIcon :component="Maximize" :size="24" />
          </button>
        </template>
        放大播放
      </NTooltip>
    </div>
  </div>
</template>
