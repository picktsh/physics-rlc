import { ref, computed, nextTick } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const CHAT_SESSIONS_KEY = 'doubao_chat_sessions'

/**
 * 聊天会话管理 composable
 * 使用 VueUse useLocalStorage 自动持久化
 */
export function useChatSession() {
  const sessions = useLocalStorage(CHAT_SESSIONS_KEY, [
    { title: '默认会话', messages: [] },
  ])

  const currentSessionIndex = ref(0)
  const renamingIndex = ref(-1)
  const renamingTitle = ref('')

  /** 当前会话消息 */
  const currentMessages = computed(() => {
    return sessions.value[currentSessionIndex.value]?.messages || []
  })

  /** 切换会话 */
  function switchSession(idx) {
    saveCurrentSession()
    currentSessionIndex.value = idx
  }

  /** 新建会话 */
  function createNewSession() {
    saveCurrentSession()
    sessions.value.push({ title: '新会话', messages: [] })
    currentSessionIndex.value = sessions.value.length - 1
  }

  /** 开始重命名 */
  function startRename(idx) {
    renamingIndex.value = idx
    renamingTitle.value = sessions.value[idx].title || ''
  }

  /** 确认重命名 */
  function confirmRename(idx) {
    if (renamingTitle.value.trim()) {
      sessions.value[idx].title = renamingTitle.value.trim()
    }
    renamingIndex.value = -1
  }

  /** 取消重命名 */
  function cancelRename() {
    renamingIndex.value = -1
  }

  /** 删除会话 */
  function deleteSession(idx) {
    if (sessions.value.length <= 1) {
      sessions.value[0].messages = []
      sessions.value[0].title = '默认会话'
      currentSessionIndex.value = 0
      return
    }
    sessions.value.splice(idx, 1)
    if (currentSessionIndex.value >= sessions.value.length) {
      currentSessionIndex.value = sessions.value.length - 1
    } else if (currentSessionIndex.value === idx) {
      currentSessionIndex.value = 0
    }
  }

  /** 保存当前会话消息到 sessions 数组 */
  function saveCurrentSession() {
    if (sessions.value[currentSessionIndex.value]) {
      // useLocalStorage 会自动同步到 localStorage
      sessions.value[currentSessionIndex.value].messages = [...currentMessages.value]
    }
  }

  /** 添加消息到当前会话 */
  function addMessage(message) {
    if (!sessions.value[currentSessionIndex.value]) {
      sessions.value[currentSessionIndex.value] = { title: '新会话', messages: [] }
    }
    sessions.value[currentSessionIndex.value].messages.push(message)
    // 第一条用户消息时自动更新标题
    if (message.role === 'user') {
      updateSessionTitle()
    }
  }

  /** 根据首条用户消息生成会话标题 */
  function updateSessionTitle() {
    const session = sessions.value[currentSessionIndex.value]
    if (!session) return

    const firstUserMsg = session.messages.find((m) => m.role === 'user')
    if (!firstUserMsg || !firstUserMsg.content) return

    let content = firstUserMsg.content

    // 快捷指令前缀映射
    const instructionMap = [
      { prefix: '请识别这张图片中的手写数据', short: '识别手写数据' },
      { prefix: '请帮我计算RLC电路的谐振频率', short: '计算谐振频率' },
      { prefix: '请帮我计算RLC电路的通频带宽度', short: '计算通频带' },
      { prefix: '请帮我对以下实验数据进行曲线拟合分析', short: '拟合曲线分析' },
      { prefix: '请帮我对以下实验数据进行误差分析', short: '误差分析' },
      { prefix: '请帮我根据以下实验数据生成一份完整的物理实验报告', short: '生成实验报告' },
    ]

    for (const { prefix, short } of instructionMap) {
      if (content.startsWith(prefix)) {
        const afterPrefix = content.slice(prefix.length).trim()
        if (afterPrefix) {
          content = afterPrefix.split('\n')[0].slice(0, 20)
        } else {
          content = short
        }
        break
      }
    }

    session.title = content.slice(0, 25) + (content.length > 25 ? '...' : '')
  }

  return {
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
  }
}
