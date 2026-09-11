<template>
  <div>
    <!-- ============ 1. 模块说明 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title hr-title">心率检测</h2>
      <p class="text-[14.5px] text-[#56647a] leading-6">
        心率检测是 RLC 电路的工程应用场景之一:传感器拾取脉搏信号,经选频/滤波网络处理后提取有效分量,据此计算心率。
      </p>
      <p class="text-[13.5px] text-[#8a97ab] leading-6 mt-2">
        本页框架已接入「RLC工程应用」;具体测量流程、波形显示与交互细节将随需求逐步完善。
      </p>
    </section>

    <!-- ============ 2. 检测工作区(待需求细化后填充) ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">检测工作区</h2>
      <div class="hr-placeholder">
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b9c6dd"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12h3l2.5-6.5 4.5 12.5 2.5-6H22" />
        </svg>
        <p class="text-[14.5px] font-semibold text-[#56647a]">心率检测功能搭建中</p>
        <p class="text-[13px] text-[#8a97ab]">详细内容将随后续需求补充完善</p>
      </div>
    </section>
  </div>
</template>

<script setup>
// 心率检测模块:页面骨架先行,具体功能与交互待需求细节补充后实现
</script>

<style scoped>
/* 页面总标题,与收音机页 .tuner-title 视觉重量一致 */
.hr-title {
  font-size: 23px;
  line-height: 1.5;
  margin-bottom: 16px;
}
.hr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 54px 20px;
  border: 1.5px dashed #cfd9e8;
  border-radius: 10px;
  background: #f9fbfe;
  text-align: center;
}
</style>
