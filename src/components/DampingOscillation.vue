<template>
  <div>
    <!-- ============ RLC 阻尼振荡特性实验 · 顶部电路搭建(3D 直接拖拽) ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">电路搭建(3D 直接拖拽)</h2>

      <!-- 三栏布局(桌面):左=3D 元件库 / 中=3D 实验台 / 右=元件参数与公差;窄屏退化为单列堆叠 -->
      <div class="mt-3 lg:grid lg:grid-cols-[150px_minmax(0,1fr)_240px] lg:gap-4">
        <!-- 左栏:3D 元件库(货架式,每项为同源 3D 商品图缩略图) -->
        <div class="flex gap-2 mb-3 flex-wrap justify-center lg:flex-col lg:flex-nowrap lg:justify-start lg:mb-0">
          <div
            v-for="comp in componentTypes"
            :key="comp.type"
            draggable="true"
            :class="[
              'component-item flex flex-col items-center justify-center gap-1 p-2 border border-gray-200 rounded-xl cursor-pointer text-xs text-gray-600 transition-all lg:flex-1',
              pendingPlaceType === comp.type ? 'bg-blue-50 ring-2 ring-[#3b82f6]' : 'bg-white hover:bg-gray-100 hover:border-gray-300',
            ]"
            @dragstart="handleDragStart($event, comp.type)"
            @click="selectPaletteComponent(comp.type)"
          >
            <img
              v-if="thumbs && thumbs[comp.type]"
              :src="thumbs[comp.type]"
              draggable="false"
              alt=""
              class="w-16 h-16 object-contain pointer-events-none select-none"
            />
            <span v-else class="w-16 h-16 flex items-center justify-center text-xl font-bold text-gray-300">{{ comp.type }}</span>
            <span class="font-medium">{{ comp.name }}</span>
          </div>
        </div>

        <!-- 中栏:3D 实验台(拖入放置 / 拖动移动 / 点端点接线 / 右键删除 / 双击定位) -->
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-2 flex-wrap">
            <p class="text-[11px] text-gray-400 flex-1 min-w-[180px] leading-4">
              🖱 空白拖拽旋转视角 · 滚轮缩放 | 拖入元件放置 · 拖动元件移动 · 点端点接线 · 右键删除 · 双击元件定位参数
            </p>
            <button
              class="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-semibold shadow-sm transition-all"
              @click="onSimulate"
            >
              ⚡ 仿真
            </button>
            <button
              class="px-3 md:px-4 py-1.5 md:py-2 bg-gray-200 text-gray-600 rounded-lg text-xs md:text-sm hover:bg-gray-300 transition-all"
              @click="onReset"
            >
              🧹 清空
            </button>
          </div>
          <!-- 触摸端点选元件后,提示到台面上放置(桌面端以拖拽为主) -->
          <div v-if="pendingPlaceType" class="text-[11px] text-blue-600 bg-blue-50 rounded px-2 py-1 mb-2">
            📌 已选中「{{ typeName(pendingPlaceType) }}」:点击 3D 实验台空白处放置(再次点击库项取消)
          </div>
          <Circuit3DCanvas
            :components="store.components"
            :wires="store.wires"
            :junctions="store.junctions"
            interactive
            :pending-type="pendingPlaceType"
            empty-text="从左侧拖入元件,直接在 3D 实验台上搭建电路"
            @place="onPlace"
            @move="onMove"
            @wire="onWire"
            @delete-component="onDeleteComponent"
            @delete-wire="onDeleteWire"
            @focus-component="onFocusComponent"
            @wire-click="onWireClick"
          />
          <!-- 仿真状态条:校验失败给出原因,成功展示提取的等效参数与阻尼特征 -->
          <div
            v-if="simulation"
            :class="[
              'mt-3 border rounded-lg px-3 py-2 text-xs leading-relaxed',
              simulation.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-600',
            ]"
          >
            <div class="font-semibold">{{ simulation.success ? '✅' : '⚠️' }} {{ simulation.message }}</div>
            <div v-if="simulation.success" class="mt-1">
              等效参数:R = {{ fmt(simulation.params.R) }} Ω · L = {{ fmt(simulation.params.L) }} mH · C = {{ fmt(simulation.params.C, 3) }} μF
              · V = {{ fmt(simulation.params.V) }} V
              <span class="block mt-0.5">
                谐振频率 f₀ ≈ {{ fmt(simulation.fr, 1) }} Hz · 阻尼比 ζ ≈ {{ fmt(simulation.zeta, 3) }} →
                {{ dampingTypeLabel[simulation.dampingType] }}
              </span>
            </div>
          </div>
        </div>

        <!-- 右栏:元件参数编辑 + 公差设置(08 tab 独立一份) -->
        <div class="min-w-0">
          <!-- 元件参数编辑器(双击 3D 元件可定位到对应输入框) -->
          <div v-if="store.components.length > 0" class="mt-3 lg:mt-0">
            <div class="text-xs sm:text-sm font-semibold text-gray-700 mb-2">⚙️ 元件参数编辑</div>
            <div class="flex flex-col gap-2">
              <div
                v-for="(comp, idx) in store.components"
                :id="'damp-comp-' + idx"
                :key="idx"
                :class="[
                  'p-2 rounded-lg border-2 transition-all',
                  focusedCompIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-transparent',
                ]"
              >
                <label class="text-xs text-gray-600">{{ getComponentLabel(comp.type) }} #{{ idx + 1 }}</label>
                <div class="flex gap-1 items-center mt-1">
                  <input
                    type="number"
                    step="any"
                    :value="getCompDisplay(idx)"
                    class="w-full min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    @input="onCompInput(idx, $event)"
                    @blur="onCompBlur(idx)"
                  />
                  <span class="text-xs text-gray-500 whitespace-nowrap">{{ getComponentUnit(comp.type) }}</span>
                </div>
                <!-- 信号源波形参数(仅 V 类型展开) -->
                <div v-if="comp.type === 'V'" class="mt-2 space-y-1.5">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-gray-500 whitespace-nowrap min-w-[36px]">波形</span>
                    <select
                      :value="comp.signalWaveform || 'sine'"
                      class="flex-1 min-w-0 px-1.5 py-1 border border-gray-300 rounded text-xs"
                      @change="onSignalChange(idx, 'waveform', $event.target.value)"
                    >
                      <option value="sine">正弦波</option>
                      <option value="square">方波</option>
                    </select>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-gray-500 whitespace-nowrap min-w-[36px]">频率</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max="10000"
                      :value="comp.signalFrequency || 100"
                      class="flex-1 min-w-0 px-1.5 py-1 border border-gray-300 rounded text-xs"
                      @input="onSignalInput(idx, 'frequency', $event)"
                      @blur="onSignalBlur(idx, 'frequency', $event)"
                    />
                    <span class="text-[11px] text-gray-500 whitespace-nowrap">Hz</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-gray-500 whitespace-nowrap min-w-[36px]">周期</span>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      max="1000"
                      :value="comp.signalPeriod || 10"
                      class="flex-1 min-w-0 px-1.5 py-1 border border-gray-300 rounded text-xs"
                      @input="onSignalInput(idx, 'period', $event)"
                      @blur="onSignalBlur(idx, 'period', $event)"
                    />
                    <span class="text-[11px] text-gray-500 whitespace-nowrap">ms</span>
                  </div>
                  <div v-if="comp.signalWaveform === 'square'" class="flex items-center gap-1.5">
                    <span class="text-[11px] text-gray-500 whitespace-nowrap min-w-[36px]">占空比</span>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="90"
                      :value="comp.signalDutyCycle || 50"
                      class="flex-1 min-w-0 px-1.5 py-1 border border-gray-300 rounded text-xs"
                      @input="onSignalInput(idx, 'dutyCycle', $event)"
                      @blur="onSignalBlur(idx, 'dutyCycle', $event)"
                    />
                    <span class="text-[11px] text-gray-500 whitespace-nowrap">%</span>
                  </div>
                  <div v-if="comp.signalWaveform === 'square'" class="flex items-center gap-1.5">
                    <span class="text-[11px] text-gray-500 whitespace-nowrap min-w-[36px]">脉宽</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      :value="comp.signalPulseWidth || 5"
                      class="flex-1 min-w-0 px-1.5 py-1 border border-gray-300 rounded text-xs"
                      @input="onSignalInput(idx, 'pulseWidth', $event)"
                      @blur="onSignalBlur(idx, 'pulseWidth', $event)"
                    />
                    <span class="text-[11px] text-gray-500 whitespace-nowrap">ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-3 lg:mt-0 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 leading-5">
            拖入元件后,在此编辑元件参数;双击 3D 元件可快速定位
          </div>

          <!-- 元件公差设置(独立于 03 tab 电路搭建) -->
          <div class="mt-3 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-xs sm:text-sm font-semibold text-gray-700">🎯 元件公差</div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="toleranceEnabled" class="sr-only peer" @change="onToleranceToggle" />
                <div
                  class="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"
                ></div>
              </label>
              <span class="text-xs text-gray-500">{{ toleranceEnabled ? '已开启' : '已关闭' }}</span>
            </div>
            <div v-if="toleranceEnabled" class="flex items-center gap-3">
              <span class="text-xs text-gray-600 whitespace-nowrap">公差范围：</span>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                v-model.number="tolerancePercent"
                class="flex-1 cursor-pointer"
                @input="onToleranceChange"
              />
              <span class="text-xs font-semibold text-blue-600 min-w-[40px] text-right">±{{ tolerancePercent.toFixed(1) }}%</span>
            </div>
            <div v-if="toleranceEnabled" class="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
              💡 开启后每次仿真实物参数将在标称值的 ±{{ tolerancePercent.toFixed(1) }}% 范围内随机波动
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 阻尼状态(点击 3D 电路导线触发) ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">阻尼状态</h2>
      <div v-if="!wireClicked" class="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-4 text-center leading-5">
        🖱 点击已搭建电路中的导线,展示阻尼状态曲线
      </div>
      <div v-else class="mt-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold" :class="dampingStateColor">{{ dampingStateLabel }}</span>
          <button class="text-[11px] text-gray-400 hover:text-gray-600" @click="wireClicked = false">✕ 关闭</button>
        </div>
        <canvas ref="dampingCanvasRef" class="w-full h-[220px] sm:h-[280px] rounded-xl border border-gray-700 bg-[#1a1a2e] cursor-crosshair" @mousemove="onCanvasMove($event, 'damping')" @mouseleave="cursorTime = null; redrawAll()"></canvas>
        <!-- 坐标轴范围调节器 -->
        <div class="mt-2 flex items-center gap-3 flex-wrap">
          <span class="text-[10px] text-gray-500 font-semibold">📐 坐标范围</span>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">Y轴下限</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.1" v-model.number="axisYMinMul" class="w-14 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">×V₀</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">Y轴上限</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.1" v-model.number="axisYMaxMul" class="w-14 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">×V₀</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">X轴时长</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.001" min="0.001" v-model.number="axisXScale" class="w-16 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">s</span>
            </div>
          </div>
          <button class="text-[10px] text-gray-400 hover:text-gray-300 px-1.5 py-0.5 border border-gray-600 rounded hover:border-gray-500 transition-all" @click="resetAxisRange">↺ 重置</button>
        </div>
        <div v-if="dampingParams" class="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-5">
          <div>阻尼系数 α = R/(2L) = {{ fmt(dampingParams.alpha) }} rad/s</div>
          <div>固有角频率 ω₀ = 1/√(LC) = {{ fmt(dampingParams.omega0) }} rad/s</div>
          <div>阻尼比 ζ = α/ω₀ = {{ fmt(dampingParams.zeta, 3) }} → {{ dampingTypeLabel[simulation.dampingType] }}</div>
          <div v-if="simulation.dampingType === 'under'">阻尼振荡角频率 ωd = √(ω₀²−α²) = {{ fmt(dampingParams.omegaD) }} rad/s</div>
        </div>
      </div>
    </section>

    <!-- ============ LTspice 瞬态分析参数 (.tran) ============ -->
    <div v-if="simulation?.success" class="mb-3 rounded-xl border border-gray-700 bg-[#1a1a2e] px-4 py-3">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs font-semibold text-gray-300">📊 编辑仿真命令</span>
        <span class="font-mono text-[10px] text-gray-500">.tran</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label class="text-[10px] text-gray-400 block mb-0.5">Stop Time</label>
          <div class="flex items-center gap-1">
            <input type="number" step="any" min="0.001" v-model.number="simStopTime" class="w-full px-2 py-1 bg-[#0d0d1a] border border-gray-600 rounded text-xs text-green-400 font-mono focus:border-green-500 focus:outline-none" />
            <span class="text-[10px] text-gray-500 whitespace-nowrap">s</span>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-gray-400 block mb-0.5">开始保存数据的延迟 (Tdelay)</label>
          <div class="flex items-center gap-1">
            <input type="number" step="any" min="0" v-model.number="simTdelay" class="w-full px-2 py-1 bg-[#0d0d1a] border border-gray-600 rounded text-xs text-green-400 font-mono focus:border-green-500 focus:outline-none" />
            <span class="text-[10px] text-gray-500 whitespace-nowrap">s</span>
          </div>
        </div>
        <div>
          <label class="text-[10px] text-gray-400 block mb-0.5">最大步长</label>
          <div class="flex items-center gap-1">
            <input type="number" step="any" min="0" :value="simStopTime / 1000" disabled class="w-full px-2 py-1 bg-[#0d0d1a]/50 border border-gray-700 rounded text-xs text-gray-500 font-mono" />
            <span class="text-[10px] text-gray-600 whitespace-nowrap">s</span>
          </div>
        </div>
        <div class="flex items-end">
          <button class="w-full px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded text-xs font-semibold transition-all" @click="redrawAll">▶ 运行</button>
        </div>
      </div>
    </div>

    <!-- ============ 电容电压时域放电波形 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">电容电压时域放电波形</h2>
      <div v-if="!simulation" class="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-4 text-center leading-5">
        ⚡ 请先完成电路搭建并点击「仿真」,仿真成功后点击导线查看波形
      </div>
      <div v-else class="mt-3">
        <canvas ref="capacitorCanvasRef" class="w-full h-[220px] sm:h-[280px] rounded-xl border border-gray-700 bg-[#1a1a2e] cursor-crosshair" @mousemove="onCanvasMove($event, 'cap')" @mouseleave="cursorTime = null; redrawAll()"></canvas>
        <!-- 电容电压波形坐标轴范围调节器 -->
        <div class="mt-2 flex items-center gap-3 flex-wrap">
          <span class="text-[10px] text-gray-500 font-semibold">📐 坐标范围</span>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">Y轴下限</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.1" v-model.number="capYMinMul" class="w-14 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">×V₀</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">Y轴上限</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.1" v-model.number="capYMaxMul" class="w-14 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">×V₀</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <label class="text-[10px] text-gray-400">X轴时长</label>
            <div class="flex items-center gap-0.5">
              <input type="number" step="0.001" min="0.001" v-model.number="capXScale" class="w-16 px-1.5 py-0.5 bg-[#0d0d1a] border border-gray-600 rounded text-[10px] text-green-400 font-mono focus:border-green-500 focus:outline-none" />
              <span class="text-[10px] text-gray-500">s</span>
            </div>
          </div>
          <button class="text-[10px] text-gray-400 hover:text-gray-300 px-1.5 py-0.5 border border-gray-600 rounded hover:border-gray-500 transition-all" @click="resetCapAxisRange">↺ 重置</button>
        </div>
      </div>
    </section>

    <!-- ============ 计算模板 · 振荡周期 · 衰减系数 ============ -->
    <section class="card mb-4">
      <h2 class="sec-title">计算模板</h2>
      <div v-if="!simulation" class="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-3 text-center">
        仿真后自动展示公式与计算结果
      </div>
      <div v-else class="mt-3">
        <!-- 公式区 -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div class="bg-white/80 rounded-lg p-3 border border-blue-100">
              <div class="text-[11px] text-gray-500 mb-1">阻尼系数</div>
              <div class="font-mono text-gray-800">α = R / (2L)</div>
              <div class="text-blue-600 font-semibold mt-1">= {{ fmt(dampingParams.alpha) }} rad/s</div>
            </div>
            <div class="bg-white/80 rounded-lg p-3 border border-blue-100">
              <div class="text-[11px] text-gray-500 mb-1">固有角频率</div>
              <div class="font-mono text-gray-800">ω₀ = 1 / √(LC)</div>
              <div class="text-blue-600 font-semibold mt-1">= {{ fmt(dampingParams.omega0) }} rad/s</div>
            </div>
            <div class="bg-white/80 rounded-lg p-3 border border-blue-100">
              <div class="text-[11px] text-gray-500 mb-1">临界阻尼条件</div>
              <div class="font-mono text-gray-800">R<sub>c</sub> = 2√(L/C)</div>
              <div class="text-blue-600 font-semibold mt-1">= {{ fmt(dampingParams.Rc) }} Ω</div>
            </div>
          </div>
          <div class="mt-3 text-[11px] text-gray-500 text-center">
            阻尼判据: ζ = α/ω₀ = {{ fmt(dampingParams.zeta, 3) }} —
            ζ &lt; 1 欠阻尼(衰减振荡) | ζ = 1 临界阻尼 | ζ &gt; 1 过阻尼
          </div>
        </div>
        <!-- 振荡周期 + 瞬时值 + 衰减系数 -->
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <div class="bg-white rounded-xl border border-gray-200 p-3">
            <div class="text-xs font-semibold text-gray-700 mb-2">🔄 振荡周期</div>
            <div class="font-mono text-sm text-gray-600">T = 2π / ω<sub>d</sub></div>
            <div class="text-lg font-bold text-blue-600 mt-1">{{ fmt(dampingParams.T, 4) }} <span class="text-xs font-normal text-gray-500">s</span></div>
            <div v-if="simulation.dampingType === 'under'" class="text-[11px] text-gray-400 mt-1">ω<sub>d</sub> = {{ fmt(dampingParams.omegaD) }} rad/s</div>
            <div v-else class="text-[11px] text-amber-500 mt-1">非欠阻尼状态,无振荡周期</div>
          </div>
          <div class="flex sm:flex-col items-center justify-center gap-2 py-2">
            <div class="text-[10px] text-gray-400 uppercase tracking-wider">瞬时值</div>
            <div class="bg-gradient-to-b from-emerald-50 to-teal-50 rounded-lg px-3 py-2 border border-emerald-200 min-w-[120px] text-center">
              <div class="text-[10px] text-gray-500">u<sub>C</sub>(t)</div>
              <div class="text-sm font-bold text-emerald-700">{{ fmt(instVoltage, 4) }} <span class="text-xs font-normal">V</span></div>
              <div class="text-[10px] text-gray-400 mt-0.5">t = {{ fmt(instTime * 1000, 2) }} ms</div>
            </div>
            <input type="range" min="0" max="1000" v-model.number="instSliderValue" class="w-24 sm:w-20 cursor-pointer accent-emerald-500" />
          </div>
          <div class="bg-white rounded-xl border border-gray-200 p-3">
            <div class="text-xs font-semibold text-gray-700 mb-2">📉 衰减系数</div>
            <div class="font-mono text-sm text-gray-600">α = R / (2L)</div>
            <div class="text-lg font-bold text-orange-600 mt-1">{{ fmt(dampingParams.alpha) }} <span class="text-xs font-normal text-gray-500">rad/s</span></div>
            <div class="text-[11px] text-gray-400 mt-1">时间常数 τ = 1/α = {{ fmt(dampingParams.tau, 4) }} s</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDampingCircuitStore } from '../stores/dampingCircuit'
