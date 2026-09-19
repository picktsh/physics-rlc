import { ref } from 'vue'
import { useMessage } from 'naive-ui'

const API_KEY = import.meta.env.VITE_DOUBAO_API_KEY
const MODEL = import.meta.env.VITE_DOUBAO_MODEL

/**
 * 聊天消息管理 composable
 */
export function useChatMessage() {
  const loading = ref(false)
  const message = useMessage()
  let abortController = null

  /** 文件转 base64 */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  /** 处理文件上传，返回附件数组 */
  async function handleFileUpload(event) {
    const files = Array.from(event.target.files || [])
    const attachments = []

    for (const file of files) {
      const base64 = await fileToBase64(file)
      attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        preview: file.type.startsWith('image/') ? base64 : null,
        isAudio: file.type.startsWith('audio/'),
      })
    }

    event.target.value = ''
    return attachments
  }

  /** 复制到剪贴板 */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
      message.success('已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
      message.error('复制失败')
    }
  }

  /** 停止生成 */
  function stopGeneration() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  /** 构建消息内容（含附件） */
  function buildMessageContent(msg) {
    if (!msg.attachments?.length) return msg.content

    const content = []
    if (msg.content) content.push({ type: 'text', text: msg.content })

    for (const att of msg.attachments) {
      if (att.type.startsWith('image/')) {
        content.push({ type: 'image_url', image_url: { url: att.base64 } })
      } else if (att.type.startsWith('video/')) {
        content.push({ type: 'video_url', video_url: { url: att.base64 } })
      } else if (att.type.startsWith('audio/')) {
        content.push({
          type: 'input_audio',
          input_audio: { data: att.base64.split(',')[1], format: 'webm' },
        })
      }
    }
    return content
  }

  /** 发送消息（流式） */
  async function sendMessage({
    text,
    attachedFiles,
    messages,
    thinkingDepth,
    addMessage,
    scrollToBottom,
  }) {
    const trimmed = text.trim()
    if ((!trimmed && attachedFiles.length === 0) || loading.value) return

    if (!API_KEY || !MODEL) {
      addMessage({
        role: 'assistant',
        content: '⚠️ 请在 .env 文件中配置 VITE_DOUBAO_API_KEY 和 VITE_DOUBAO_MODEL',
      })
      return
    }

    // 构建用户消息内容
    const userContent = []
    if (trimmed) userContent.push({ type: 'text', text: trimmed })

    for (const file of attachedFiles) {
      if (file.type.startsWith('image/')) {
        userContent.push({ type: 'image_url', image_url: { url: file.base64 } })
      } else if (file.type.startsWith('video/')) {
        userContent.push({ type: 'video_url', video_url: { url: file.base64 } })
      } else if (file.type.startsWith('audio/')) {
        userContent.push({
          type: 'input_audio',
          input_audio: { data: file.base64.split(',')[1], format: 'webm' },
        })
      } else {
        userContent.push({ type: 'text', text: `[文件: ${file.name}]` })
      }
    }

    // 显示用户消息
    addMessage({
      role: 'user',
      content: trimmed,
      attachments: [...attachedFiles],
    })

    loading.value = true
    scrollToBottom()

    // AI 回复占位
    addMessage({ role: 'assistant', content: '' })
    const assistantMsg = messages[messages.length - 1]

    abortController = new AbortController()

    try {
      const apiUrl = import.meta.env.DEV
        ? '/api/doubao/chat/completions'
        : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

      // 构建请求体
      const requestBody = {
        model: MODEL,
        messages: [
          ...messages.slice(0, -1).map((m) => ({
            role: m.role,
            content: buildMessageContent(m),
          })),
          { role: 'user', content: userContent },
        ],
        stream: true,
      }

      // 思考深度参数
      if (thinkingDepth !== 'off') {
        requestBody.thinking = {
          type: thinkingDepth === 'high' ? 'enabled' : 'disabled',
          budget_tokens:
            thinkingDepth === 'high' ? 2048 : thinkingDepth === 'medium' ? 1024 : 512,
        }
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
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
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue
          const data = trimmedLine.slice(6)
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
      if (err.name === 'AbortError') {
        assistantMsg.content += '\n\n⏹ 已停止生成'
      } else {
        assistantMsg.content = `❌ 网络错误: ${err.message}`
      }
    } finally {
      loading.value = false
      abortController = null
    }
  }

  return {
    loading,
    handleFileUpload,
    copyToClipboard,
    stopGeneration,
    sendMessage,
  }
}
