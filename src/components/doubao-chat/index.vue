<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { NButton, NModal, NIcon, useMessage } from 'naive-ui'
import { ChatBot, Close } from '@vicons/carbon'
import { cloneDeep } from 'lodash-es'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import DoubaoChatWindow from './DoubaoChatWindow.vue'
import { useChatSession } from './composables/useChatSession.js'
import { useChatMessage } from './composables/useChatMessage.js'

const isOpen = ref(false)
// 移动端（< sm 640px，与 unocss sm: 断点一致）用 NModal 全屏渲染并锁定背景滚动；PC 端保持右下角悬浮弹窗
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('sm')

// PC / 移动端各一个窗口实例（互斥渲染），操作时取当前生效的实例
const pcWindowRef = ref(null)
const mobileWindowRef = ref(null)
function activeWindow() {
  return isMobile.value ? mobileWindowRef.value : pcWindowRef.value
}

// 会话管理
const {
  sessions,
  currentSessionIndex,
  renamingIndex,
  renamingTitle,
  currentMessages,
  switchSession,
  createNewSession,
  startRename,
  confirmRename,
  cancelRename,
  deleteSession,
  saveCurrentSession,
  addMessage,
} = useChatSession()

// 消息管理
const { loading, handleFileUpload, copyToClipboard, stopGeneration, sendMessage } = useChatMessage()

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    activeWindow()?.scrollToBottom()
  })
}

// 切换会话后滚动
function handleSwitchSession(idx) {
  switchSession(idx)
  nextTick(() => scrollToBottom())
}

// 新建会话
function handleCreateSession() {
  createNewSession()
}

// 发送消息
function handleSend({ text, attachedFiles, thinkingDepth }) {
  sendMessage({
    text,
    attachedFiles,
    messages: currentMessages.value,
    thinkingDepth,
    addMessage,
    scrollToBottom,
  })
}

// 文件上传
async function handleFileUploadEvent(event) {
  const attachments = await handleFileUpload(event)
  activeWindow()?.addAttachments(attachments)
}

// 复制消息
function handleCopyMessage(text) {
  copyToClipboard(text)
}

// 消息完成后保存会话
watch(loading, (val) => {
  if (!val) {
    saveCurrentSession()
  }
})

// 打开时滚动到底部
watch(isOpen, (val) => {
  if (val) scrollToBottom()
})

// 检查 API 配置
onMounted(() => {
  const API_KEY = import.meta.env.VITE_DOUBAO_API_KEY
  const MODEL = import.meta.env.VITE_DOUBAO_MODEL
  if (!API_KEY || !MODEL) {
    addMessage({
      role: 'assistant',
      content: '⚠️ 请在 .env 文件中配置 VITE_DOUBAO_API_KEY 和 VITE_DOUBAO_MODEL',
    })
  }
})
</script>

<template>
  <div class="fixed bottom-0 sm:bottom-5 right-0 sm:right-5 z-[var(--z-float)] flex flex-col items-end gap-3">
    <!-- PC 端：右下角悬浮弹窗（保持原行为，背景不锁滚动） -->
    <Transition name="chat-pop">
      <div
        v-if="isOpen && !isMobile"
        class="w-[480px] h-[640px] max-h-[85vh] rounded-lg bg-white shadow-2xl overflow-hidden border border-gray-200"
      >
        <DoubaoChatWindow
          ref="pcWindowRef"
          :sessions="sessions"
          :current-session-index="currentSessionIndex"
          :renaming-index="renamingIndex"
          :renaming-title="renamingTitle"
          :loading="loading"
          :messages="currentMessages"
          @switch="handleSwitchSession"
          @create="handleCreateSession"
          @start-rename="startRename"
          @confirm-rename="confirmRename"
          @cancel-rename="cancelRename"
          @update:renaming-title="renamingTitle = $event"
          @delete="deleteSession"
          @close="isOpen = false"
          @copy="handleCopyMessage"
          @send="handleSend"
          @stop="stopGeneration"
          @file-upload="handleFileUploadEvent"
        />
      </div>
    </Transition>

    <!-- 移动端：naive-ui 全屏弹窗，block-scroll 自动锁定背景滚动 -->
    <NModal :show="isOpen && isMobile" :block-scroll="true" :auto-focus="false" @update:show="isOpen = $event">
      <div class="w-screen h-[100dvh] bg-white overflow-hidden">
        <DoubaoChatWindow
          ref="mobileWindowRef"
          :sessions="sessions"
          :current-session-index="currentSessionIndex"
          :renaming-index="renamingIndex"
          :renaming-title="renamingTitle"
          :loading="loading"
          :messages="currentMessages"
          @switch="handleSwitchSession"
          @create="handleCreateSession"
          @start-rename="startRename"
          @confirm-rename="confirmRename"
          @cancel-rename="cancelRename"
          @update:renaming-title="renamingTitle = $event"
          @delete="deleteSession"
          @close="isOpen = false"
          @copy="handleCopyMessage"
          @send="handleSend"
          @stop="stopGeneration"
          @file-upload="handleFileUploadEvent"
        />
      </div>
    </NModal>

    <!-- 浮动按钮：移动端打开时由 NModal 接管（头部已有关闭按钮），故移动端打开态隐藏；PC 端保留切换 -->
    <NButton
      type="primary"
      circle
      size="large"
      :class="[
        'w-14 h-14 !w-14 !h-14 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200',
        isOpen ? 'max-sm:hidden' : '',
      ]"
      :bordered="false"
      style="background: #2563eb"
      @click="isOpen = !isOpen"
    >
      <template #icon>
        <NIcon v-if="!isOpen" :component="ChatBot" :size="26" />
        <NIcon v-else :component="Close" :size="22" />
      </template>
    </NButton>
  </div>
</template>

<style scoped>
/* 聊天窗口动画 */
.chat-pop-enter-active,
.chat-pop-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.chat-pop-enter-from,
.chat-pop-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}
</style>