import Circuit3DCanvas from './Circuit3DCanvas.vue'
import { renderComponentThumbs } from '../utils/circuit3d'

// 08 tab 电路搭建:直接使用 03 tab 同款 3D 实体模型(共享 Circuit3DCanvas + circuit3d 建模模块),
// 无 2D 画布;数据为独立一份(本页 store),与 03 tab 的电路互不影响
const store = useDampingCircuitStore()

// 元件库(货架式:3D 缩略图 + 名称;拖入 3D 实验台,触摸端可点选后点台面放置)
const componentTypes = [
  { type: 'R', name: '电阻' },
  { type: 'RV', name: '变阻器' },
  { type: 'L', name: '电感' },
  { type: 'C', name: '电容' },
  { type: 'CV', name: '可调电容' },
  { type: 'V', name: '信号源' },
]
const typeNameMap = { R: '电阻', RV: '变阻器', L: '电感', C: '电容', CV: '可调电容', V: '信号源' }
function typeName(type) {
  return typeNameMap[type] || type
}

// 3D 缩略图(离屏一次性渲染,模块级缓存;失败时降级显示类型字样)
const thumbs = ref(null)
let thumbTimer = null

const pendingPlaceType = ref(null) // 触摸端:点选元件后等待点台面放置
const focusedCompIndex = ref(null) // 双击 3D 元件定位的参数项高亮
const compInputValues = ref({}) // 输入中间态(避免 parseFloat 吞掉 "0." 等小数输入过程)

