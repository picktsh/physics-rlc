<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { cloneDeep } from 'lodash-es'
import ChatHeader from './DoubaoChat/ChatHeader.vue'
import ChatMessageList from './DoubaoChat/ChatMessageList.vue'
import ChatInputArea from './DoubaoChat/ChatInputArea.vue'
import { useChatSession } from './DoubaoChat/composables/useChatSession.js'
import { useChatMessage } from './DoubaoChat/composables/useChatMessage.js'

const isOpen = ref(false)
const messageListRef = ref(null)
const chatInputRef = ref(null)

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
    messageListRef.value?.scrollToBottom()
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
  chatInputRef.value?.addAttachments(attachments)
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
  <div class="fixed bottom-0 sm:bottom-5 right-0 sm:right-5 z-[1999] flex flex-col items-end gap-3">
    <!-- 聊天窗口 -->
    <Transition name="chat-pop">
      <div
        v-if="isOpen"
        class="w-[92vw] sm:w-[480px] h-[480px] sm:h-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
      >
        <!-- 头部 -->
        <ChatHeader
          :sessions="sessions"
          :current-session-index="currentSessionIndex"
          :renaming-index="renamingIndex"
          :renaming-title="renamingTitle"
          :loading="loading"
          @switch="handleSwitchSession"
          @create="handleCreateSession"
          @start-rename="startRename"
          @confirm-rename="confirmRename"
          @cancel-rename="cancelRename"
          @update:renaming-title="renamingTitle = $event"
          @delete="deleteSession"
          @close="isOpen = false"
        />

        <!-- 消息列表 -->
        <ChatMessageList
          ref="messageListRef"
          :messages="currentMessages"
          :loading="loading"
          @copy="handleCopyMessage"
        />

        <!-- 输入区 -->
        <ChatInputArea
          ref="chatInputRef"
          :loading="loading"
          @send="handleSend"
          @stop="stopGeneration"
          @file-upload="handleFileUploadEvent"
        />
      </div>
    </Transition>

    <!-- 浮动按钮 -->
    <NButton
      type="primary"
      circle
      size="large"
      class="w-14 h-14 !w-14 !h-14 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
      :bordered="false"
      style="background: linear-gradient(to right, #6366f1, #a855f7)"
      @click="isOpen = !isOpen"
    >
      <template #icon>
        <span v-if="!isOpen" class="text-2xl transition-transform group-hover:scale-110">💬</span>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
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
