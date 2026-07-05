<script setup>
import { ref, nextTick } from 'vue'
import { NButton, NInput, NDropdown, NSpace, NTag } from 'naive-ui'
import { cloneDeep } from 'lodash-es'
import AttachmentPreview from './AttachmentPreview.vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['send', 'stop', 'file-upload', 'remove-attachment'])

const inputText = ref('')
const attachedFiles = ref([])
const thinkingDepth = ref('low')

// 思考深度选项
const thinkingOptions = [
  { label: '高', key: 'high' },
  { label: '中', key: 'medium' },
  { label: '低', key: 'low' },
  { label: '关闭思考', key: 'off' },
]

// 快捷指令列表
const tools = [
  {
    name: '识别手写数据',
    desc: '识别拍照中的手写数据并返回纯数字文本',
    prompt:
      '请识别这张图片中的手写数据，只返回纯数字文本（不要有任何其他符号、标点、说明文字），格式要求：每行一个数据组，用空格分隔。例如：\n2.0 5.2\n2.05 6.0\n2.1 7.3',
  },
  {
    name: '计算谐振频率',
    desc: '根据RLC参数计算谐振频率',
    prompt: '请帮我计算RLC电路的谐振频率。已知参数：R=___Ω, L=___H, C=___F。请给出计算公式和结果。',
  },
  {
    name: '计算通频带',
    desc: '计算RLC电路的通频带宽度',
    prompt: '请帮我计算RLC电路的通频带宽度。已知参数：R=___Ω, L=___H, C=___F。请给出计算公式和结果。',
  },
  {
    name: '拟合曲线分析',
    desc: '对实验数据进行曲线拟合分析',
    prompt: '请帮我对以下实验数据进行曲线拟合分析，找出最佳拟合曲线并给出拟合公式：\n\n数据：\n',
  },
  {
    name: '误差分析',
    desc: '对实验数据进行误差分析',
    prompt:
      '请帮我对以下实验数据进行误差分析，计算相对误差和绝对误差：\n\n理论值：___\n实测值：___\n\n请给出详细的误差计算过程。',
  },
  {
    name: '生成实验报告',
    desc: '根据实验数据生成完整报告',
    prompt:
      '请帮我根据以下实验数据生成一份完整的物理实验报告，包括：实验目的、实验原理、实验数据、数据处理、结果分析和结论。\n\n实验数据：\n',
  },
]

/** 快捷指令选项 */
const toolOptions = tools.map((tool, idx) => ({
  key: `tool-${idx}`,
  label: tool.name,
  props: {
    onClick: () => selectTool(tool),
  },
}))

/** 选择快捷指令 */
function selectTool(tool) {
  inputText.value = tool.prompt
  nextTick(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  })
}

/** 发送消息 */
function handleSend() {
  emit('send', {
    text: inputText.value,
    attachedFiles: cloneDeep(attachedFiles.value),
    thinkingDepth: thinkingDepth.value,
  })
  inputText.value = ''
  attachedFiles.value = []
}

/** 文件上传处理 */
async function handleFileUpload(event) {
  emit('file-upload', event)
}

/** 接收外部传入的附件 */
function addAttachments(newFiles) {
  attachedFiles.value.push(...newFiles)
}

/** Enter 发送 */
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

defineExpose({ addAttachments, inputText })
</script>

<template>
  <form class="px-3 py-2 border-t border-gray-200 bg-white shrink-0" @submit.prevent="handleSend">
    <!-- 附件预览 -->
    <AttachmentPreview
      v-if="attachedFiles.length > 0"
      :attachments="attachedFiles"
      @remove="(idx) => attachedFiles.splice(idx, 1)"
    />

    <!-- 输入框 - 使用 NInput -->
    <div class="mb-2">
      <NInput
        v-model:value="inputText"
        type="textarea"
        placeholder="输入问题... (Enter 发送, Shift+Enter 换行)"
        :autosize="{ minRows: 1, maxRows: 5 }"
        :show-count="false"
        class="chat-textarea"
        @keydown="handleKeydown"
      />
    </div>

    <!-- 工具栏 -->
    <div class="flex items-center justify-between gap-2">
      <!-- 左侧工具按钮 -->
      <NSpace align="center" :size="8">
        <!-- 添加文件按钮 -->
        <NButton size="small" secondary>
          <template #icon>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </template>
          <label class="cursor-pointer">
            添加文件
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              class="hidden"
              @change="handleFileUpload"
            />
          </label>
        </NButton>

        <!-- 快捷指令下拉 - NDropdown -->
        <NDropdown
          :options="toolOptions"
          trigger="click"
          placement="top-start"
          :style="{ maxHeight: '320px', overflowY: 'auto' }"
        >
          <NButton size="small" secondary>
            <template #icon>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </template>
            快捷指令
          </NButton>
        </NDropdown>
      </NSpace>

      <!-- 右侧功能按钮 -->
      <NSpace align="center" :size="8">
        <!-- 思考深度下拉 - NDropdown -->
        <NDropdown
          :options="thinkingOptions"
          trigger="click"
          placement="top-end"
          :value="thinkingDepth"
          @select="(key) => (thinkingDepth = key)"
        >
          <NButton size="small" :type="thinkingDepth !== 'off' ? 'primary' : 'default'" secondary>
            思考深度: {{ thinkingOptions.find((o) => o.key === thinkingDepth)?.label || '高' }}
          </NButton>
        </NDropdown>

        <!-- 停止/发送按钮 -->
        <NButton v-if="loading" type="error" circle size="large" @click="$emit('stop')">
          <template #icon>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </template>
        </NButton>
        <NButton
          v-else
          type="primary"
          circle
          size="large"
          :disabled="!inputText.trim() && attachedFiles.length === 0"
          @click="handleSend"
        >
          <template #icon>➤</template>
        </NButton>
      </NSpace>
    </div>
  </form>
</template>

<style scoped>
:deep(.chat-textarea .n-input__textarea-el) {
  border-radius: 12px;
}
</style>
