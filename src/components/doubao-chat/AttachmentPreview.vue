<script setup>
import { NButton, NTag, NIcon } from 'naive-ui'
import { Music, Document, Close } from '@vicons/carbon'

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
        <NIcon :component="Music" :size="24" />
      </NTag>
      <!-- 其他文件图标 -->
      <NTag v-else size="small" class="w-16 h-16 flex items-center justify-center">
        <NIcon :component="Document" :size="24" />
      </NTag>

      <!-- 删除按钮 -->
      <NButton
        text
        size="tiny"
        type="error"
        class="absolute -top-1 -right-1 w-5 h-5 !p-0 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        @click="emit('remove', idx)"
      >
        <NIcon :component="Close" :size="12" />
      </NButton>
    </div>
  </div>
</template>
