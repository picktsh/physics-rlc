<script setup>
// ⚠️ 视频清单:未替换的条目均为占位(标题带「(示例)」,BV 用 B 站嵌入文档示例号)。
// 换真实视频时只改这里:title 是卡片标题;bv 取 B 站视频地址中的 BV 号
// (如 https://www.bilibili.com/video/BV1xx411c7mD 的 BV1xx411c7mD)。每类数量不限,自动三列换行。
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
]

// B 站官方嵌入式播放器:高清 + 默认关弹幕 + 不自动播放
const embedUrl = (bv) => `https://player.bilibili.com/player.html?bvid=${bv}&page=1&high_quality=1&danmaku=0&autoplay=0`
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
        <div class="relative aspect-video">
          <iframe
            class="absolute inset-0 w-full h-full border-0"
            :src="embedUrl(video.bv)"
            scrolling="no"
            frameborder="0"
            allowfullscreen="true"
            data-vr="frame"
          ></iframe>
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
