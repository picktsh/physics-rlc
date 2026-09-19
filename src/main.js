import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import 'virtual:uno.css'

const app = createApp(App)
// pinia 先于 router:路由守卫 beforeEach 内 useAppStore 依赖已激活的 pinia 实例
app.use(createPinia())
app.use(router)
app.mount('#app')
