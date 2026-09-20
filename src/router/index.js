import { createRouter, createWebHashHistory } from 'vue-router'
import { navRoutes } from '@/config/nav'
import { useAppStore } from '@/stores/app'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

// 部署于 GitHub Pages(base './',无服务端 rewrite),故用 hash 模式,刷新/直达不 404
// 导航元数据单一来源于 config/nav:路由、侧栏、首页卡片共用一份,新增页面只改 nav.js
// 递归展平导航树:分组子项与顶层页面平铺为同级路由(URL 不嵌套);无组件的分组节点自身不产生路由
const flattenNav = (list) =>
  list.flatMap((r) => [...(r.component ? [r] : []), ...(r.children ? flattenNav(r.children) : [])])

const children = flattenNav(navRoutes).map((r) => ({
  path: r.path,
  name: r.name,
  component: r.component,
  meta: { title: r.label, desc: r.desc, keepAlive: !!r.keepAlive },
}))

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/lock', name: 'lock', component: () => import('@/views/home/lock.vue') },
    { path: '/', component: DefaultLayout, redirect: '/home', children },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

// OTP 门:未通过验证一律跳 /lock 并记录来路;已验证再访问 /lock 回首页
router.beforeEach((to) => {
  const app = useAppStore()
  if (!app.otpPassed && to.name !== 'lock') {
    return { name: 'lock', query: { redirect: to.fullPath } }
  }
  if (app.otpPassed && to.name === 'lock') {
    return { name: 'home' }
  }
  return true
})

export default router