// 公差(独立一份,直写本页 store)
const toleranceEnabled = ref(store.toleranceEnabled)
const tolerancePercent = ref(store.tolerancePercent)

const simulation = computed(() => store.simulation)
const dampingTypeLabel = { under: '欠阻尼(衰减振荡)', critical: '临界阻尼(不振荡)', over: '过阻尼(不振荡)' }

// ===== 阻尼状态 / 电容电压波形 =====
const dampingCanvasRef = ref(null)
const capacitorCanvasRef = ref(null)
const wireClicked = ref(false)
const instSliderValue = ref(500)

// LTspice 风格瞬态分析参数
const simStopTime = ref(0.01) // Stop Time (s)
const simTdelay = ref(0) // Time to start saving data (s)
const cursorTime = ref(null) // 光标位置对应的时间值(s)

// 阻尼状态曲线坐标轴范围调节
const axisYMinMul = ref(-0.1) // Y轴下限倍数(×V₀)
const axisYMaxMul = ref(1.2)  // Y轴上限倍数(×V₀)
const axisXScale = ref(0.01)     // X轴时长(s), 默认0.01
function resetAxisRange() {
  axisYMinMul.value = -0.1
  axisYMaxMul.value = 1.2
  axisXScale.value = 0.01
}

// 电容电压波形坐标轴范围调节
const capYMinMul = ref(0)     // Y轴下限倍数(×V₀)
const capYMaxMul = ref(1.15)  // Y轴上限倍数(×V₀)
const capXScale = ref(0.01)   // X轴时长(s), 默认0.01
function resetCapAxisRange() {
  capYMinMul.value = 0
  capYMaxMul.value = 1.15
  capXScale.value = 0.01
}

