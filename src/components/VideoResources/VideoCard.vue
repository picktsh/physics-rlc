<script setup>
import { ref } from 'vue'
import { bilibiliEmbedUrl, douyinEmbedUrl, useVideoEmbed } from './composables/useVideoEmbed'

defineProps({
  // { title, bv? , dy? } —— bv 为 B 站号,dy 为抖音视频 ID,二选一
  video: { type: Object, required: true },
})

const emit = defineEmits(['expand'])

const mediaEl = ref(null)
const { isPlayerReady, douyinScale } = useVideoEmbed(mediaEl)
</script>

<template>
  <div
    class="group border border-[#e2e7f0] rounded-[10px] overflow-hidden bg-white transition-all duration-200 hover:border-[#c9d6ec] hover:shadow-[0_6px_18px_rgba(28,42,80,0.10)]"
    data-vr="card"
  >
    <!-- 视频区:可视区域内才挂载播放器,视口外为轻量占位封面 -->
    <div ref="mediaEl" class="relative overflow-hidden aspect-video">
      <!-- B 站 iframe 嵌入 -->
      <template v-if="video.bv">
        <iframe
          v-if="isPlayerReady"
          class="absolute inset-0 w-full h-full border-0"
          :src="bilibiliEmbedUrl(video.bv)"
          scrolling="no"
          frameborder="0"
          allowfullscreen="true"
          loading="lazy"
          data-vr="frame"
        ></iframe>
        <div v-else class="media-placeholder">
          <span class="ph-play">▶</span>
          <span class="ph-badge">bilibili</span>
        </div>
      </template>
      <!-- 抖音 iframe 嵌入:大尺寸渲染 + CSS 缩放,避免比例问题 -->
      <template v-else-if="video.dy">
        <iframe
          v-if="isPlayerReady"
          class="dy-player"
          :src="douyinEmbedUrl(video.dy)"
          :style="{ transform: `scale(${douyinScale})`, transformOrigin: 'top left' }"
          width="1280"
          height="720"
          scrolling="no"
          frameborder="0"
          allowfullscreen="true"
          loading="lazy"
          data-vr="frame"
        ></iframe>
        <div v-else class="media-placeholder">
          <span class="ph-play">▶</span>
          <span class="ph-badge">抖音</span>
        </div>
      </template>
    </div>
    <div class="relative flex items-start gap-1 px-3 py-2.5">
      <p class="flex-1 text-[13px] leading-snug text-[#33415e] line-clamp-2" :title="video.title" data-vr="title">
        {{ video.title }}
      </p>
      <button class="expand-btn shrink-0 mt-0.5" @click="emit('expand', video)" title="放大播放">
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
    </div>
  </div>
</template>

<style scoped>
.dy-player {
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
}

/* 可视区域外的播放器占位封面 */
.media-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
}

.ph-play {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 16px;
  padding-left: 3px;
}

.ph-badge {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #94a3b8;
}

/* 放大按钮 */
.expand-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid transparent;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s,
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
}

.group:hover .expand-btn {
  opacity: 1;
}

.expand-btn:hover {
  background: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}
</style>
