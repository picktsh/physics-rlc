<script setup>
import { ref } from 'vue'
import { NTooltip } from 'naive-ui'
import { useElementVisibility, useMediaQuery } from '@vueuse/core'
import VideoPlayer from './VideoPlayer.vue'

const props = defineProps({
  // { title, bv?, dy? } —— bv 为 B 站号,dy 为抖音视频 ID,二选一
  video: { type: Object, required: true },
})

const emit = defineEmits(['expand'])

// 卡片只负责懒加载门控与占位;播放器渲染交给 VideoPlayer(与放大弹窗共用)
const mediaEl = ref(null)
// 首次进入视口才挂载(全页数十 iframe 同时初始化会拖垮性能);once 定格 true,配合 v-if 常驻不卸载
const isPlayerReady = useElementVisibility(mediaEl, { rootMargin: '0px 0px', once: true })
const playerRef = ref(null)

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
  <div
    class="group overflow-hidden rounded-[10px] bg-white shadow-[var(--card-shadow)] transition-all duration-200"
  >
    <!-- 视频区:可视区域内才挂载播放器,视口外为轻量占位封面 -->
    <div ref="mediaEl" class="relative aspect-video overflow-hidden">
      <VideoPlayer v-if="isPlayerReady" ref="playerRef" :video="video" />
      <div
        v-else
        class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1e293b] to-[#0f172a]"
      >
        <span
          class="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/12 pl-[3px] text-base text-white"
          >▶</span
        >
        <span class="text-[11px] tracking-[0.5px] text-[#94a3b8]">{{ video.bv ? 'bilibili' : '抖音' }}</span>
      </div>
    </div>
    <div class="relative flex items-start gap-1 px-3 py-2.5">
      <p class="flex-1 text-[13px] leading-snug text-[#33415e] line-clamp-2" :title="video.title">
        {{ video.title }}
      </p>
      <NTooltip trigger="hover" placement="top" :disabled="!canHover">
        <template #trigger>
          <!-- PC:默认透明、hover 卡片才显形;触屏无 hover 能力则常驻淡背景描边 -->
          <button
            class="mt-0.5 flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-transparent text-[#94a3b8] opacity-0 transition duration-200 group-hover:opacity-100 hover:border-[#e2e8f0] hover:bg-[#f1f5f9] hover:text-[#475569] [@media(hover:none)]:border-[#e2e8f0] [@media(hover:none)]:bg-[#f1f5f9] [@media(hover:none)]:text-[#475569] [@media(hover:none)]:opacity-100"
            @click="handleExpand"
          >
            <svg
              viewBox="0 0 24 24"
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </template>
        放大播放
      </NTooltip>
    </div>
  </div>
</template>