const dampingParams = computed(() => {
  if (!simulation.value || !simulation.value.success) return null
  const { R, L, C, V } = simulation.value.params
  const Lh = L * 1e-3, Cf = C * 1e-6
  const omega0 = Lh > 0 && Cf > 0 ? 1 / Math.sqrt(Lh * Cf) : 0
  const alpha = Lh > 0 ? R / (2 * Lh) : 0
  const zeta = omega0 > 0 ? alpha / omega0 : Infinity
  const omegaD = omega0 > alpha ? Math.sqrt(omega0 * omega0 - alpha * alpha) : 0
  const T = omegaD > 0 ? (2 * Math.PI) / omegaD : Infinity
  const tau = alpha > 0 ? 1 / alpha : Infinity
  const Rc = Lh > 0 && Cf > 0 ? 2 * Math.sqrt(Lh / Cf) : 0
  const sigComp = store.components.find(c => c.type === 'V')
  const signalWaveform = sigComp?.signalWaveform || 'sine'
  const signalPulseWidth = sigComp?.signalPulseWidth || 5
  return { R, L, C, V, alpha, omega0, zeta, omegaD, T, tau, Rc, dampingType: simulation.value.dampingType, signalWaveform, signalPulseWidth: signalPulseWidth * 1e-3 }
})

