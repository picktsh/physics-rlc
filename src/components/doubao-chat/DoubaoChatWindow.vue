<script setup>
import { ref } from 'vue'
import ChatHeader from './ChatHeader.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatInputArea from './ChatInputArea.vue'

// 纯视图层：会话/消息逻辑由父组件（DoubaoChat.vue）持有并透传，
// 本组件只负责渲染头部/消息/输入区，并向外暴露滚动与附件操作。
defineProps({
  sessions: { type: Array, required: true },
  currentSessionIndex: { type: Number, required: true },
  renamingIndex: { type: Number, default: -1 },
  renamingTitle: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  messages: { type: Array, required: true },
})

const emit = defineEmits([
  'switch',
  'create',
  'start-rename',
  'confirm-rename',
  'cancel-rename',
  'update:renamingTitle',
  'delete',
  'close',
  'copy',
  'send',
  'stop',
  'file-upload',
])

const messageListRef = ref(null)
const chatInputRef = ref(null)

defineExpose({
  scrollToBottom: () => messageListRef.value?.scrollToBottom(),
  addAttachments: (attachments) => chatInputRef.value?.addAttachments(attachments),
})
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <ChatHeader
      :sessions="sessions"
      :current-session-index="currentSessionIndex"
      :renaming-index="renamingIndex"
      :renaming-title="renamingTitle"
      :loading="loading"
      @switch="(idx) => emit('switch', idx)"
      @create="emit('create')"
      @start-rename="(idx) => emit('start-rename', idx)"
      @confirm-rename="(idx) => emit('confirm-rename', idx)"
      @cancel-rename="emit('cancel-rename')"
      @update:renaming-title="emit('update:renamingTitle', $event)"
      @delete="(idx) => emit('delete', idx)"
      @close="emit('close')"
    />

    <ChatMessageList
      ref="messageListRef"
      :messages="messages"
      :loading="loading"
      @copy="(text) => emit('copy', text)"
    />

    <ChatInputArea
      ref="chatInputRef"
      :loading="loading"
      @send="(payload) => emit('send', payload)"
      @stop="emit('stop')"
      @file-upload="(event) => emit('file-upload', event)"
    />
  </div>
</template>
