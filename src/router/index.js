import { createRouter, createWebHashHistory } from 'vue-router'
import { navRoutes } from '@/config/nav'
import { siteName } from '@/config/site'
import { useAppStore } from '@/stores/app'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

// 部署于 GitHub Pages(base './',无服务端 rewrite),故用 hash 模式,刷新/直达不 404
// 导航元数据单一来源于 config/nav:路由、侧栏、首页卡片共用一份,新增页面只改 nav.js
// 导航树 → vue-router 路由:
// - nested 容器节点(如「数据分析」):保留 children 为其子路由,在容器内 RouterView 渲染,子路由用绝对 path 各自直达
// - 纯分组/入口节点(非 nested,如 resonance):把子项提到同级,入口页与子页平级(URL 不嵌套)
const toRoute = (r) => {
  const route = {
    path: r.path,
    name: r.name,
    component: r.component,
    meta: { title: r.label, desc: r.desc, keepAlive: !!r.keepAlive },
  }
  if (r.redirect) route.redirect = r.redirect
  if (r.nested && r.children?.length) route.children = r.children.map(toRoute)
  return route
}

const flattenNav = (list) =>
  list.flatMap((r) => {
    if (r.nested) return [toRoute(r)]
    const self = r.component ? [toRoute(r)] : []
    return [...self, ...(r.children ? flattenNav(r.children) : [])]
  })

const children = flattenNav(navRoutes)

// 隐藏路由:不在 config/nav 菜单中(与业务无关),仿 /lock 直注册;仍在 DefaultLayout 内以获得页眉/侧栏/主题切换。
const hiddenRoutes = [
  {
    path: '/playground',
    name: 'playground',
    component: () => import('@/views/playground/index.vue'),
    meta: { title: '元器件演练场', hidden: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/lock', name: 'lock', component: () => import('@/views/home/lock.vue') },
    { path: '/', component: DefaultLayout, redirect: '/home', children: [...children, ...hiddenRoutes] },
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

router.afterEach((to) => {
  // 浏览器标题单一来源于 config/site:首页只显站名,其余页面为「页面名 · 站名」
  document.title = !to.meta.title || to.name === 'home' ? siteName : `${to.meta.title} · ${siteName}`
})

export default router