const dampingStateLabel = computed(() => {
  if (!dampingParams.value) return ''
  const d = dampingTypeLabel[simulation.value.dampingType] || ''
  return `当前状态: ${d} (ζ = ${fmt(dampingParams.value.zeta, 3)})`
})
const dampingStateColor = computed(() => {
  const t = simulation.value?.dampingType
  return t === 'under' ? 'text-blue-600' : t === 'critical' ? 'text-amber-600' : 'text-red-600'
})

const instTime = computed(() => {
  if (!dampingParams.value) return 0
  const T = dampingParams.value.T
  const tMax = isFinite(T) ? T * 3 : 0.01
  return (instSliderValue.value / 1000) * tMax
})
const instVoltage = computed(() => {
  if (!dampingParams.value) return 0
  return calcCapacitorVoltage(dampingParams.value, instTime.value)
})

function calcCapacitorVoltage(dp, t) {
  if (!dp || dp.V === 0) return 0
  const { alpha, omega0, omegaD, V, dampingType } = dp
  if (dampingType === 'under') return V * Math.exp(-alpha * t) * (Math.cos(omegaD * t) + (alpha / omegaD) * Math.sin(omegaD * t))
  if (dampingType === 'critical') return V * (1 + alpha * t) * Math.exp(-alpha * t)
  const beta = Math.sqrt(alpha * alpha - omega0 * omega0)
  return V * Math.exp(-alpha * t) * (Math.cosh(beta * t) + (alpha / beta) * Math.sinh(beta * t))
}

/** 阻尼状态曲线: 正弦/直流=单次阶跃响应; 方波=充电+放电两阶段响应,匹配 LTspice .tran 仿真 */
function calcDampingCurve(dp, t) {
  if (!dp || dp.V === 0) return 0
  if (dp.signalWaveform === 'square') {
    const t1 = dp.signalPulseWidth
    if (t < t1) return dp.V - calcCapacitorVoltage(dp, t)
    // 放电阶段初始条件: 阶跃响应值 = V - 自然响应值
    const Vc_step = dp.V - calcCapacitorVoltage(dp, t1)
    const dVc_step = -calcCapacitorVoltageDeriv(dp, t1)
    return calcSquareDischarge(dp, Vc_step, dVc_step, t - t1)
  }
  return dp.V - calcCapacitorVoltage(dp, t)
}

/** 电容电压导数 dVc/dt (用于计算方波下降沿时刻的电感电流 iL = -C·dVc/dt) */
function calcCapacitorVoltageDeriv(dp, t) {
  const { alpha, omega0, omegaD, V, dampingType } = dp
  if (dampingType === 'under') {
    return V * Math.exp(-alpha * t) * (-2 * alpha * Math.cos(omegaD * t) + (alpha * alpha / omegaD - omegaD) * Math.sin(omegaD * t))
  }
  if (dampingType === 'critical') {
    return V * Math.exp(-alpha * t) * (-alpha * alpha * t)
  }
  const beta = Math.sqrt(alpha * alpha - omega0 * omega0)
  return V * Math.exp(-alpha * t) * (-2 * alpha * Math.cosh(beta * t) + (alpha * alpha / beta - beta) * Math.sinh(beta * t))
}

/** 方波下降沿后的放电自然响应: 以 Vc(t1) 和 Vc'(t1) 为初始条件 */
function calcSquareDischarge(dp, Vc1, dVc1, dt) {
  if (dt <= 0) return Vc1
  const { alpha, omega0, omegaD, dampingType } = dp
  if (dampingType === 'under') {
    const A = Vc1
    const B = (dVc1 + alpha * Vc1) / omegaD
    return Math.exp(-alpha * dt) * (A * Math.cos(omegaD * dt) + B * Math.sin(omegaD * dt))
  }
  if (dampingType === 'critical') {
    const A = Vc1
    const B = dVc1 + alpha * Vc1
    return (A + B * dt) * Math.exp(-alpha * dt)
  }
  const beta = Math.sqrt(alpha * alpha - omega0 * omega0)
  const A = Vc1
  const B = (dVc1 + alpha * Vc1) / beta
  return Math.exp(-alpha * dt) * (A * Math.cosh(beta * dt) + B * Math.sinh(beta * dt))
}

