<script setup>
import { NButton, NScrollbar, NTag, NEmpty } from 'naive-ui'
import MarkdownRender from 'vue-renderer-markdown'
import { ref } from 'vue'

const props = defineProps({
  messages: { type: Array, required: true },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['copy'])
const scrollbarRef = ref(null)

/** 滚动到底部 */
function scrollToBottom() {
  scrollbarRef.value?.scrollTo({ top: 999999, behavior: 'smooth' })
}

/** 复制内容 */
function handleCopy(text) {
  emit('copy', text)
}

defineExpose({ scrollToBottom })
</script>

<template>
  <NScrollbar ref="scrollbarRef" class="flex-1 bg-gray-50">
    <div class="px-4 py-3 space-y-3">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
        <NEmpty description="你好！我是豆包 AI 助手">
          <template #extra>
            <span class="text-xs">支持图片、视频、文件</span>
          </template>
        </NEmpty>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
      >
        <!-- AI 回复消息 -->
        <div v-if="msg.role === 'assistant'" class="w-full relative group">
          <div class="px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words bg-white shadow-sm border border-gray-100 rounded-bl-sm">
            <!-- 复制按钮（悬停显示） -->
            <NButton
              v-if="msg.content"
              size="tiny"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              @click="handleCopy(msg.content)"
            >
              <template #icon>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </template>
              复制
            </NButton>

            <!-- 附件预览 -->
            <div v-if="msg.attachments?.length" class="mb-2 space-y-2">
              <div v-for="(att, idx) in msg.attachments" :key="idx" class="rounded-lg overflow-hidden">
                <img v-if="att.preview" :src="att.preview" :alt="att.name" class="max-w-full max-h-48 object-contain rounded" />
                <audio v-else-if="att.isAudio" :src="att.base64" controls class="w-full" />
                <NTag v-else size="small" type="info">
                  {{ att.name }}
                </NTag>
              </div>
            </div>

            <!-- Markdown 内容 -->
            <MarkdownRender :content="msg.content" class="prose prose-sm max-w-none" />
          </div>
        </div>

        <!-- 用户消息 -->
        <div v-else class="max-w-[80%]">
          <div class="px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words bg-indigo-500 text-white rounded-br-sm">
            <!-- 附件预览 -->
            <div v-if="msg.attachments?.length" class="mb-2 space-y-2">
              <div v-for="(att, idx) in msg.attachments" :key="idx" class="rounded-lg overflow-hidden">
                <img v-if="att.preview" :src="att.preview" :alt="att.name" class="max-w-full max-h-48 object-contain rounded" />
                <audio v-else-if="att.isAudio" :src="att.base64" controls class="w-full" />
                <div v-else class="bg-white/20 px-2 py-1 rounded text-xs">
                  {{ att.name }}
                </div>
              </div>
            </div>
            <!-- 文本内容 -->
            <div class="whitespace-pre-wrap">{{ msg.content }}</div>
          </div>
        </div>
      </div>

      <!-- 加载动画 -->
      <div v-if="loading && messages.length && messages[messages.length - 1].content === ''" class="flex justify-start">
        <div class="bg-white px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
          <div class="flex gap-1">
            <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0s" />
            <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.15s" />
            <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.3s" />
          </div>
        </div>
      </div>
    </div>
  </NScrollbar>
</template>

<style scoped>
:deep(.prose) {
  font-size: 0.875rem;
  line-height: 1.6;
}
:deep(.prose pre) {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}
:deep(.prose code) {
  background: #f0f0f0;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
:deep(.prose pre code) {
  background: transparent;
  padding: 0;
}
:deep(.prose table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #e5e7eb;
  padding: 0.5rem;
  text-align: left;
}
:deep(.prose th) {
  background: #f9fafb;
  font-weight: 600;
}
:deep(.prose blockquote) {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  color: #6b7280;
  font-style: italic;
}
</style>
