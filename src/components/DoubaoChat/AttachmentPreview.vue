<script setup>
import { NButton, NTag } from 'naive-ui'

const props = defineProps({
  attachments: { type: Array, required: true },
})

const emit = defineEmits(['remove'])
</script>

<template>
  <div v-if="attachments.length > 0" class="mb-2 flex flex-wrap gap-2">
    <div v-for="(file, idx) in attachments" :key="idx" class="relative group">
      <!-- 图片缩略图 -->
      <img
        v-if="file.preview"
        :src="file.preview"
        class="w-16 h-16 object-cover rounded-lg border border-gray-200"
      />
      <!-- 音频图标 -->
      <NTag v-else-if="file.isAudio" size="small" type="info" class="w-16 h-16 flex items-center justify-center">
        🎵
      </NTag>
      <!-- 其他文件图标 -->
      <NTag v-else size="small" class="w-16 h-16 flex items-center justify-center">
        📄
      </NTag>

      <!-- 删除按钮 -->
      <NButton
        text
        size="tiny"
        type="error"
        class="absolute -top-1 -right-1 w-5 h-5 !p-0 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        @click="emit('remove', idx)"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </NButton>
    </div>
  </div>
</template>
