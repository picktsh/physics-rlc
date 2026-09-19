<script setup>
// 视频位「尚不可看」时的统一占位,VideoCard(播放器未挂载)与 VideoPlayer(iframe 加载中)共用,
// 保证两处视觉连续、口径单一。loading=true 时用转圈替代播放键,提示「正在加载」而非「可点播」。
defineProps({
  // { bv?, dy? } —— 用于展示平台标识
  video: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1e293b] to-[#0f172a]">
    <!-- span 默认 inline,必须 block 才能让 h-7/w-7 生效(否则空转圈不可见) -->
    <span
      v-if="loading"
      class="block h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
    ></span>
    <span
      v-else
      class="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/12 pl-[3px] text-base text-white"
      >▶</span
    >
    <span class="text-[11px] tracking-[0.5px] text-[#94a3b8]">{{ video.bv ? 'bilibili' : '抖音' }}</span>
  </div>
</template>
