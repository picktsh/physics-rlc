// 全局页面背景配色切换:白配色 / 黑配色 / 马卡龙配色 / 绿色版(Vue 绿)
// - 通过 <html data-theme="..."> 触发 styles/theme.css 中的主题变量切换
// - localStorage 持久化;index.html 首屏内联脚本会在 JS 加载前预设同款属性防止闪白
import { ref } from 'vue'

export const THEME_STORAGE_KEY = 'app-theme'

export const THEME_OPTIONS = [
  { key: 'light', label: '白配色' },
  { key: 'dark', label: '黑配色' },
  { key: 'macaron', label: '马卡龙配色' },
  { key: 'green', label: '绿色版' },
]

const VALID_KEYS = THEME_OPTIONS.map((t) => t.key)

function readStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_KEYS.includes(v) ? v : 'light'
  } catch {
    return 'light'
  }
}

const theme = ref(readStoredTheme())

function applyThemeDom(next) {
  document.documentElement.setAttribute('data-theme', next)
}

// 切换主题:写入 <html data-theme>、持久化,并广播 themechange 事件供
// canvas 绘制类组件(ChartPanel 等)按新主题色重绘
export function setTheme(next) {
  if (!VALID_KEYS.includes(next)) return
  theme.value = next
  applyThemeDom(next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    /* 无痕模式等场景忽略持久化失败 */
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }))
}

export function useTheme() {
  return { theme, themes: THEME_OPTIONS, setTheme }
}

// 模块加载即同步一次 DOM:与 index.html 内联脚本保持一致,内联脚本缺失时也能兜底
applyThemeDom(theme.value)
