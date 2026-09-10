<script setup>
import { reactive } from 'vue'

// ⚠️ 视频清单:未替换的条目均为占位(标题带「(示例)」,BV 用 B 站嵌入文档示例号)。
// 换真实视频时只改这里:title 是卡片标题;bv 取 B 站视频地址中的 BV 号
// (如 https://www.bilibili.com/video/BV1xx411c7mD 的 BV1xx411c7mD)。每类数量不限,自动三列换行。
const rawCategories = [
  {
    id: 'principle',
    title: '实验原理与公式讲解',
    videos: [
      { title: '串联谐振和并联谐振分别有什么用？', bv: 'BV1ej421Q7tV' },
      { title: '谐振频率 f₀ 的推导与物理意义(示例)', bv: 'BV1xx411c7mD' },
      { title: '品质因数 Q 与通频带的关系(示例)', bv: 'BV11k4y167N2' },
      { title: '感抗、容抗随频率的变化规律(示例)', bv: 'BV1xx411c7mD' },
      { title: '电压与电流的相位关系图解(示例)', bv: 'BV1xx411c7mD' },
    ],
  },
  {
    id: 'build',
    title: '电路搭建与仪器使用',
    videos: [
      { title: '实验器材清单与交流信号源使用(示例)', bv: 'BV1xx411c7mD' },
      { title: '在实验箱上搭出 RLC 串联电路(示例)', bv: 'BV1xx411c7mD' },
      { title: '示波器双通道接线与读数方法(示例)', bv: 'BV1xx411c7mD' },
      { title: '交流毫伏表测量各元件电压(示例)', bv: 'BV1xx411c7mD' },
      { title: '电路检查与常见接线错误排查(示例)', bv: 'BV1xx411c7mD' },
    ],
  },
  {
    id: 'operation',
    title: '实验操作与现象观察',
    videos: [
      { title: '扫频观察电流峰值的完整流程(示例)', bv: 'BV1xx411c7mD' },
      { title: '谐振点定位:调频寻找最大电流(示例)', bv: 'BV1xx411c7mD' },
      { title: '不同 Q 值下的谐振曲线对比(示例)', bv: 'BV1xx411c7mD' },
      { title: '李萨如图形法判断相位差(示例)', bv: 'BV1xx411c7mD' },
      { title: 'LC 电压幅值法测品质因数(示例)', bv: 'BV1xx411c7mD' },
    ],
  },
  {
    id: 'analysis',
    title: '数据处理与误差分析',
    videos: [
      { title: '实验数据记录表的填写规范(示例)', bv: 'BV1xx411c7mD' },
      { title: '谐振曲线的数据处理与作图(示例)', bv: 'BV1xx411c7mD' },
      { title: '品质因数三种测法的结果对比(示例)', bv: 'BV1xx411c7mD' },
      { title: '常见误差来源与降低方法(示例)', bv: 'BV1xx411c7mD' },
      { title: '实验报告撰写要点与评分标准(示例)', bv: 'BV1xx411c7mD' },
    ],
  },
]

// 运行时给每条视频附加 open 标记:false 时只渲染轻量封面门面(点击后才挂载播放器 iframe,
// 避免 20 个 B 站播放器进页即初始化造成流量与卡顿)
const categories = reactive(rawCategories.map((c) => ({ ...c, videos: c.videos.map((v) => ({ ...v, open: false })) })))

// B 站官方嵌入式播放器:高清 + 默认关弹幕 + 不自动播放
const embedUrl = (bv) => `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0`
</script>

<template>
  <section v-for="cat in categories" :key="cat.id" class="card mb-4" data-vr="cat">
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
        <div class="relative aspect-video bg-gradient-to-br from-[#e3ecfc] via-[#f3f7fe] to-[#dde8fa]">
          <iframe
            v-if="video.open"
            class="absolute inset-0 w-full h-full border-0"
            :src="embedUrl(video.bv)"
            scrolling="no"
            frameborder="0"
            allowfullscreen="true"
            data-vr="frame"
          ></iframe>
          <button
            v-else
            type="button"
            class="absolute inset-0 w-full h-full flex items-center justify-center"
            :aria-label="'播放视频:' + video.title"
            data-vr="facade"
            @click="video.open = true"
          >
            <span
              class="w-12 h-12 rounded-full bg-white/90 text-[#2563eb] shadow-[0_2px_10px_rgba(28,42,80,0.18)] flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            >
              <svg viewBox="0 0 24 24" class="w-5 h-5 translate-x-[1px]" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span class="absolute right-2 bottom-2 text-[11px] leading-none text-white bg-black/45 rounded px-1.5 py-1">
              哔哩哔哩
            </span>
          </button>
        </div>
        <p
          class="px-3 py-2.5 text-[13px] leading-snug text-[#33415e] line-clamp-2"
          :title="video.title"
          data-vr="title"
        >
          {{ video.title }}
        </p>
      </div>
    </div>
  </section>
</template>
