<script setup>
import { NQrCode } from 'naive-ui'

// 侧栏底部站点二维码:手机扫码即打开同一站点。
// 用 naive-ui 内置 NQrCode(自带 qrcodegen,零外部依赖),任意部署 host 自适应。
// hash 路由下取 origin + pathname(# 之前部分)即为站点根,进入后由路由守卫接管。
const url = `${window.location.origin}${window.location.pathname}`
// 中心图标走 BASE_URL 相对路径,兼容 vite base:'./' 子路径部署;与 favicon logo 同源
const iconSrc = `${import.meta.env.BASE_URL}favicon.svg`
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <div class="flex w-max overflow-hidden rounded-lg bg-[var(--app-surface)] p-2">
      <n-qr-code
        :size="128"
        :value="url"
        padding="0"
        color="var(--app-brand)"
        :icon-src="iconSrc"
        type="svg"
      />
    </div>
    <span class="truncate text-xs opacity-60">手机扫码查看</span>
  </div>
</template>
