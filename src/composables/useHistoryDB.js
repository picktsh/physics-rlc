import { ref } from 'vue'
import dayjs from 'dayjs'

/**
 * 历史记录数据库管理 Composable
 */
export function useHistoryDB() {
  const SIMULATION_HISTORY_KEY = 'rlc_simulation_history'
  const MEASURED_HISTORY_KEY = 'rlc_measured_history'
  const MAX_HISTORY = 50

  // 仿真历史
  const simulationHistory = ref([])
  // 实测历史
  const measuredHistory = ref([])

  /**
   * 从 localStorage 加载数据
   */
  function loadFromStorage(key, targetRef) {
    try {
      const data = localStorage.getItem(key)
      targetRef.value = data ? JSON.parse(data) : []
    } catch (e) {
      targetRef.value = []
    }
  }

  /**
   * 保存到 localStorage
   */
  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  /**
   * 保存仿真记录
   */
  function saveSimulationRecord(record) {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newRecord = {
      id: Date.now(),
      time: now,
      ...record,
    }
    simulationHistory.value.unshift(newRecord)
    if (simulationHistory.value.length > MAX_HISTORY) {
      simulationHistory.value = simulationHistory.value.slice(0, MAX_HISTORY)
    }
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
  }

  /**
   * 保存实测记录
   */
  function saveMeasuredRecord(data) {
    if (data.length === 0) return
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const freqs = data.map(d => d.freq)
    const minFreq = Math.min(...freqs)
    const maxFreq = Math.max(...freqs)
    const newRecord = {
      id: Date.now(),
      time: now,
      data: JSON.parse(JSON.stringify(data)),
      count: data.length,
      freqRange: `${(minFreq / 1000).toFixed(4)}~${(maxFreq / 1000).toFixed(4)}kHz`,
    }
    measuredHistory.value.unshift(newRecord)
    if (measuredHistory.value.length > MAX_HISTORY) {
      measuredHistory.value = measuredHistory.value.slice(0, MAX_HISTORY)
    }
    saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
  }

  /**
   * 删除仿真记录
   */
  function deleteSimulationRecord(index) {
    simulationHistory.value.splice(index, 1)
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
  }

  /**
   * 删除实测记录
   */
  function deleteMeasuredRecord(index) {
    measuredHistory.value.splice(index, 1)
    saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
  }

  /**
   * 清空仿真历史
   */
  function clearSimulationHistory() {
    simulationHistory.value = []
    saveToStorage(SIMULATION_HISTORY_KEY, [])
  }

  /**
   * 清空实测历史
   */
  function clearMeasuredHistory() {
    measuredHistory.value = []
    saveToStorage(MEASURED_HISTORY_KEY, [])
  }

  /**
   * 导出仿真历史为JSON
   */
  function exportSimulationHistory() {
    if (simulationHistory.value.length === 0) {
      alert('暂无历史记录可保存')
      return
    }
    const jsonStr = JSON.stringify(simulationHistory.value, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fname = `RLC仿真记录_${dayjs().format('YYYYMMDD_HHmm')}.json`
    a.href = url
    a.download = fname
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 导入仿真历史JSON
   */
  function importSimulationHistory(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result)
          if (!Array.isArray(imported)) {
            reject(new Error('JSON格式不正确，需要为数组'))
            return
          }
          const merged = [...imported, ...simulationHistory.value]
          const seen = {}
          const unique = []
          for (const item of merged) {
            if (!seen[item.id]) {
              seen[item.id] = true
              unique.push(item)
            }
          }
          unique.sort((a, b) => b.id - a.id)
          if (unique.length > MAX_HISTORY) {
            unique.length = MAX_HISTORY
          }
          simulationHistory.value = unique
          saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
          resolve(unique.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsText(file)
    })
  }

  /**
   * 导出实测历史为JSON
   */
  function exportMeasuredHistory() {
    if (measuredHistory.value.length === 0) {
      alert('暂无实测历史记录可保存')
      return
    }
    const jsonStr = JSON.stringify(measuredHistory.value, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fname = `RLC实测记录_${dayjs().format('YYYYMMDD_HHmm')}.json`
    a.href = url
    a.download = fname
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 导入实测历史JSON
   */
  function importMeasuredHistory(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result)
          if (!Array.isArray(imported)) {
            reject(new Error('JSON格式不正确，需要为数组'))
            return
          }
          const merged = [...imported, ...measuredHistory.value]
          const seen = {}
          const unique = []
          for (const item of merged) {
            if (!seen[item.id]) {
              seen[item.id] = true
              unique.push(item)
            }
          }
          unique.sort((a, b) => b.id - a.id)
          if (unique.length > MAX_HISTORY) {
            unique.length = MAX_HISTORY
          }
          measuredHistory.value = unique
          saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
          resolve(unique.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsText(file)
    })
  }

  // 初始化时加载数据
  loadFromStorage(SIMULATION_HISTORY_KEY, simulationHistory)
  loadFromStorage(MEASURED_HISTORY_KEY, measuredHistory)

  return {
    simulationHistory,
    measuredHistory,
    saveSimulationRecord,
    saveMeasuredRecord,
    deleteSimulationRecord,
    deleteMeasuredRecord,
    clearSimulationHistory,
    clearMeasuredHistory,
    exportSimulationHistory,
    importSimulationHistory,
    exportMeasuredHistory,
    importMeasuredHistory,
  }
}
