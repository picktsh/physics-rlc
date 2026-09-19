<script setup>
// 全宽页脚:位于主内容流之后,随页面滚动到底;宽度横跨整个视口(不受侧栏/内容列约束)。
</script>

<template>
  <footer class="w-full border-t border-[var(--line)] bg-[var(--rail-bg)] px-[clamp(14px,2.5vw,40px)] py-20px">
    <div class="mx-auto flex max-w-[1560px] flex-wrap items-center justify-center gap-8px text-12px tracking-[0.4px] text-[var(--faint)]">
      <span class="font-bold text-[var(--muted)]">基于Web栈的RLC电路虚仿平台</span>
      <span class="text-[var(--line-strong)]">·</span>
      <span>RLC 串联谐振电路实验 · 理论仿真 · 实测比对 · 误差分析</span>
    </div>
  </footer>
</template>
