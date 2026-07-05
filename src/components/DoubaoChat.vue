<template>
  <div class="fixed bottom-5 right-5 z-9999 flex flex-col items-end gap-3">
    <!-- 聊天窗口 -->
    <Transition name="chat-pop">
      <div
        v-if="isOpen"
        class="w-[400px] h-[580px] max-w-[92vw] max-h-[78vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
      >
        <!-- 头部 -->
        <div
          class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shrink-0"
        >
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
            <div>
              <div class="text-sm font-semibold">豆包 AI 助手</div>
              <div class="text-xs opacity-80">{{ loading ? '思考中...' : '有问题？问豆包~' }}</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-sm"
              title="清空对话"
              @click="clearChat"
            >
              🗑
            </button>
            <button
              class="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors text-lg"
              @click="isOpen = false"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="chatContainer" class="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
          <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
            <div class="text-4xl mb-2">🤖</div>
            <div class="text-sm">你好！我是豆包 AI 助手</div>
            <div class="text-xs mt-1">有什么可以帮你的？</div>
          </div>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['flex', msg.role === 'user' ? 'justify-end' : 'justify-start']"
          >
            <div
              :class="[
                'max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
                msg.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm',
              ]"
            >
              {{ msg.content }}
            </div>
          </div>
          <div
            v-if="loading && messages.length && messages[messages.length - 1].content === ''"
            class="flex justify-start"
          >
            <div class="bg-white px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
              <div class="flex gap-1">
                <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0s" />
                <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.15s" />
                <span class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.3s" />
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区 -->
        <form class="px-3 py-2 border-t border-gray-200 bg-white shrink-0" @submit.prevent="sendMessage">
          <div class="flex gap-2 items-end">
            <input
              v-model="inputText"
              type="text"
              placeholder="输入问题... (Enter 发送)"
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="submit"
              :disabled="loading || !inputText.trim()"
              class="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              ➤
            </button>
          </div>
        </form>
      </div>
    </Transition>

    <!-- 浮动按钮 -->
    <button
      class="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-200 group"
      @click="isOpen = !isOpen"
    >
      <span v-if="!isOpen" class="text-2xl group-hover:scale-110 transition-transform">💬</span>
      <span v-else class="text-xl group-hover:scale-110 transition-transform">✕</span>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'

const API_KEY = import.meta.env.VITE_DOUBAO_API_KEY
const MODEL = import.meta.env.VITE_DOUBAO_MODEL

const isOpen = ref(false)
const messages = ref([])
const inputText = ref('')
const loading = ref(false)
const chatContainer = ref(null)

const savedMessages = localStorage.getItem('doubao_chat_messages')
if (savedMessages) {
  try {
    messages.value = JSON.parse(savedMessages)
  } catch {
    messages.value = []
  }
}

function saveMessages() {
  localStorage.setItem('doubao_chat_messages', JSON.stringify(messages.value.slice(-50)))
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  })
}

function clearChat() {
  messages.value = []
  localStorage.removeItem('doubao_chat_messages')
}

async function sendMessage() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  if (!API_KEY || !MODEL) {
    messages.value.push({
      role: 'assistant',
      content: '⚠️ 请在 vite.config.js 中配置 __DOUBAO_API_KEY__ 和 __DOUBAO_MODEL__',
    })
    return
  }

  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  loading.value = true
  scrollToBottom()

  messages.value.push({ role: 'assistant', content: '' })
  const assistantMsg = messages.value[messages.value.length - 1]

  try {
    const apiUrl = import.meta.env.DEV
      ? '/api/doubao/chat/completions'
      : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      assistantMsg.content = `❌ 请求失败: ${res.status} ${err}`
      loading.value = false
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') break
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content || ''
          assistantMsg.content += delta
          scrollToBottom()
        } catch {
          /* skip */
        }
      }
    }
  } catch (err) {
    assistantMsg.content = `❌ 网络错误: ${err.message}`
  } finally {
    loading.value = false
    saveMessages()
  }
}

watch(isOpen, (val) => {
  if (val) scrollToBottom()
})

onMounted(() => {
  if (!API_KEY || !MODEL) {
    messages.value = [{ role: 'assistant', content: '⚠️ 请在 vite.config.js 中配置 API Key 和 Model' }]
  }
})
</script>

<style scoped>
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
