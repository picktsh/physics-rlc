// 全站导航单一数据源:路由表、侧边栏、首页卡片网格共用同一份元数据,避免多处漂移。
// 带 children 的节点为一级分组:侧栏渲染为可折叠开关(父项仅开合、不导航),
// 路由与首页卡片递归展平其子项(URL 不嵌套、卡片直达各子页面)。
// icon 直接引用 @vicons/carbon 的组件(naive-ui <n-icon :component> 消费),构建期固化、无运行时取图。
import {
  Home,
  Book,
  Video,
  Construction,
  Analytics,
  Activity,
  Filter,
  Chip,
  ChartLine,
  ChartLineSmooth,
  Document,
} from '@vicons/carbon'
import { siteName } from '@/config/site'

// keepAlive:true 的页面在布局层被 <KeepAlive> 缓存(后台扫频切走不丢进度),
// 其缓存名取自对应视图组件的 defineOptions({ name }),须与 include 列表一致。
export const navRoutes = [
  {
    name: 'home',
    path: '/home',
    label: '首页',
    icon: Home,
    desc: `${siteName} · 选择一个功能开始`,
    component: () => import('@/views/home/index.vue'),
  },
  {
    name: 'formula',
    path: '/formula',
    label: '公式原理',
    icon: Book,
    desc: '谐振原理、核心公式与不确定度评定步骤的静态速查',
    component: () => import('@/views/formula/index.vue'),
  },
  {
    name: 'video',
    path: '/video',
    label: '视频资源',
    icon: Video,
    desc: 'RLC 串联谐振相关的 B 站 / 抖音视频清单',
    component: () => import('@/views/video/index.vue'),
  },
  {
    name: 'resonance',
    path: '/resonance',
    label: 'RLC串联谐振特性实验',
    icon: ChartLineSmooth,
    desc: '串联谐振实验搭建与特性测量分析',
    component: () => import('@/views/resonance/index.vue'),
    // 实验下的四个功能模块:侧栏渲染为折叠分组,路由与首页卡片展平直达
    children: [
      {
        name: 'circuit',
        path: '/circuit',
        label: '电路搭建',
        icon: Construction,
        desc: '拖拽元件搭建 RLC 电路并进行仿真实验',
        component: () => import('@/views/circuit/index.vue'),
      },
      {
        name: 'analysis',
        path: '/analysis',
        label: '电压最大值法',
        icon: Analytics,
        desc: '计算结果、三大特性曲线、实测比对与误差分析',
        component: () => import('@/views/analysis/index.vue'),
      },
      {
        name: 'measure',
        path: '/measure',
        label: '相位差判别法',
        icon: Activity,
        desc: '李萨如图示波器判别谐振相位',
        component: () => import('@/views/measure/index.vue'),
        keepAlive: true,
      },
      {
        name: 'lc-voltage',
        path: '/lc-voltage',
        label: 'LC 电压幅值法',
        icon: Filter,
        desc: '通过 UL/UC 幅值比与相位协同判定谐振',
        component: () => import('@/views/lc-voltage/index.vue'),
        keepAlive: true,
      },
    ],
  },
  {
    name: 'damping',
    path: '/damping',
    label: 'RLC阻尼振荡特性实验',
    icon: ChartLine,
    desc: '阻尼振荡实验搭建与波形分析',
    component: () => import('@/views/damping/index.vue'),
  },
  {
    name: 'tuner',
    path: '/tuner',
    label: 'RLC工程应用',
    icon: Chip,
    desc: '心率检测与收音机调谐等工程应用演示',
    component: () => import('@/views/engineering/index.vue'),
  },
  {
    name: 'docs',
    path: '/docs',
    label: '文档中心',
    icon: Document,
    desc: '内置手册与通用 Markdown 查看器 · 支持拖入 md/zip、导出 md/doc/png/打印 PDF',
    component: () => import('@/views/docs/index.vue'),
  },
]

// KeepAlive 缓存名单:measure 由视图包装层(MeasurePage)承载,lc-voltage 直接缓存组件本体
export const keepAliveNames = ['MeasurePage', 'LCVoltageMethod']
