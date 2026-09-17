<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// ⚠️ 视频清单:未替换的条目均为占位(标题带「(示例)」,BV 用 B 站嵌入文档示例号)。
// 换真实视频时只改这里:title 是卡片标题;bv 取 B 站视频地址中的 BV 号
// (如 https://www.bilibili.com/video/BV1xx411c7mD 的 BV1xx411c7mD)。
// dy 填抖音视频 ID(从 https://www.douyin.com/video/xxxxx 地址中提取纯数字)。
// 每类数量不限,自动三列换行。
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

// B 站官方嵌入式播放器:高清 + 默认关弹幕 + 不自动播放
const embedUrl = (bv) => `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0`
// 抖音开放平台 iframe 播放器
const douyinEmbedUrl = (dy) => `https://open.douyin.com/player/video?vid=${dy}&autoplay=0`

// 抖音视频缩放:以 1280px 宽度渲染播放器(桌面端布局),再 CSS 缩小到容器宽度
const dyWrappers = ref([])
const dyScale = ref(1)
let ro = null

function setDyWrapper(el) {
  if (el && !dyWrappers.value.includes(el)) {
    dyWrappers.value.push(el)
  }
}

function updateScale() {
  const w = dyWrappers.value[0]?.clientWidth
  if (w > 0) dyScale.value = w / 1280
}

onMounted(() => {
  updateScale()
  if (dyWrappers.value[0]) {
    ro = new ResizeObserver(updateScale)
    ro.observe(dyWrappers.value[0])
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
})

// ── 视频放大/缩小 ──
const expandedVideo = ref(null)

function expandVideo(video) {
  expandedVideo.value = video
}

function closeExpand() {
  expandedVideo.value = null
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeExpand()
}

watch(expandedVideo, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    window.addEventListener('keydown', onModalKeydown)
  } else {
    window.removeEventListener('keydown', onModalKeydown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onModalKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <section v-for="cat in rawCategories" :key="cat.id" class="card mb-4" data-vr="cat">
    <div class="flex items-center justify-between mb-3.5">
      <h2 class="sec-title !mb-0">{{ cat.title }}</h2>
      <span class="shrink-0 text-xs text-[#8a97ab] bg-[#f2f5fa] border border-[#e2e7f0] rounded-full px-2.5 py-[3px]">
        {{ cat.videos.length }} 个视频
      </span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5" data-vr="grid">
      <div
        v-for="(video, vi) in cat.videos"
        :key="vi"
        class="group border border-[#e2e7f0] rounded-[10px] overflow-hidden bg-white transition-all duration-200 hover:border-[#c9d6ec] hover:shadow-[0_6px_18px_rgba(28,42,80,0.10)]"
        data-vr="card"
      >
        <!-- B 站 iframe 嵌入 -->
        <div v-if="video.bv" class="relative aspect-video">
          <iframe
            class="absolute inset-0 w-full h-full border-0"
            :src="embedUrl(video.bv)"
            scrolling="no"
            frameborder="0"
            allowfullscreen="true"
            loading="lazy"
            data-vr="frame"
          ></iframe>
        </div>
        <!-- 抖音 iframe 嵌入:大尺寸渲染 + CSS 缩放,避免比例问题 -->
        <div
          v-else-if="video.dy"
          :ref="setDyWrapper"
          class="relative overflow-hidden aspect-video"
        >
          <iframe
            class="dy-player"
            :src="douyinEmbedUrl(video.dy)"
            :style="{ transform: `scale(${dyScale})`, transformOrigin: 'top left' }"
            width="1280"
            height="720"
            scrolling="no"
            frameborder="0"
            allowfullscreen="true"
            loading="lazy"
            data-vr="frame"
          ></iframe>
        </div>
        <div class="relative flex items-start gap-1 px-3 py-2.5">
          <p
            class="flex-1 text-[13px] leading-snug text-[#33415e] line-clamp-2"
            :title="video.title"
            data-vr="title"
          >
            {{ video.title }}
          </p>
          <button
            class="expand-btn shrink-0 mt-0.5"
            @click="expandVideo(video)"
            title="放大播放"
          >
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
  <a
    href="https://search.bilibili.com/all?keyword=rlc%E4%B8%B2%E8%81%94%E8%B0%90%E6%8C%AF"
    target="_blank"
    rel="noopener noreferrer"
    class="card flex items-center justify-center gap-2 py-3.5 text-[15px] font-medium text-[#1d4ed8] bg-[#dbeafe] border border-[#93b4fd] rounded-xl transition-all duration-200 hover:bg-[#bfdbfe] hover:border-[#60a5fa] hover:shadow-[0_4px_14px_rgba(29,78,216,0.18)]"
    data-vr="more-btn"
  >
    <svg viewBox="0 0 24 24" class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
    在哔哩哔哩发现更多 RLC 串联谐振视频
    <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </a>

  <!-- 视频放大弹窗 -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="expandedVideo"
        class="fixed inset-0 z-[9999] flex items-center justify-center"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeExpand"></div>
        <!-- 内容卡片 -->
        <div class="relative z-10 w-[94vw] max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h3 class="text-[15px] font-semibold text-gray-800 truncate pr-4">{{ expandedVideo.title }}</h3>
            <button
              class="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              @click="closeExpand"
              title="缩小"
            >
              <svg viewBox="0 0 24 24" class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div class="relative aspect-video bg-black">
            <iframe
              v-if="expandedVideo.bv"
              class="absolute inset-0 w-full h-full border-0"
              :src="embedUrl(expandedVideo.bv)"
              scrolling="no"
              frameborder="0"
              allowfullscreen="true"
            ></iframe>
            <iframe
              v-else-if="expandedVideo.dy"
              class="absolute inset-0 w-full h-full border-0"
              :src="douyinEmbedUrl(expandedVideo.dy)"
              scrolling="no"
              frameborder="0"
              allowfullscreen="true"
            ></iframe>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dy-player {
  position: absolute;
  top: 0;
  left: 0;
  border: 0;
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
  color: var(--faint);
  border: 1px solid transparent;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.15s, color 0.15s, border-color 0.15s;
}

.group:hover .expand-btn {
  opacity: 1;
}

.expand-btn:hover {
  background: var(--soft-bg);
  color: var(--muted);
  border-color: var(--line);
}

/* 弹窗动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative {
  transition: transform 0.25s ease;
}

.modal-enter-from .relative {
  transform: scale(0.92);
}
</style>
