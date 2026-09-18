<script setup>
// 页面背景配色开关:白配色 / 黑配色 / 马卡龙配色 三选一胶囊
// 内联于左侧目录栏(见 home/index.vue),不再悬浮固定,避免遮挡豆包窗口
import { useTheme } from '../composables/useTheme'

const { theme, themes, setTheme } = useTheme()
</script>

<template>
  <div class="theme-switch" role="radiogroup" aria-label="页面背景配色">
    <button
      v-for="t in themes"
      :key="t.key"
      type="button"
      class="ts-item"
      :class="['ts-' + t.key, { active: theme === t.key }]"
      role="radio"
      :aria-checked="theme === t.key"
      :title="'切换为' + t.label"
      @click="setTheme(t.key)"
    >
      <span class="ts-ball"></span>
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  align-self: center;
  flex-shrink: 0;
  margin-bottom: 14px;
  padding: 5px 7px;
  border-radius: 999px;
  background: var(--card-bg);
  border: 1px solid var(--line);
  box-shadow: 0 10px 26px -14px rgba(16, 24, 40, 0.45);
  transition:
    background-color 0.25s ease,
    border-color 0.25s ease;
}
.ts-item {
  width: 24px;
  height: 24px;
  padding: 2px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.ts-item:hover {
  transform: scale(1.12);
}
.ts-item:focus-visible {
  outline: 2px solid var(--navy);
  outline-offset: 2px;
}
.ts-item.active {
  box-shadow:
    0 0 0 2px var(--card-bg),
    0 0 0 4px var(--accent-solid);
}
.ts-ball {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(15, 23, 42, 0.14);
}
/* 每个圆点预览对应主题的代表色 */
.ts-light .ts-ball {
  background: linear-gradient(135deg, #ffffff 15%, #dbe6f7 85%);
}
.ts-dark .ts-ball {
  background: linear-gradient(135deg, #3c4359 0%, #0e1322 100%);
}
.ts-macaron .ts-ball {
  background: linear-gradient(135deg, #fff3b0 0%, #ffd75e 55%, #eeb01c 100%);
}
</style>