// LTspice 风格时间轴计算
function getTimeScale() {
  return simStopTime.value > 0 ? simStopTime.value : 0.01
}

// 时间标签格式化(LTspice 风格: 自动选择单位)
function formatTimeLabel(t) {
  const abs = Math.abs(t)
  if (abs < 1e-6) return (t * 1e9).toFixed(1) + 'ns'
  if (abs < 1e-3) return (t * 1e6).toFixed(1) + 'μs'
  if (abs < 1) return (t * 1e3).toFixed(2) + 'ms'
  return t.toFixed(3) + 's'
}

// Canvas 光标跟踪
function onCanvasMove(event, canvasId) {
  if (!dampingParams.value) return
  const canvas = canvasId === 'damping' ? dampingCanvasRef.value : capacitorCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const padLeft = 60, padRight = 20
  const plotW = rect.width - padLeft - padRight
  const x = event.clientX - rect.left
  const ratio = (x - padLeft) / plotW
  if (ratio >= 0 && ratio <= 1) {
    cursorTime.value = simTdelay.value + ratio * getTimeScale()
    redrawAll()
  }
}

function redrawAll() {
  if (!dampingParams.value) return
  nextTick(() => {
    drawCapacitorWaveform()
    if (wireClicked.value) drawDampingCurve()
  })
}

let focusTimer = null

onMounted(() => {
  // 推迟到首帧之后:避免与主 3D 场景初始化争抢 WebGL 上下文
  thumbTimer = setTimeout(() => {
    thumbs.value = renderComponentThumbs()
  }, 30)
})

onBeforeUnmount(() => {
  clearTimeout(thumbTimer)
  clearTimeout(focusTimer)
})

function fmt(v, d = 2) {
  return Number.isFinite(v) ? Number(v).toFixed(d) : '—'
}

// ===== 元件库:HTML5 拖拽 / 触摸点选 =====
function handleDragStart(event, type) {
  event.dataTransfer.setData('componentType', type)
}
function selectPaletteComponent(type) {
  pendingPlaceType.value = pendingPlaceType.value === type ? null : type
}

// ===== 3D 交互事件:语义事件落 store,props 回流触发场景重建 =====
function onPlace({ type, x, y }) {
  store.addComponent(type, x, y)
  pendingPlaceType.value = null
}
function onMove({ index, x, y }) {
  store.moveComponent(index, x, y)
}
function onWire({ a, b }) {
  store.connectEndpoints(a, b)
}
function onDeleteComponent(index) {
  store.removeComponent(index)
  // 参数面板索引重排同步:高亮索引修正,输入中间态作废
  if (focusedCompIndex.value === index) focusedCompIndex.value = null
  else if (focusedCompIndex.value > index) focusedCompIndex.value--
  compInputValues.value = {}
}
function onDeleteWire(index) {
  store.removeWire(index)
}

// 双击 3D 元件:滚动到参数面板对应输入框并聚焦,短暂高亮提示
async function onFocusComponent(index) {
  focusedCompIndex.value = index
  compInputValues.value = {}
  await nextTick()
  const el = document.getElementById('damp-comp-' + index)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const input = el.querySelector('input')
    if (input) input.focus({ preventScroll: true })
  }
  clearTimeout(focusTimer)
  focusTimer = setTimeout(() => {
    focusedCompIndex.value = null
  }, 2000)
}

// ===== 导线点击:展示阻尼状态曲线 =====
function onWireClick(wireIndex) {
  if (!simulation.value || !simulation.value.success) return
  wireClicked.value = true
  nextTick(() => drawDampingCurve())
}

// ===== 仿真与清空 =====
function onSimulate() {
  store.simulate() // 结果写入 store.simulation,由状态条呈现
}
function onReset() {
  store.resetCircuit()
  pendingPlaceType.value = null
  focusedCompIndex.value = null
  compInputValues.value = {}
  wireClicked.value = false
}

// ===== 参数输入(中间态保留,失焦时钳制并写回) =====
function getCompDisplay(idx) {
  if (idx in compInputValues.value) return compInputValues.value[idx]
  return store.components[idx]?.value ?? ''
}
function onCompInput(idx, event) {
  compInputValues.value[idx] = event.target.value
}
function onCompBlur(idx) {
  const raw = compInputValues.value[idx]
  if (raw !== undefined) {
    store.updateComponentValue(idx, raw)
    delete compInputValues.value[idx]
  }
}

// ===== 信号源波形参数编辑 =====
const signalInputValues = ref({}) // 中间态:避免 parseFloat 吞掉小数输入过程
function onSignalChange(idx, prop, value) {
  store.updateComponentSignal(idx, prop, value)
}
function onSignalInput(idx, prop, event) {
  signalInputValues.value[`${idx}-${prop}`] = event.target.value
}
function onSignalBlur(idx, prop, event) {
  const key = `${idx}-${prop}`
  delete signalInputValues.value[key]
  store.updateComponentSignal(idx, prop, event.target.value)
}

// ===== 公差切换(与 03 tab 相同交互,数据独立) =====
function onToleranceToggle() {
  store.toleranceEnabled = toleranceEnabled.value
  if (toleranceEnabled.value) {
    store.tolerancePercent = tolerancePercent.value
  }
}
function onToleranceChange() {
  store.tolerancePercent = tolerancePercent.value
}

// ===== 元件文案(与 03 tab 一致) =====
function getComponentLabel(type) {
  const labels = { R: '电阻 R', RV: '变阻器 RV', L: '电感 L', C: '电容 C', CV: '可调电容 CV', V: '信号源 V' }
  return labels[type] || type
}
function getComponentUnit(type) {
  const units = { R: 'Ω', RV: 'Ω', L: 'mH', C: 'μF', CV: 'μF', V: 'V' }
  return units[type] || ''
}

