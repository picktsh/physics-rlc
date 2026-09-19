<script setup>
import { h, ref, nextTick } from 'vue'
import {
  NDropdown,
  NButton,
  NPopover,
  NInput,
  NIcon,
  NText,
  NEllipsis,
} from 'naive-ui'
import {
  Edit,
  TrashCan,
  Add,
  Close,
  Chat,
} from '@vicons/carbon'

const props = defineProps({
  sessions: { type: Array, required: true },
  currentSessionIndex: { type: Number, required: true },
  renamingIndex: { type: Number, default: -1 },
  renamingTitle: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'switch',
  'create',
  'start-rename',
  'confirm-rename',
  'cancel-rename',
  'update:renamingTitle',
  'delete',
])

const showDropdown = ref(false)
const renameInputRef = ref(null)

/** 开始重命名时关闭下拉框，显示 Popover */
function handleStartRename(idx) {
  showDropdown.value = false
  emit('start-rename', idx)
  nextTick(() => {
    renameInputRef.value?.focus()
  })
}

/** 构建 NDropdown 选项 */
function buildOptions() {
  const options = []

  props.sessions.forEach((session, idx) => {
    const isCurrent = idx === props.currentSessionIndex
    const isRenaming = idx === props.renamingIndex

    if (isRenaming) {
      // 重命名模式 - 用 NPopover 包裹
      options.push({
        key: `rename-${idx}`,
        type: 'render',
        render: () =>
          h(NPopover, { show: true, trigger: 'manual', placement: 'right' }, {
            trigger: () =>
              h('div', { class: 'px-3 py-2 text-sm text-gray-400' }, session.title || '未命名会话'),
            default: () =>
              h('div', { class: 'flex items-center gap-2 p-1', style: 'min-width: 200px' }, [
                h(NInput, {
                  value: props.renamingTitle,
                  'onUpdate:value': (v) => emit('update:renamingTitle', v),
                  size: 'small',
                  placeholder: '输入新名称',
                  onKeydown: (e) => {
                    if (e.key === 'Enter') emit('confirm-rename', idx)
                    if (e.key === 'Escape') emit('cancel-rename')
                  },
                }),
                h(
                  NButton,
                  { size: 'tiny', type: 'primary', onClick: () => emit('confirm-rename', idx) },
                  { default: () => '确定' },
                ),
              ]),
          }),
      })
    } else {
      // 正常模式
      options.push({
        key: `session-${idx}`,
        type: 'render',
        render: () =>
          h(
            'div',
            {
              class: 'group/item flex items-center gap-1 px-1 py-1',
              style: 'cursor: pointer;',
              onClick: () => {
                showDropdown.value = false
                emit('switch', idx)
              },
            },
            [
              h(
                'div',
                { class: 'flex-1 min-w-0' },
                [
                  h(
                    NEllipsis,
                    { class: ['text-sm font-medium', isCurrent ? 'text-primary' : ''] },
                    { default: () => session.title || '未命名会话' },
                  ),
                  h(
                    NText,
                    { depth: 3, class: 'text-xs' },
                    { default: () => `${session.messages?.length || 0} 条消息` },
                  ),
                ],
              ),
              // 悬停操作按钮
              h(
                'div',
                {
                  class: 'flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0',
                  onClick: (e) => e.stopPropagation(),
                },
                [
                  h(
                    NButton,
                    {
                      text: true,
                      size: 'tiny',
                      onClick: () => handleStartRename(idx),
                    },
                    {
                      icon: () => h(NIcon, { component: Edit, size: 16 }),
                    },
                  ),
                  h(
                    NButton,
                    {
                      text: true,
                      size: 'tiny',
                      type: 'error',
                      onClick: () => {
                        showDropdown.value = false
                        emit('delete', idx)
                      },
                    },
                    {
                      icon: () => h(NIcon, { component: TrashCan, size: 16 }),
                    },
                  ),
                ],
              ),
            ],
          ),
      })
    }
  })

  // 分隔线 + 新建会话
  if (props.sessions.length > 0) {
    options.push({ key: 'divider', type: 'divider' })
  }

  options.push({
    key: 'create',
    type: 'render',
    render: () =>
      h(
        'div',
        {
          class: 'px-3 py-2 text-primary text-sm font-medium cursor-pointer hover:bg-gray-50 rounded',
          onClick: () => {
            showDropdown.value = false
            emit('create')
          },
        },
        '+ 新建会话',
      ),
  })

  return options
}
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
    <div class="flex items-center gap-2">
      <NButton quaternary circle size="small" style="color: white; background: rgba(255, 255, 255, 0.2)">
        <NIcon :component="Chat" :size="20" />
      </NButton>
      <div>
        <div class="text-sm font-semibold">豆包 AI 助手</div>
        <div class="text-xs opacity-80">{{ loading ? '思考中...' : '有问题？问豆包~' }}</div>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <!-- 历史会话下拉菜单 - 使用 NDropdown -->
      <NDropdown
        v-model:show="showDropdown"
        trigger="click"
        placement="bottom-end"
        :options="buildOptions()"
        :style="{ maxHeight: '320px', overflowY: 'auto' }"
        width="280"
      >
        <NButton quaternary circle size="medium" style="color: white; background: rgba(255, 255, 255, 0.1)">
          <template #icon>
            <NIcon :component="Add" :size="20" />
          </template>
        </NButton>
      </NDropdown>

      <!-- 关闭按钮 -->
      <NButton quaternary circle size="medium" style="color: white" @click="$emit('close')">
        <template #icon>
          <NIcon :component="Close" :size="20" />
        </template>
      </NButton>
    </div>
  </div>
</template>
