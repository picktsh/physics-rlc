import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'

const SIMULATION_HISTORY_KEY = 'rlc_simulation_history'
const MEASURED_HISTORY_KEY = 'rlc_measured_history'
const MAX_HISTORY = 50

/**
 * 历史记录数据库 Store - 管理仿真和实测历史
 */
export const useHistoryStore = defineStore('history', () => {
  const simulationHistory = ref([])
  const measuredHistory = ref([])

  function loadFromStorage(key, targetRef) {
    try {
      const data = localStorage.getItem(key)
      targetRef.value = data ? JSON.parse(data) : []
    } catch {
      targetRef.value = []
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  function saveSimulationRecord(record) {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newRecord = { id: Date.now(), time: now, ...record }
    simulationHistory.value.unshift(newRecord)
    if (simulationHistory.value.length > MAX_HISTORY) {
      simulationHistory.value = simulationHistory.value.slice(0, MAX_HISTORY)
    }
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
  }

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
      freqRange: `${minFreq.toFixed(4)}~${maxFreq.toFixed(4)}kHz`,
    }
    measuredHistory.value.unshift(newRecord)
    if (measuredHistory.value.length > MAX_HISTORY) {
      measuredHistory.value = measuredHistory.value.slice(0, MAX_HISTORY)
    }
    saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
  }

  function deleteSimulationRecord(index) {
    simulationHistory.value.splice(index, 1)
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
  }

  function deleteMeasuredRecord(index) {
    measuredHistory.value.splice(index, 1)
    saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
  }

  function clearSimulationHistory() {
    simulationHistory.value = []
    saveToStorage(SIMULATION_HISTORY_KEY, [])
  }

  function clearMeasuredHistory() {
    measuredHistory.value = []
    saveToStorage(MEASURED_HISTORY_KEY, [])
  }

  function exportHistory(key, data, prefix) {
    if (data.length === 0) {
      alert('暂无历史记录可保存')
      return
    }
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${prefix}_${dayjs().format('YYYYMMDD_HHmm')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function importHistory(key, file, targetRef) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result)
          if (!Array.isArray(imported)) {
            reject(new Error('JSON格式不正确，需要为数组'))
            return
          }
          const merged = [...imported, ...targetRef.value]
          const seen = {}
          const unique = []
          for (const item of merged) {
            if (!seen[item.id]) { seen[item.id] = true; unique.push(item) }
          }
          unique.sort((a, b) => b.id - a.id)
          if (unique.length > MAX_HISTORY) unique.length = MAX_HISTORY
          targetRef.value = unique
          saveToStorage(key, targetRef.value)
          resolve(unique.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.readAsText(file)
    })
  }

  function exportSimulationHistory() {
    exportHistory(SIMULATION_HISTORY_KEY, simulationHistory.value, 'RLC仿真记录')
  }

  function importSimulationHistory(file) {
    return importHistory(SIMULATION_HISTORY_KEY, file, simulationHistory)
  }

  function exportMeasuredHistory() {
    exportHistory(MEASURED_HISTORY_KEY, measuredHistory.value, 'RLC实测记录')
  }

  function importMeasuredHistory(file) {
    return importHistory(MEASURED_HISTORY_KEY, file, measuredHistory)
  }

  // 初始化时加载
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
})