// ===== LTspice 风格 Canvas 绘制:阻尼状态曲线 =====
function drawDampingCurve() {
  const canvas = dampingCanvasRef.value
  if (!canvas || !dampingParams.value) return
  const dp = dampingParams.value
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const W = rect.width, H = rect.height
  const pad = { top: 24, right: 20, bottom: 36, left: 60 }
  const w = W - pad.left - pad.right, h = H - pad.top - pad.bottom
  const tMax = axisXScale.value > 0 ? axisXScale.value : getTimeScale()
  const tStart = simTdelay.value
  const V0 = dp.V
  const isSquare = dp.signalWaveform === 'square'
  const yMin = V0 * axisYMinMul.value
  const yMax = V0 * axisYMaxMul.value
  const yRange = yMax - yMin || 1

  // LTspice 深色背景
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H)

  // 网格线(暗灰)
  ctx.strokeStyle = '#2a2a44'; ctx.lineWidth = 0.5
  for (let i = 0; i <= 8; i++) {
    const y = pad.top + (h / 8) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
    const x = pad.left + (w / 8) * i
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke()
  }

  // 坐标轴(亮灰)
  ctx.strokeStyle = '#555580'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.stroke()

  const N = 600
  const toX = (t) => pad.left + ((t - tStart) / tMax) * w
  const toY = (v) => pad.top + h * (1 - (v - yMin) / yRange)

  // 零线(虚线)
  const zeroY = toY(0)
  ctx.strokeStyle = '#3a3a5a'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.moveTo(pad.left, zeroY); ctx.lineTo(W - pad.right, zeroY); ctx.stroke(); ctx.setLineDash([])

  // 阶跃响应衰减包络(欠阻尼时,仅正弦/直流): V₀(1 ± e^(-αt))
  if (dp.dampingType === 'under' && !isSquare) {
    ctx.strokeStyle = 'rgba(255,160,0,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i <= N; i++) { const t = tStart + (i / N) * tMax; const env = V0 * (1 + Math.exp(-dp.alpha * t)); const x = toX(t), y = toY(env); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
    ctx.stroke()
    ctx.beginPath()
    for (let i = 0; i <= N; i++) { const t = tStart + (i / N) * tMax; const env = V0 * (1 - Math.exp(-dp.alpha * t)); const x = toX(t), y = toY(env); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
    ctx.stroke(); ctx.setLineDash([])
  }

  // 主曲线(LTspice 标志性绿色,带发光效果)
  const traceColor = dp.dampingType === 'under' ? '#00e4a0' : dp.dampingType === 'critical' ? '#ffb020' : '#ff6060'
  ctx.shadowColor = traceColor; ctx.shadowBlur = 6
  ctx.strokeStyle = traceColor; ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const t = tStart + (i / N) * tMax; const v = calcDampingCurve(dp, t)
    const x = toX(t), y = toY(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // 方波下降沿标记线
  if (isSquare) {
    const t1 = dp.signalPulseWidth
    if (t1 > tStart && t1 < tStart + tMax) {
      const x1 = toX(t1)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(x1, pad.top); ctx.lineTo(x1, H - pad.bottom); ctx.stroke(); ctx.setLineDash([])
    }
  }

  // 轴标签(LTspice 白字)
  ctx.fillStyle = '#9999bb'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
  for (let i = 0; i <= 8; i++) {
    const t = tStart + (i / 8) * tMax
    ctx.fillText(formatTimeLabel(t), pad.left + (w / 8) * i, H - pad.bottom + 14)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 8; i++) { const v = yMin + (yRange / 8) * i; ctx.fillText(v.toFixed(2), pad.left - 4, toY(v) + 3) }

  // 轴标题
  ctx.fillStyle = '#bbbbdd'; ctx.font = '11px monospace'; ctx.textAlign = 'center'
  ctx.fillText('Time (s)', W / 2, H - 4)
  ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Voltage (V)', 0, 0); ctx.restore()

  // 信号名标签(LTspice 风格:左上角彩色标签)
  ctx.fillStyle = traceColor; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'
  ctx.fillText('u(t)', pad.left + 6, pad.top + 14)

  if (dp.dampingType === 'under' && !isSquare) {
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,160,0,0.6)'; ctx.textAlign = 'right'
    ctx.fillText('V₀(1±e⁻ᵅᵗ)', W - pad.right - 4, pad.top + 14)
  }

  // 光标(LTspice 风格黄色虚线 + 读数)
  if (cursorTime.value !== null) {
    const cx = toX(cursorTime.value)
    if (cx >= pad.left && cx <= W - pad.right) {
      const cv = calcDampingCurve(dp, cursorTime.value)
      const cy = toY(cv)
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, H - pad.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(W - pad.right, cy); ctx.stroke()
      ctx.setLineDash([])
      // 光标点
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill()
      // 读数框
      const txt = `(${formatTimeLabel(cursorTime.value)}, ${cv.toFixed(4)}V)`
      const tx = cx + 10 > W - pad.right - 120 ? cx - 120 : cx + 10
      const ty = cy - 10 < pad.top + 16 ? cy + 20 : cy - 10
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(tx - 2, ty - 11, ctx.measureText(txt).width + 6, 14)
      ctx.fillStyle = '#ffd700'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
      ctx.fillText(txt, tx, ty)
    }
  }
}

