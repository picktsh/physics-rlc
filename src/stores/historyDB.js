import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { createDiscreteApi } from 'naive-ui'
import { buildConfigKey } from '@/utils/quantity'
import { useRLCCalculatorStore } from '@/stores/rlcCalculator'

// store 非组件上下文,用离散 API 弹温和轻提示替代 alert
const { message } = createDiscreteApi(['message'])

// v2 键沿用(不废弃用户已存数据):2026-09 仿真记录新增 circuit(拓扑)/configKey(去重键)字段。
// 旧 v2 记录无这两项:载入时自动补齐 configKey;applyRecord 对无拓扑旧记录仅回填 params(不重建画布)。
const SIMULATION_HISTORY_KEY = 'rlc_simulation_history_v2'
const MEASURED_HISTORY_KEY = 'rlc_measured_history_v2'
const SELECTED_SIM_KEY = 'rlc_simulation_selected'
const MAX_HISTORY = 50

/**
 * 历史记录数据库 Store - 管理仿真和实测历史
 */
export const useHistoryStore = defineStore('history', () => {
  const simulationHistory = ref([])
  const measuredHistory = ref([])
  // 当前选中(已回填展示)的仿真记录 id;刷新后据此自动回填,单值持久化
  const selectedSimId = ref(null)

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
    const key = buildConfigKey(record.params)
    // 去重:命中展示层完全相同的配置则不新增,仅选中已有那条并回落提示
    const existing = simulationHistory.value.find((r) => (r.configKey || buildConfigKey(r.params)) === key)
    if (existing) {
      // 同配置再仿真:就地刷新拓扑(参数/结果由 key 定义本就一致),避免刷新回填旧拓扑丢失用户新电路
      if (record.circuit) existing.circuit = record.circuit
      saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
      setSelectedSim(existing.id)
      return { deduped: true, id: existing.id }
    }
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const newRecord = { id: Date.now(), time: now, configKey: key, ...record }
    simulationHistory.value.unshift(newRecord)
    if (simulationHistory.value.length > MAX_HISTORY) {
      simulationHistory.value = simulationHistory.value.slice(0, MAX_HISTORY)
    }
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
    setSelectedSim(newRecord.id)
    return { deduped: false, id: newRecord.id }
  }

  // 选中一条仿真记录(持久化);传 null 取消选中
  function setSelectedSim(id) {
    selectedSimId.value = id ?? null
    try {
      if (selectedSimId.value == null) localStorage.removeItem(SELECTED_SIM_KEY)
      else localStorage.setItem(SELECTED_SIM_KEY, String(selectedSimId.value))
    } catch (e) {
      console.error('Failed to save selected sim id:', e)
    }
    // 取消选中 = 无记录可依据 → 回落未仿真态,使计算结果/曲线/实时面板随之清空
    // (历史记录为唯一数据真源:清空/删除选中记录后不应残留上一次展示的数据)
    if (selectedSimId.value == null) useRLCCalculatorStore().simulated = false
  }

  // 刷新自动回填:选中记录若仍存在则整体回填(含画布拓扑),否则回落空
  function restoreSelected() {
    if (selectedSimId.value == null) return
    const rec = simulationHistory.value.find((r) => r.id === selectedSimId.value)
    if (!rec) {
      setSelectedSim(null)
      return
    }
    useRLCCalculatorStore().applyRecord(rec)
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
    const removed = simulationHistory.value[index]
    simulationHistory.value.splice(index, 1)
    saveToStorage(SIMULATION_HISTORY_KEY, simulationHistory.value)
    if (removed && removed.id === selectedSimId.value) setSelectedSim(null)
  }

  function deleteMeasuredRecord(index) {
    measuredHistory.value.splice(index, 1)
    saveToStorage(MEASURED_HISTORY_KEY, measuredHistory.value)
  }

  function clearSimulationHistory() {
    simulationHistory.value = []
    saveToStorage(SIMULATION_HISTORY_KEY, [])
    setSelectedSim(null)
  }

  function clearMeasuredHistory() {
    measuredHistory.value = []
    saveToStorage(MEASURED_HISTORY_KEY, [])
  }

  function exportHistory(key, data, prefix) {
    if (data.length === 0) {
      message.warning('暂无历史记录可保存')
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

  function importHistory(key, file, targetRef, validate) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result)
          if (!Array.isArray(parsed)) {
            reject(new Error('JSON格式不正确，需要为数组'))
            return
          }
          // 逐条校验:丢弃缺关键字段的脏记录,避免落盘后渲染/初始化抛错
          const imported = validate ? parsed.filter(validate) : parsed
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
    return importHistory(SIMULATION_HISTORY_KEY, file, simulationHistory, (it) => it?.params && it?.results)
  }

  function exportMeasuredHistory() {
    exportHistory(MEASURED_HISTORY_KEY, measuredHistory.value, 'RLC实测记录')
  }

  function importMeasuredHistory(file) {
    return importHistory(MEASURED_HISTORY_KEY, file, measuredHistory, (it) => Array.isArray(it?.data))
  }

  // 初始化时加载
  loadFromStorage(SIMULATION_HISTORY_KEY, simulationHistory)
  loadFromStorage(MEASURED_HISTORY_KEY, measuredHistory)
  // 补齐旧记录缺失的去重键(展示与去重均依赖)
  simulationHistory.value.forEach((r) => {
    if (!r.configKey) r.configKey = buildConfigKey(r.params)
  })
  // 恢复上次选中的仿真记录 id(刷新后自动回填的依据)
  try {
    const sel = localStorage.getItem(SELECTED_SIM_KEY)
    selectedSimId.value = sel != null ? Number(sel) : null
  } catch {
    selectedSimId.value = null
  }

  return {
    simulationHistory,
    measuredHistory,
    selectedSimId,
    saveSimulationRecord,
    setSelectedSim,
    restoreSelected,
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
