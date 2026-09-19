<script setup>
import { ref } from 'vue'
import { NModal } from 'naive-ui'
import VideoCard from './VideoCard.vue'
import VideoPlayer from './VideoPlayer.vue'

// ⚠️ 视频清单:换真实视频只改这里。bv 取 B 站地址中的 BV 号(如 BV1xx411c7mD);
// dy 取抖音视频地址中的纯数字 ID。每类数量不限,自动三列换行。
const rawCategories = [
  {
    id: 'principle',
    title: '基础原理',
    videos: [
      { title: '串联谐振和并联谐振分别有什么用？', bv: 'BV1ej421Q7tV' },
      { title: '通俗易懂的动画，3分钟让你深度理解谐振！谐振的工作原理！', bv: 'BV1a24y1Q7DD' },
      { title: '最简单的振荡电路 —— LC振荡的美妙演示！', bv: 'BV11k4y167N2' },
      { title: '(只需30秒)让你了解RLC串联谐振的原理', bv: 'BV15m4y1H7sh' },
      { title: '空中这么多信号，收音机怎么选出想要的？谐振电路超形象动画讲解!', bv: 'BV1gr3g6LEYy' },
    ],
  },
  {
    id: 'build',
    title: '仿真演示',
    videos: [
      { title: 'multisim 电路仿真软件 初步使用 及R、L、C串联谐振电路仿真分析', bv: 'BV1tT4y1B7Zj' },
      { title: '『模拟滤波器设计』一阶RC滤波器LTSPICE仿真验证', bv: 'BV1Se8dzaEto' },
      { title: 'Multisim 14.0模拟回转器', bv: 'BV1dU4y1N7QP' },
      { title: 'Matlab仿真RLC一阶电路实验', bv: 'BV1UD4y1L7zC' },
    ],
  },
  {
    id: 'operation',
    title: '实物实操',
    videos: [
      { title: '如何使用面包板搭建RC桥式振荡电路？', bv: 'BV13u4m1T77N' },
      { title: '【案例示范】安装与调试555集成电路组成的多谐振荡器', bv: 'BV1B54y1u7Wf' },
      { title: '基于单片机的脉搏测量仪设计—硬件电路原理', bv: 'BV18p4y187vW' },
      { title: '利用示波器的光标手动模式读取RC一阶电路波形中的时间常数', bv: 'BV1nG411y7FF' },
      { title: 'RLC串联谐振', bv: 'BV1Ze411N7zK' },
    ],
  },
  {
    id: 'analysis',
    title: '故障与拓展',
    videos: [
      { title: '寄生参数对SiC MOSFET开关瞬态的影响01【双脉冲仿真】【LTspice】', bv: 'BV19M411s7ih' },
      { title: 'STM32HAL库教程(ADC+TIM+DMA)波形采集', bv: 'BV1YmHtz6EFE' },
      { title: '分类问题：故障诊断，故障识别，特征提取......', bv: 'BV1vZ4y1C7XQ' },
      { title: '基于STM32单片机RLC检测仪 （程序＋原理图＋PCB＋设计报告）', bv: 'BV1kTr8BsE8b' },
    ],
  },
  {
    id: 'damping-experiment',
    title: 'RLC阻尼振荡特性实验',
    videos: [
      { title: '高中物理｜电磁震荡 学校里听不懂？一个视频教会你', bv: 'BV1bWt26nER5' },
      { title: 'LC振荡电路：两个基本元器件组合起来的神奇效果（抖音）', dy: '7399551676325137718' },
      { title: '高中物理｜电磁震荡（抖音）', dy: '7673399153272424315' },
      { title: '动画详解：LC振荡电路（抖音）', dy: '7334945798523784498' },
      { title: 'RC滤波器的原理（抖音）', dy: '7627760068842462922' },
      { title: 'LC振荡电路，实验+动画讲解（抖音）', dy: '7225415947413196092' },
      { title: '实验分享 | LC振荡电路原理讲解+示波器波形演示（抖音）', dy: '7164317164315364612' },
      { title: '电路实验：观察RLC二阶电路阻尼振荡波形和RC一阶（抖音）', dy: '7232148499352030519' },
      { title: '汽车减震器的结构作用及避震原理（抖音）', dy: '7655672984815848756' },
    ],
  },
]

// 卡片渲染与懒加载见 VideoResources/VideoCard.vue;播放器渲染与全屏见 VideoResources/VideoPlayer.vue

// ── 视频放大/缩小 ──
// 遮罩、滚动锁定、Esc/点遮罩关闭、过渡动画均由 NModal 内置处理
const expandedVideo = ref(null)

function expandVideo(video) {
  expandedVideo.value = video
}

function closeExpand() {
  expandedVideo.value = null
}
</script>

<template>
  <section v-for="cat in rawCategories" :key="cat.id" class="card mb-4">
    <div class="flex items-center justify-between mb-3.5">
      <h2 class="sec-title !mb-0">{{ cat.title }}</h2>
      <span class="shrink-0 text-xs text-[#8a97ab] bg-[#f2f5fa] border border-[#e2e7f0] rounded-full px-2.5 py-[3px]">
        {{ cat.videos.length }} 个视频
      </span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
      <VideoCard v-for="video in cat.videos" :key="video.bv || video.dy" :video="video" @expand="expandVideo" />
    </div>
  </section>
  <a
    href="https://search.bilibili.com/all?keyword=rlc%E4%B8%B2%E8%81%94%E8%B0%90%E6%8C%AF"
    target="_blank"
    rel="noopener noreferrer"
    class="card flex items-center justify-center gap-2 py-3.5 text-[15px] font-medium text-[#1d4ed8] bg-[#dbeafe] border border-[#93b4fd] rounded-xl transition-all duration-200 hover:bg-[#bfdbfe] hover:border-[#60a5fa] hover:shadow-[0_4px_14px_rgba(29,78,216,0.18)]"
  >
    <svg
      viewBox="0 0 24 24"
      class="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
    在哔哩哔哩发现更多 RLC 串联谐振视频
    <svg
      viewBox="0 0 24 24"
      class="w-4 h-4"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </a>

  <!-- 放大弹窗宿主:NModal 通过 to 挂载于此,便于用 :deep 局部覆盖遮罩与圆角,不影响其他弹窗 -->
  <div id="video-modal-host"></div>

  <!-- 视频放大弹窗:NModal preset=card 自带标题栏 + 右上关闭按钮,无需手写遮罩/滚动锁定/过渡 -->
  <NModal
    :show="!!expandedVideo"
    preset="card"
    to="#video-modal-host"
    :title="expandedVideo?.title"
    :block-scroll="true"
    :mask-closable="true"
    :auto-focus="false"
    :content-style="{ padding: 0 }"
    class="w-full max-w-[1280px]"
    @update:show="closeExpand"
  >
    <div class="relative aspect-video bg-black">
      <VideoPlayer v-if="expandedVideo" :video="expandedVideo" />
    </div>
  </NModal>
</template>

<style scoped>
/* 全局主题为直角,放大弹窗单独恢复圆角并裁切视频边缘 */
#video-modal-host :deep(.n-card) {
  border-radius: 16px;
  overflow: hidden;
}

/* naive 遮罩默认 rgba(0,0,0,.4) 为硬编码而非主题变量,这里针对本弹窗加深 */
#video-modal-host :deep(.n-modal-mask) {
  background-color: rgba(0, 0, 0, 0.85);
}

/* 标题过长时单行省略,避免换行把弹窗头撑高(不改 padding 以保持 PC/移动端统一) */
#video-modal-host :deep(.n-card-header__main) {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