// ===== LTspice 风格 Canvas 绘制:电容电压时域放电波形 =====
function drawCapacitorWaveform() {
  const canvas = capacitorCanvasRef.value
  if (!canvas || !dampingParams.value) return
  const dp = dampingParams.value
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)
  const W = rect.width, H = rect.height
  const pad = { top: 24, right: 20, bottom: 36, left: 60 }
  const w = W - pad.left - pad.right, h = H - pad.top - pad.bottom
  const tMax = capXScale.value > 0 ? capXScale.value : getTimeScale()
  const tStart = simTdelay.value
  const V0 = dp.V
  const yMin = V0 * capYMinMul.value
  const yMax = V0 * capYMaxMul.value
  const yRange = yMax - yMin || 1

  // LTspice 深色背景
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H)

  // 网格线
  ctx.strokeStyle = '#2a2a44'; ctx.lineWidth = 0.5
  for (let i = 0; i <= 8; i++) {
    const y = pad.top + (h / 8) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke()
    const x = pad.left + (w / 8) * i
    ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, H - pad.bottom); ctx.stroke()
  }

  // 坐标轴
  ctx.strokeStyle = '#555580'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, H - pad.bottom); ctx.lineTo(W - pad.right, H - pad.bottom); ctx.stroke()

  const N = 600
  const toX = (t) => pad.left + ((t - tStart) / tMax) * w
  const toY = (v) => pad.top + h * (1 - (v - yMin) / yRange)

  // 主曲线(LTspice 绿色,带发光)
  ctx.shadowColor = '#00e4a0'; ctx.shadowBlur = 6
  ctx.strokeStyle = '#00e4a0'; ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const t = tStart + (i / N) * tMax; const v = calcCapacitorVoltage(dp, t)
    const x = toX(t), y = toY(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // 瞬时值标记(红色十字 + 虚线)
  const tInst = instTime.value
  const vInst = calcCapacitorVoltage(dp, tInst)
  const ix = toX(tInst), iy = toY(vInst)
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(ix, pad.top); ctx.lineTo(ix, H - pad.bottom); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(pad.left, iy); ctx.lineTo(W - pad.right, iy); ctx.stroke()
  ctx.setLineDash([])
  // 十字标记
  ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(ix - 6, iy); ctx.lineTo(ix + 6, iy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ix, iy - 6); ctx.lineTo(ix, iy + 6); ctx.stroke()
  // 读数
  const instTxt = `(${formatTimeLabel(tInst)}, ${vInst.toFixed(4)}V)`
  const itx = ix + 10 > W - pad.right - 120 ? ix - 120 : ix + 10
  const ity = iy - 10 < pad.top + 16 ? iy + 20 : iy - 10
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(itx - 2, ity - 11, ctx.measureText(instTxt).width + 6, 14)
  ctx.fillStyle = '#ff4444'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
  ctx.fillText(instTxt, itx, ity)

  // 轴标签
  ctx.fillStyle = '#9999bb'; ctx.font = '10px monospace'; ctx.textAlign = 'center'
  for (let i = 0; i <= 8; i++) {
    const t = tStart + (i / 8) * tMax
    ctx.fillText(formatTimeLabel(t), pad.left + (w / 8) * i, H - pad.bottom + 14)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 8; i++) { const v = yMin + (yRange / 8) * i; ctx.fillText(v.toFixed(2), pad.left - 4, toY(v) + 3) }

  // 轴标题
  ctx.fillStyle = '#bbbbdd'; ctx.font = '11px monospace'; ctx.textAlign = 'center'
  ctx.fillText('Time (s)', W / 2, H - 4)
  ctx.save(); ctx.translate(12, H / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Uc (V)', 0, 0); ctx.restore()

  // 信号名标签
  ctx.fillStyle = '#00e4a0'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'
  ctx.fillText('Uc', pad.left + 6, pad.top + 14)

  // 光标
  if (cursorTime.value !== null) {
    const cx = toX(cursorTime.value)
    if (cx >= pad.left && cx <= W - pad.right) {
      const cv = calcCapacitorVoltage(dp, cursorTime.value)
      const cy = toY(cv)
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, H - pad.bottom); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(W - pad.right, cy); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill()
      const txt = `(${formatTimeLabel(cursorTime.value)}, ${cv.toFixed(4)}V)`
      const tx = cx + 10 > W - pad.right - 120 ? cx - 120 : cx + 10
      const ty = cy - 10 < pad.top + 16 ? cy + 20 : cy - 10
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(tx - 2, ty - 11, ctx.measureText(txt).width + 6, 14)
      ctx.fillStyle = '#ffd700'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
      ctx.fillText(txt, tx, ty)
    }
  }
}

// ===== Watchers:仿真/导线点击/LTspice参数变化触发重绘 =====
watch(
  () => [simulation.value, wireClicked.value],
  () => {
    if (simulation.value?.success) {
      // 仿真成功时自动计算合理的 终止时间
      if (simulation.value.success && dampingParams.value) {
        const dp = dampingParams.value
        if (dp.dampingType === 'under' && isFinite(dp.T)) {
          simStopTime.value = +(dp.T * 3).toPrecision(3)
        } else if (isFinite(dp.tau)) {
          simStopTime.value = +(dp.tau * 4).toPrecision(3)
        }
        simTdelay.value = 0
      }
      nextTick(() => {
        drawCapacitorWaveform()
        if (wireClicked.value) drawDampingCurve()
      })
    }
  }
)
watch(instSliderValue, () => {
  if (dampingParams.value) nextTick(() => drawCapacitorWaveform())
})
watch([simStopTime, simTdelay], () => {
  redrawAll()
})
watch([axisYMinMul, axisYMaxMul, axisXScale], () => {
  if (wireClicked.value) nextTick(() => drawDampingCurve())
})
watch([capYMinMul, capYMaxMul, capXScale], () => {
  nextTick(() => drawCapacitorWaveform())
})
</script>

<style scoped>
.damping-canvas-wrap canvas {
  image-rendering: auto;
}
</style>
