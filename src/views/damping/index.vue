<template>
  <div>
    <!-- ============ RLC 阻尼振荡特性实验 · 顶部电路搭建(3D 直接拖拽) ============ -->
    <section
      :class="isFullscreen ? 'board-fs' : 'rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4'"
    >
      <h2
        class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
      >
        电路搭建(3D 直接拖拽)
      </h2>
      <!-- 操作提示:从工具栏行移到板块标题下方,腾出整行给工具按钮 -->
      <p class="-mt-2 mb-3 text-xs leading-4 text-[color:var(--app-text-faint)]">
        空白拖拽旋转视角 · 滚轮缩放 | 拖入元件放置 · 拖动元件移动 · 点端点接线 · 右键删除 · 双击元件定位参数
      </p>

      <!-- 三栏布局(桌面):左=3D 元件库 / 中=3D 实验台 / 右=元件参数与公差;窄屏退化为单列堆叠 -->
      <div class="board-grid mt-3 lg:grid lg:grid-cols-[150px_minmax(0,1fr)_240px] lg:gap-4">
        <!-- 左栏:3D 元件库(货架式);全屏时改为顶部横向滚动一排 -->
        <NScrollbar class="board-palette" :x-scrollable="isNarrow">
          <div
            class="palette flex gap-2 mb-3 flex-wrap justify-center lg:flex-col lg:flex-nowrap lg:justify-start lg:mb-0"
          >
            <div
              v-for="comp in componentTypes"
              :key="comp.type"
              draggable="true"
              :class="[
                'component-item flex flex-col items-center justify-center gap-2 p-2 border border-[color:var(--app-border)] rounded-lg cursor-pointer text-xs text-[color:var(--app-text-muted)] transition-all lg:flex-1',
                pendingPlaceType === comp.type
                  ? 'bg-[var(--app-surface-brand)] ring-2 ring-[color:var(--app-primary)]'
                  : 'bg-[var(--app-surface)] hover:bg-[var(--app-surface-muted)] hover:border-[color:var(--app-border-dark)]',
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
              <span
                v-else
                class="w-16 h-16 flex items-center justify-center text-xl font-bold text-[color:var(--app-text-faint)]"
                >{{ comp.type }}</span
              >
              <span class="font-medium">{{ comp.name }}</span>
            </div>
          </div>
        </NScrollbar>

        <!-- 中栏:3D 实验台(拖入放置 / 拖动移动 / 点端点接线 / 右键删除 / 双击定位) -->
        <div class="min-w-0">
          <!-- 触摸端点选元件后,提示到台面上放置(桌面端以拖拽为主) -->
          <div
            v-if="pendingPlaceType"
            class="text-xs text-[color:var(--app-brand)] bg-[var(--app-surface-brand)] rounded px-2 py-1 mb-2"
          >
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
          >
            <!-- 板块级操作按钮注入 3D 工具栏,与自动旋转/复位视角合并为一行(flex-wrap 支持换行) -->
            <template #actions>
              <NDropdown trigger="click" :options="presetOptions" @select="applyPreset">
                <NButton secondary>
                  <template #icon><NIcon :component="Catalog" /></template>
                  导入示例
                </NButton>
              </NDropdown>
              <NButton secondary :title="isFullscreen ? '退出全屏 (Esc)' : '全屏编辑,便于排列元件'" @click="toggle">
                <template #icon><NIcon :component="isFullscreen ? Minimize : Maximize" /></template>
                {{ isFullscreen ? '退出全屏' : '全屏' }}
              </NButton>
              <NButton secondary type="success" @click="onSimulate">
                <template #icon><NIcon :component="Flash" /></template>
                仿真
              </NButton>
              <NButton secondary type="error" @click="onReset">
                <template #icon><NIcon :component="PaintBrush" /></template>
                清空
              </NButton>
            </template>
          </Circuit3DCanvas>
          <!-- 仿真状态条:校验失败给出原因,成功展示提取的等效参数与阻尼特征 -->
          <div
            v-if="simulation"
            :class="[
              'mt-3 border rounded-lg px-3 py-2 text-xs leading-relaxed',
              simulation.success
                ? 'bg-[var(--app-success-bg)] border-[color:var(--app-success-border)] text-[color:var(--app-success)]'
                : 'bg-[var(--app-error-bg)] border-[color:var(--app-error-border)] text-[color:var(--app-error)]',
            ]"
          >
            <div class="font-semibold">{{ simulation.success ? '✅' : '⚠️' }} {{ simulation.message }}</div>
            <div v-if="simulation.success" class="mt-1">
              等效参数:R = {{ fmt(simulation.params.R, QUANTITY.R.decimals) }} {{ QUANTITY.R.unit }} · L =
              {{ fmt(simulation.params.L, QUANTITY.L.decimals) }} {{ QUANTITY.L.unit }} · C =
              {{ fmt(simulation.params.C, QUANTITY.C.decimals) }} {{ QUANTITY.C.unit }} ·
              V = {{ fmt(simulation.params.V, QUANTITY.V.decimals) }} {{ QUANTITY.V.unit }}
              <span class="block mt-0.5">
                谐振频率 f₀ ≈ {{ fmt(simulation.fr, QUANTITY.f.decimals) }} {{ QUANTITY.f.unit }} · 阻尼比 ζ ≈
                {{ fmt(simulation.zeta, QUANTITY.zeta.decimals) }} →
                {{ dampingTypeLabel[simulation.dampingType] }}
              </span>
            </div>
          </div>
        </div>

        <!-- 右栏:元件参数编辑 + 公差设置(08 tab 独立一份);全屏时隐藏(3D 视图占满,参数编辑退出全屏再做) -->
        <div v-if="!isFullscreen" class="min-w-0">
          <!-- 元件参数编辑器(双击 3D 元件可定位到对应输入框) -->
          <div v-if="store.components.length > 0">
            <div>⚙️ 元件参数编辑</div>
            <NForm label-placement="top" :show-feedback="false">
              <div class="flex flex-col gap-2">
                <div
                  v-for="(comp, idx) in store.components"
                  :id="'damp-comp-' + idx"
                  :key="idx"
                  :class="[
                    'flex flex-col gap-3 p-2 rounded-lg border-2 transition-all',
                    focusedCompIndex === idx
                      ? 'border-[color:var(--app-primary)] bg-[var(--app-surface-brand)]'
                      : 'border-transparent',
                  ]"
                >
                  <NFormItem :label="`${getComponentLabel(comp.type)} #${idx + 1}`">
                    <NInputNumber
                      :value="comp.value"
                      :show-button="false"
                      :precision="VALUE_CONFIG[comp.type]?.decimals"
                      :step="VALUE_CONFIG[comp.type]?.step ?? 1"
                      @update:value="(v) => onCompValueChange(idx, v)"
                    >
                      <template #suffix>{{ getComponentUnit(comp.type) }}</template>
                    </NInputNumber>
                  </NFormItem>
                  <!-- 信号源波形参数(仅 V 类型展开) -->
                  <template v-if="comp.type === 'V'">
                    <NFormItem label="波形">
                      <NSelect
                        :value="comp.signalWaveform || 'sine'"
                        :options="[
                          { label: '正弦波', value: 'sine' },
                          { label: '方波', value: 'square' },
                        ]"
                        @update:value="(v) => onSignalChange(idx, 'waveform', v)"
                      />
                    </NFormItem>
                    <NFormItem label="频率">
                      <NInputNumber
                        :value="comp.signalFrequency || 0.1"
                        :show-button="false"
                        :precision="QUANTITY.f.decimals"
                        :step="QUANTITY.f.step"
                        @update:value="(v) => onSignalChange(idx, 'frequency', v)"
                      >
                        <template #suffix>{{ QUANTITY.f.unit }}</template>
                      </NInputNumber>
                    </NFormItem>
                    <NFormItem label="周期">
                      <NInputNumber
                        :value="comp.signalPeriod || 10"
                        :show-button="false"
                        @update:value="(v) => onSignalChange(idx, 'period', v)"
                      >
                        <template #suffix>{{ QUANTITY.period.unit }}</template>
                      </NInputNumber>
                    </NFormItem>
                    <NFormItem v-if="comp.signalWaveform === 'square'" label="占空比">
                      <NInputNumber
                        :value="comp.signalDutyCycle || 50"
                        :show-button="false"
                        @update:value="(v) => onSignalChange(idx, 'dutyCycle', v)"
                      >
                        <template #suffix>{{ QUANTITY.duty.unit }}</template>
                      </NInputNumber>
                    </NFormItem>
                    <NFormItem v-if="comp.signalWaveform === 'square'" label="脉宽">
                      <NInputNumber
                        :value="comp.signalPulseWidth || 5"
                        :show-button="false"
                        @update:value="(v) => onSignalChange(idx, 'pulseWidth', v)"
                      >
                        <template #suffix>{{ QUANTITY.period.unit }}</template>
                      </NInputNumber>
                    </NFormItem>
                  </template>
                </div>
              </div>
            </NForm>
          </div>
          <div
            v-else
            class="mt-3 lg:mt-0 text-xs text-[color:var(--app-text-faint)] bg-[var(--app-surface-sunken)] rounded-lg px-3 py-2 leading-5"
          >
            拖入元件后,在此编辑元件参数;双击 3D 元件可快速定位
          </div>

          <!-- 元件公差设置(独立于 03 tab 电路搭建) -->
          <div class="mt-3 p-3 bg-[var(--app-surface-sunken)] rounded-lg">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-xs font-semibold text-[color:var(--app-text)]">🎯 元件公差</div>
              <NSwitch :value="toleranceEnabled" @update:value="onToleranceToggle" />
              <span class="text-xs text-[color:var(--app-text-muted)]">{{
                toleranceEnabled ? '已开启' : '已关闭'
              }}</span>
            </div>
            <div v-if="toleranceEnabled" class="flex items-center gap-3">
              <span class="text-xs text-[color:var(--app-text-muted)] whitespace-nowrap">公差范围：</span>
              <NSlider
                :value="tolerancePercent"
                :min="1"
                :max="20"
                :step="0.5"
                class="flex-1"
                @update:value="onToleranceChange"
              />
              <span class="text-xs font-semibold text-[color:var(--app-brand)] min-w-[40px] text-right"
                >±{{ tolerancePercent.toFixed(1) }}{{ QUANTITY.tol.unit }}</span
              >
            </div>
            <div
              v-if="toleranceEnabled"
              class="text-xs text-[color:var(--app-warning)] bg-[var(--app-warning-bg)] rounded px-2 py-1 mt-1"
            >
              💡 开启后每次仿真实物参数将在标称值的 ±{{ tolerancePercent.toFixed(1) }}{{ QUANTITY.tol.unit }} 范围内随机波动
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 阻尼状态(点击 3D 电路导线触发) ============ -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <h2
        class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
      >
        阻尼状态
      </h2>
      <div
        v-if="!wireClicked"
        class="mt-3 text-xs text-[color:var(--app-text-faint)] bg-[var(--app-surface-sunken)] rounded-lg px-3 py-4 text-center leading-5"
      >
        🖱 点击已搭建电路中的导线,展示阻尼状态曲线
      </div>
      <div v-else class="mt-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold" :class="dampingStateColor">{{ dampingStateLabel }}</span>
          <NButton text class="text-[color:var(--app-text-faint)]" @click="wireClicked = false">
            <NIcon :component="Close" /> 关闭
          </NButton>
        </div>
        <canvas
          ref="dampingCanvasRef"
          class="w-full h-[220px] sm:h-[280px] rounded-lg border border-gray-700 bg-[#1a1a2e] cursor-crosshair"
          @mousemove="onCanvasMove($event, 'damping')"
          @mouseleave="
            () => {
              dampingCursor = null
              redrawAll()
            }
          "
        ></canvas>
        <!-- 坐标轴范围调节器 -->
        <div class="mt-2">
          <div class="mb-1">📐 坐标范围</div>
          <NForm label-placement="top" :show-feedback="false">
            <div class="flex items-end gap-3 flex-wrap">
              <NFormItem label="Y轴下限" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="axisYMinMul" :show-button="false" :step="0.1">
                  <template #suffix>×V₀</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem label="Y轴上限" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="axisYMaxMul" :show-button="false" :step="0.1">
                  <template #suffix>×V₀</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem label="X轴时长" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="axisXScale" :show-button="false" :step="0.001" :min="0.001">
                  <template #suffix>{{ QUANTITY.t.unit }}</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem class="flex-none">
                <NButton secondary type="warning" @click="resetAxisRange">
                  <template #icon><NIcon :component="Reset" /></template>
                  重置
                </NButton>
              </NFormItem>
            </div>
          </NForm>
        </div>
        <div
          v-if="dampingParams"
          class="mt-2 text-xs text-[color:var(--app-text-muted)] bg-[var(--app-surface-sunken)] rounded-lg px-3 py-2 leading-5"
        >
          <div>阻尼系数 α = R/(2L) = {{ fmt(dampingParams.alpha) }} {{ QUANTITY.rate.unit }}</div>
          <div>固有角频率 ω₀ = 1/√(LC) = {{ fmt(dampingParams.omega0) }} {{ QUANTITY.rate.unit }}</div>
          <div>阻尼比 ζ = α/ω₀ = {{ fmt(dampingParams.zeta, QUANTITY.zeta.decimals) }} → {{ dampingTypeLabel[simulation.dampingType] }}</div>
          <div v-if="simulation.dampingType === 'under'">
            阻尼振荡角频率 ωd = √(ω₀²−α²) = {{ fmt(dampingParams.omegaD) }} {{ QUANTITY.rate.unit }}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ LTspice 瞬态分析参数 (.tran) ============ -->
    <div
      v-if="simulation?.success"
      class="mb-3 rounded-lg border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="font-semibold text-[color:var(--app-text)]">📊 编辑仿真命令</span>
        <span class="font-mono text-xs text-[color:var(--app-text-faint)]">.tran</span>
      </div>
      <NForm label-placement="top" :show-feedback="false">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NFormItem label="Stop Time">
            <NInputNumber v-model:value="simStopTime" :show-button="false" :min="0.001">
              <template #suffix>{{ QUANTITY.t.unit }}</template>
            </NInputNumber>
          </NFormItem>
          <NFormItem label="开始保存数据的延迟 (Tdelay)">
            <NInputNumber v-model:value="simTdelay" :show-button="false" :min="0">
              <template #suffix>{{ QUANTITY.t.unit }}</template>
            </NInputNumber>
          </NFormItem>
          <NFormItem label="最大步长">
            <NInputNumber :value="simStopTime / 1000" :show-button="false" disabled>
              <template #suffix>{{ QUANTITY.t.unit }}</template>
            </NInputNumber>
          </NFormItem>
          <NFormItem>
            <NButton secondary type="success" block @click="redrawAll">
              <template #icon><NIcon :component="Play" /></template>
              运行
            </NButton>
          </NFormItem>
        </div>
      </NForm>
    </div>

    <!-- ============ 电容电压时域放电波形 ============ -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <h2
        class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
      >
        电容电压时域放电波形
      </h2>
      <div
        v-if="!simulation"
        class="mt-3 text-xs text-[color:var(--app-text-faint)] bg-[var(--app-surface-sunken)] rounded-lg px-3 py-4 text-center leading-5"
      >
        ⚡ 请先完成电路搭建并点击「仿真」,仿真成功后点击导线查看波形
      </div>
      <div v-else class="mt-3">
        <canvas
          ref="capacitorCanvasRef"
          class="w-full h-[220px] sm:h-[280px] rounded-lg border border-gray-700 bg-[#1a1a2e] cursor-crosshair"
          @mousemove="onCanvasMove($event, 'cap')"
          @mouseleave="
            () => {
              capCursor = null
              redrawAll()
            }
          "
        ></canvas>
        <!-- 电容电压波形坐标轴范围调节器 -->
        <div class="mt-2">
          <div class="mb-1">📐 坐标范围</div>
          <NForm label-placement="top" :show-feedback="false">
            <div class="flex items-end gap-3 flex-wrap">
              <NFormItem label="Y轴下限" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="capYMinMul" :show-button="false" :step="0.1">
                  <template #suffix>×V₀</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem label="Y轴上限" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="capYMaxMul" :show-button="false" :step="0.1">
                  <template #suffix>×V₀</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem label="X轴时长" class="flex-1 min-w-[120px]">
                <NInputNumber v-model:value="capXScale" :show-button="false" :step="0.001" :min="0.001">
                  <template #suffix>{{ QUANTITY.t.unit }}</template>
                </NInputNumber>
              </NFormItem>
              <NFormItem class="flex-none">
                <NButton secondary type="warning" @click="resetCapAxisRange">
                  <template #icon><NIcon :component="Reset" /></template>
                  重置
                </NButton>
              </NFormItem>
            </div>
          </NForm>
        </div>
      </div>
    </section>

    <!-- ============ 计算模板 · 振荡周期 · 衰减系数 ============ -->
    <section class="rounded-lg bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow)] mb-4">
      <h2
        class="text-base font-bold leading-normal tracking-[0.5px] text-[var(--app-text)] [font-family:var(--app-font-heading)] border-l-4 border-l-[var(--app-brand)] mb-4"
      >
        计算模板
      </h2>
      <div
        v-if="!simulation"
        class="mt-3 text-xs text-[color:var(--app-text-faint)] bg-[var(--app-surface-sunken)] rounded-lg px-3 py-3 text-center"
      >
        仿真后自动展示公式与计算结果
      </div>
      <div v-else class="mt-3">
        <!-- 公式区 -->
        <div
          class="bg-[var(--app-surface-sunken)] rounded-lg p-4 border border-[color:var(--app-surface-brand-strong)]"
        >
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              class="bg-[color-mix(in_srgb,var(--app-surface),transparent_20%)] rounded-lg p-3 border border-[color:var(--app-surface-brand-strong)]"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">阻尼系数</div>
              <div class="font-mono text-[color:var(--app-text)]">α = R / (2L)</div>
              <div class="text-[color:var(--app-brand)] font-semibold mt-1">= {{ fmt(dampingParams.alpha) }} {{ QUANTITY.rate.unit }}</div>
            </div>
            <div
              class="bg-[color-mix(in_srgb,var(--app-surface),transparent_20%)] rounded-lg p-3 border border-[color:var(--app-surface-brand-strong)]"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">固有角频率</div>
              <div class="font-mono text-[color:var(--app-text)]">ω₀ = 1 / √(LC)</div>
              <div class="text-[color:var(--app-brand)] font-semibold mt-1">
                = {{ fmt(dampingParams.omega0) }} {{ QUANTITY.rate.unit }}
              </div>
            </div>
            <div
              class="bg-[color-mix(in_srgb,var(--app-surface),transparent_20%)] rounded-lg p-3 border border-[color:var(--app-surface-brand-strong)]"
            >
              <div class="text-xs text-[color:var(--app-text-muted)] mb-1">临界阻尼条件</div>
              <div class="font-mono text-[color:var(--app-text)]">R<sub>c</sub> = 2√(L/C)</div>
              <div class="text-[color:var(--app-brand)] font-semibold mt-1">= {{ fmt(dampingParams.Rc) }} {{ QUANTITY.R.unit }}</div>
            </div>
          </div>
          <div class="mt-3 text-xs text-[color:var(--app-text-muted)] text-center">
            阻尼判据: ζ = α/ω₀ = {{ fmt(dampingParams.zeta, QUANTITY.zeta.decimals) }} — ζ &lt; 1 欠阻尼(衰减振荡) | ζ = 1 临界阻尼 | ζ &gt;
            1 过阻尼
          </div>
        </div>
        <!-- 振荡周期 + 瞬时值 + 衰减系数 -->
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr] gap-3 items-stretch">
          <div class="flex-1 bg-[var(--app-surface)] rounded-lg p-2">
            <div class="font-semibold text-[color:var(--app-text)] mb-2">🔄 振荡周期</div>
            <div class="font-mono text-[color:var(--app-text-muted)]">T = 2π / ω<sub>d</sub></div>
            <div class="text-lg font-bold text-[color:var(--app-brand)] mt-1">
              {{ fmt(dampingParams.T, QUANTITY.t.decimals) }}
              <span class="text-xs font-normal text-[color:var(--app-text-muted)]">{{ QUANTITY.t.unit }}</span>
            </div>
            <div v-if="simulation.dampingType === 'under'" class="text-xs text-[color:var(--app-text-faint)] mt-1">
              ω<sub>d</sub> = {{ fmt(dampingParams.omegaD) }} {{ QUANTITY.rate.unit }}
            </div>
            <div v-else class="text-xs text-[color:var(--app-warning)] mt-1">非欠阻尼状态,无振荡周期</div>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center gap-2 p-2">
            <div class="text-xs text-[color:var(--app-text-faint)] uppercase tracking-wider">瞬时值</div>
            <div
              class="bg-gradient-to-b from-[var(--app-success-bg)] to-[var(--app-success-bg)] rounded-lg px-3 py-2 border border-[color:var(--app-success-border)] min-w-[120px] text-center"
            >
              <div class="text-xs text-[color:var(--app-text-muted)]">u<sub>C</sub>(t)</div>
              <div class="font-bold text-[color:var(--app-success)]">
                {{ fmt(instVoltage, QUANTITY.u.decimals) }} <span class="text-xs font-normal">{{ QUANTITY.u.unit }}</span>
              </div>
              <div class="text-xs text-[color:var(--app-text-faint)] mt-0.5">t = {{ fmt(instTime * 1000, 2) }} {{ QUANTITY.period.unit }}</div>
            </div>
            <NSlider v-model:value="instSliderValue" :min="0" :max="1000" class="w-24 sm:w-20" />
          </div>
          <div class="flex-1 bg-[var(--app-surface)] rounded-lg p-2">
            <div class="text-xs font-semibold text-[color:var(--app-text)] mb-2">📉 衰减系数</div>
            <div class="font-mono text-[color:var(--app-text-muted)]">α = R / (2L)</div>
            <div class="text-lg font-bold text-[color:var(--app-warning)] mt-1">
              {{ fmt(dampingParams.alpha) }}
              <span class="text-xs font-normal text-[color:var(--app-text-muted)]">{{ QUANTITY.rate.unit }}</span>
            </div>
            <div class="text-xs text-[color:var(--app-text-faint)] mt-1">
              时间常数 τ = 1/α = {{ fmt(dampingParams.tau, QUANTITY.t.decimals) }} {{ QUANTITY.t.unit }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  NIcon,
  NButton,
  NScrollbar,
  NDropdown,
  NForm,
  NFormItem,
  NInputNumber,
  NSelect,
  NSlider,
  NSwitch,
} from 'naive-ui'
import { Flash, PaintBrush, Close, Reset, Play, Maximize, Minimize, Catalog } from '@vicons/carbon'
import { CIRCUIT_PRESET_OPTIONS, findPreset } from '@/utils/circuitPresets'
import { useDampingCircuitStore } from '@/stores/dampingCircuit'
import { useFullscreenSection } from '@/composables/useFullscreenSection'
import { useMediaQuery } from '@vueuse/core'
import Circuit3DCanvas from '@/components/Circuit3DCanvas.vue'
import { renderComponentThumbs } from '@/utils/circuit3d'
import { COMPONENT_VALUE_CONFIG as VALUE_CONFIG, QUANTITY } from '@/utils/quantity'

// 08 tab 电路搭建:直接使用 03 tab 同款 3D 实体模型(共享 Circuit3DCanvas + circuit3d 建模模块),
// 无 2D 画布;数据为独立一份(本页 store),与 03 tab 的电路互不影响
const store = useDampingCircuitStore()

// 板块全屏:整块三栏工作区转 fixed 铺满视口,盖住页眉/侧栏,不受页面布局与菜单干扰(复用现有布局)
const { isFullscreen, toggle } = useFullscreenSection()
// 窄屏判定:与 lg 断点一致。<lg 时元件库本就退到顶部,全屏才改为横向滚动一排;≥lg(PC)保留左侧竖排
const isNarrow = useMediaQuery('(max-width: 1023.98px)')

// 导入示例:一键铺一套串联 RLC 布局(免手动拖放+接线),覆盖当前电路
const presetOptions = CIRCUIT_PRESET_OPTIONS
function applyPreset(id) {
  const preset = findPreset(id)
  if (!preset) return
  store.resetCircuit()
  const idxs = preset.components.map((c) => store.addComponent(c.type, c.x, c.y))
  preset.components.forEach((c, i) => {
    if (c.value != null) store.updateComponentValue(idxs[i], c.value)
  })
  for (const [a, ea, b, eb] of preset.connections) {
    store.connectEndpoints({ compIndex: idxs[a], epIndex: ea }, { compIndex: idxs[b], epIndex: eb })
  }
  pendingPlaceType.value = null
  focusedCompIndex.value = null
  wireClicked.value = false
}

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
const dampingCursor = ref(null) // { time, x, y } 阻尼状态画布光标
const capCursor = ref(null) // { time, x, y } 电容电压画布光标

// 阻尼状态曲线坐标轴范围调节
const axisYMinMul = ref(-0.1) // Y轴下限倍数(×V₀)
const axisYMaxMul = ref(1.2) // Y轴上限倍数(×V₀)
const axisXScale = ref(0.01) // X轴时长(s), 默认0.01
function resetAxisRange() {
  axisYMinMul.value = -0.1
  axisYMaxMul.value = 1.2
  axisXScale.value = 0.01
}

// 电容电压波形坐标轴范围调节
const capYMinMul = ref(0) // Y轴下限倍数(×V₀)
const capYMaxMul = ref(1.15) // Y轴上限倍数(×V₀)
const capXScale = ref(0.01) // X轴时长(s), 默认0.01
function resetCapAxisRange() {
  capYMinMul.value = 0
  capYMaxMul.value = 1.15
  capXScale.value = 0.01
}

const dampingParams = computed(() => {
  if (!simulation.value || !simulation.value.success) return null
  const { R, L, C, V } = simulation.value.params
  const Cf = C * 1e-6
  const omega0 = L > 0 && Cf > 0 ? 1 / Math.sqrt(L * Cf) : 0
  const alpha = L > 0 ? R / (2 * L) : 0
  const zeta = omega0 > 0 ? alpha / omega0 : Infinity
  const omegaD = omega0 > alpha ? Math.sqrt(omega0 * omega0 - alpha * alpha) : 0
  const T = omegaD > 0 ? (2 * Math.PI) / omegaD : Infinity
  const tau = alpha > 0 ? 1 / alpha : Infinity
  const Rc = L > 0 && Cf > 0 ? 2 * Math.sqrt(L / Cf) : 0
  const sigComp = store.components.find((c) => c.type === 'V')
  const signalWaveform = sigComp?.signalWaveform || 'sine'
  const signalPulseWidth = sigComp?.signalPulseWidth || 5
  return {
    R,
    L,
    C,
    V,
    alpha,
    omega0,
    zeta,
    omegaD,
    T,
    tau,
    Rc,
    dampingType: simulation.value.dampingType,
    signalWaveform,
    signalPulseWidth: signalPulseWidth * 1e-3,
  }
})

const dampingStateLabel = computed(() => {
  if (!dampingParams.value) return ''
  const d = dampingTypeLabel[simulation.value.dampingType] || ''
  return `当前状态: ${d} (ζ = ${fmt(dampingParams.value.zeta, QUANTITY.zeta.decimals)})`
})
const dampingStateColor = computed(() => {
  const t = simulation.value?.dampingType
  return t === 'under'
    ? 'text-[color:var(--app-brand)]'
    : t === 'critical'
      ? 'text-[color:var(--app-warning)]'
      : 'text-[color:var(--app-error)]'
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
  if (dampingType === 'under')
    return V * Math.exp(-alpha * t) * (Math.cos(omegaD * t) + (alpha / omegaD) * Math.sin(omegaD * t))
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
    return (
      V *
      Math.exp(-alpha * t) *
      (-2 * alpha * Math.cos(omegaD * t) + ((alpha * alpha) / omegaD - omegaD) * Math.sin(omegaD * t))
    )
  }
  if (dampingType === 'critical') {
    return V * Math.exp(-alpha * t) * (-alpha * alpha * t)
  }
  const beta = Math.sqrt(alpha * alpha - omega0 * omega0)
  return (
    V *
    Math.exp(-alpha * t) *
    (-2 * alpha * Math.cosh(beta * t) + ((alpha * alpha) / beta - beta) * Math.sinh(beta * t))
  )
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

// Canvas 光标跟踪(各画布独立:仅当前悬停画布显示光标,光标与波形交点即为查询数据点)
function onCanvasMove(event, canvasId) {
  if (!dampingParams.value) return
  const canvas = canvasId === 'damping' ? dampingCanvasRef.value : capacitorCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const padLeft = 60,
    padRight = 20,
    padTop = 24,
    padBottom = 36
  const plotW = rect.width - padLeft - padRight
  const mx = event.clientX - rect.left
  const my = event.clientY - rect.top
  const ratio = (mx - padLeft) / plotW
  if (ratio >= 0 && ratio <= 1 && my >= padTop && my <= rect.height - padBottom) {
    // 使用各画布实际显示的时间轴范围计算光标时间,确保交点与波形一致
    const displayTMax =
      canvasId === 'damping'
        ? axisXScale.value > 0
          ? axisXScale.value
          : getTimeScale()
        : capXScale.value > 0
          ? capXScale.value
          : getTimeScale()
    const t = simTdelay.value + ratio * displayTMax
    if (canvasId === 'damping') {
      dampingCursor.value = { time: t }
      capCursor.value = null
    } else {
      capCursor.value = { time: t }
      dampingCursor.value = null
    }
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
  // 参数面板索引重排同步:高亮索引修正
  if (focusedCompIndex.value === index) focusedCompIndex.value = null
  else if (focusedCompIndex.value > index) focusedCompIndex.value--
}
function onDeleteWire(index) {
  store.removeWire(index)
}

// 双击 3D 元件:滚动到参数面板对应输入框并聚焦,短暂高亮提示
async function onFocusComponent(index) {
  focusedCompIndex.value = index
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
  wireClicked.value = false
}

// ===== 参数输入(存储单位=展示单位零换算,直接写 store;量程钳制交由 store.updateComponentValue) =====
function onCompValueChange(idx, num) {
  store.updateComponentValue(idx, num)
}

// ===== 信号源波形参数编辑(频率/周期/占空比/脉宽经 store 双向同步) =====
function onSignalChange(idx, prop, value) {
  store.updateComponentSignal(idx, prop, value)
}

// ===== 公差切换(与 03 tab 相同交互,数据独立) =====
function onToleranceToggle(val) {
  toleranceEnabled.value = val
  store.toleranceEnabled = val
  if (val) {
    store.tolerancePercent = tolerancePercent.value
  }
}
function onToleranceChange(val) {
  tolerancePercent.value = val
  store.tolerancePercent = val
}

// ===== 元件文案(与 03 tab 一致) =====
function getComponentLabel(type) {
  const labels = { R: '电阻 R', RV: '变阻器 RV', L: '电感 L', C: '电容 C', CV: '可调电容 CV', V: '信号源 V' }
  return labels[type] || type
}
function getComponentUnit(type) {
  return VALUE_CONFIG[type]?.unit || ''
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
  const W = rect.width,
    H = rect.height
  const pad = { top: 24, right: 20, bottom: 36, left: 60 }
  const w = W - pad.left - pad.right,
    h = H - pad.top - pad.bottom
  const tMax = axisXScale.value > 0 ? axisXScale.value : getTimeScale()
  const tStart = simTdelay.value
  const V0 = dp.V
  const isSquare = dp.signalWaveform === 'square'
  const yMin = V0 * axisYMinMul.value
  const yMax = V0 * axisYMaxMul.value
  const yRange = yMax - yMin || 1

  // LTspice 深色背景
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  // 网格线(暗灰)
  ctx.strokeStyle = '#2a2a44'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 8; i++) {
    const y = pad.top + (h / 8) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(W - pad.right, y)
    ctx.stroke()
    const x = pad.left + (w / 8) * i
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, H - pad.bottom)
    ctx.stroke()
  }

  // 坐标轴(亮灰)
  ctx.strokeStyle = '#555580'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, H - pad.bottom)
  ctx.lineTo(W - pad.right, H - pad.bottom)
  ctx.stroke()

  const N = 600
  const toX = (t) => pad.left + ((t - tStart) / tMax) * w
  const toY = (v) => pad.top + h * (1 - (v - yMin) / yRange)

  // 零线(虚线)
  const zeroY = toY(0)
  ctx.strokeStyle = '#3a3a5a'
  ctx.lineWidth = 0.5
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(pad.left, zeroY)
  ctx.lineTo(W - pad.right, zeroY)
  ctx.stroke()
  ctx.setLineDash([])

  // 阶跃响应衰减包络(欠阻尼时,仅正弦/直流): V₀(1 ± e^(-αt))
  if (dp.dampingType === 'under' && !isSquare) {
    ctx.strokeStyle = 'rgba(255,160,0,0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const t = tStart + (i / N) * tMax
      const env = V0 * (1 + Math.exp(-dp.alpha * t))
      const x = toX(t),
        y = toY(env)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.beginPath()
    for (let i = 0; i <= N; i++) {
      const t = tStart + (i / N) * tMax
      const env = V0 * (1 - Math.exp(-dp.alpha * t))
      const x = toX(t),
        y = toY(env)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 主曲线(LTspice 标志性绿色,带发光效果)
  const traceColor = dp.dampingType === 'under' ? '#00e4a0' : dp.dampingType === 'critical' ? '#ffb020' : '#ff6060'
  ctx.shadowColor = traceColor
  ctx.shadowBlur = 6
  ctx.strokeStyle = traceColor
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const t = tStart + (i / N) * tMax
    const v = calcDampingCurve(dp, t)
    const x = toX(t),
      y = toY(v)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // 方波下降沿标记线
  if (isSquare) {
    const t1 = dp.signalPulseWidth
    if (t1 > tStart && t1 < tStart + tMax) {
      const x1 = toX(t1)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(x1, pad.top)
      ctx.lineTo(x1, H - pad.bottom)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // 轴标签(LTspice 白字)
  ctx.fillStyle = '#9999bb'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 8; i++) {
    const t = tStart + (i / 8) * tMax
    ctx.fillText(formatTimeLabel(t), pad.left + (w / 8) * i, H - pad.bottom + 14)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 8; i++) {
    const v = yMin + (yRange / 8) * i
    ctx.fillText(v.toFixed(2), pad.left - 4, toY(v) + 3)
  }

  // 轴标题
  ctx.fillStyle = '#bbbbdd'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Time (' + QUANTITY.t.unit + ')', W / 2, H - 4)
  ctx.save()
  ctx.translate(12, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Voltage (' + QUANTITY.u.unit + ')', 0, 0)
  ctx.restore()

  // 信号名标签(LTspice 风格:左上角彩色标签)
  ctx.fillStyle = traceColor
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('u(t)', pad.left + 6, pad.top + 14)

  if (dp.dampingType === 'under' && !isSquare) {
    ctx.font = '9px monospace'
    ctx.fillStyle = 'rgba(255,160,0,0.6)'
    ctx.textAlign = 'right'
    ctx.fillText('V₀(1±e⁻ᵅᵗ)', W - pad.right - 4, pad.top + 14)
  }

  // 光标(仅当本画布处于悬停状态时显示,吸附到曲线数据点)
  if (dampingCursor.value !== null) {
    const ct = dampingCursor.value.time
    const cx = toX(ct)
    const cv = calcDampingCurve(dp, ct)
    const cy = toY(cv)
    // 竖直虚线(跟随光标 x)
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(cx, pad.top)
    ctx.lineTo(cx, H - pad.bottom)
    ctx.stroke()
    // 水平虚线(吸附到曲线 y)
    ctx.beginPath()
    ctx.moveTo(pad.left, cy)
    ctx.lineTo(W - pad.right, cy)
    ctx.stroke()
    ctx.setLineDash([])
    // 曲线上的数据点
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI)
    ctx.fill()
    // 读数框
    const txt = `(${formatTimeLabel(ct)}, ${cv.toFixed(QUANTITY.u.decimals)}${QUANTITY.u.unit})`
    const tx = cx + 10 > W - pad.right - 120 ? cx - 120 : cx + 10
    const ty = cy - 10 < pad.top + 16 ? cy + 20 : cy - 10
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(tx - 2, ty - 11, ctx.measureText(txt).width + 6, 14)
    ctx.fillStyle = '#ffd700'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(txt, tx, ty)
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
  const W = rect.width,
    H = rect.height
  const pad = { top: 24, right: 20, bottom: 36, left: 60 }
  const w = W - pad.left - pad.right,
    h = H - pad.top - pad.bottom
  const tMax = capXScale.value > 0 ? capXScale.value : getTimeScale()
  const tStart = simTdelay.value
  const V0 = dp.V
  const yMin = V0 * capYMinMul.value
  const yMax = V0 * capYMaxMul.value
  const yRange = yMax - yMin || 1

  // LTspice 深色背景
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, W, H)

  // 网格线
  ctx.strokeStyle = '#2a2a44'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 8; i++) {
    const y = pad.top + (h / 8) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(W - pad.right, y)
    ctx.stroke()
    const x = pad.left + (w / 8) * i
    ctx.beginPath()
    ctx.moveTo(x, pad.top)
    ctx.lineTo(x, H - pad.bottom)
    ctx.stroke()
  }

  // 坐标轴
  ctx.strokeStyle = '#555580'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad.left, pad.top)
  ctx.lineTo(pad.left, H - pad.bottom)
  ctx.lineTo(W - pad.right, H - pad.bottom)
  ctx.stroke()

  const N = 600
  const toX = (t) => pad.left + ((t - tStart) / tMax) * w
  const toY = (v) => pad.top + h * (1 - (v - yMin) / yRange)

  // 主曲线(LTspice 绿色,带发光)
  ctx.shadowColor = '#00e4a0'
  ctx.shadowBlur = 6
  ctx.strokeStyle = '#00e4a0'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const t = tStart + (i / N) * tMax
    const v = calcCapacitorVoltage(dp, t)
    const x = toX(t),
      y = toY(v)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  // 瞬时值标记(红色十字 + 虚线)
  const tInst = instTime.value
  const vInst = calcCapacitorVoltage(dp, tInst)
  const ix = toX(tInst),
    iy = toY(vInst)
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(ix, pad.top)
  ctx.lineTo(ix, H - pad.bottom)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(pad.left, iy)
  ctx.lineTo(W - pad.right, iy)
  ctx.stroke()
  ctx.setLineDash([])
  // 十字标记
  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(ix - 6, iy)
  ctx.lineTo(ix + 6, iy)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ix, iy - 6)
  ctx.lineTo(ix, iy + 6)
  ctx.stroke()
  // 读数
  const instTxt = `(${formatTimeLabel(tInst)}, ${vInst.toFixed(QUANTITY.u.decimals)}${QUANTITY.u.unit})`
  const itx = ix + 10 > W - pad.right - 120 ? ix - 120 : ix + 10
  const ity = iy - 10 < pad.top + 16 ? iy + 20 : iy - 10
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(itx - 2, ity - 11, ctx.measureText(instTxt).width + 6, 14)
  ctx.fillStyle = '#ff4444'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText(instTxt, itx, ity)

  // 轴标签
  ctx.fillStyle = '#9999bb'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  for (let i = 0; i <= 8; i++) {
    const t = tStart + (i / 8) * tMax
    ctx.fillText(formatTimeLabel(t), pad.left + (w / 8) * i, H - pad.bottom + 14)
  }
  ctx.textAlign = 'right'
  for (let i = 0; i <= 8; i++) {
    const v = yMin + (yRange / 8) * i
    ctx.fillText(v.toFixed(2), pad.left - 4, toY(v) + 3)
  }

  // 轴标题
  ctx.fillStyle = '#bbbbdd'
  ctx.font = '11px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Time (' + QUANTITY.t.unit + ')', W / 2, H - 4)
  ctx.save()
  ctx.translate(12, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Uc (' + QUANTITY.u.unit + ')', 0, 0)
  ctx.restore()

  // 信号名标签
  ctx.fillStyle = '#00e4a0'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('Uc', pad.left + 6, pad.top + 14)

  // 光标(仅当本画布处于悬停状态时显示,吸附到曲线数据点)
  if (capCursor.value !== null) {
    const ct = capCursor.value.time
    const cx = toX(ct)
    const cv = calcCapacitorVoltage(dp, ct)
    const cy = toY(cv)
    // 竖直虚线(跟随光标 x)
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(cx, pad.top)
    ctx.lineTo(cx, H - pad.bottom)
    ctx.stroke()
    // 水平虚线(吸附到曲线 y)
    ctx.beginPath()
    ctx.moveTo(pad.left, cy)
    ctx.lineTo(W - pad.right, cy)
    ctx.stroke()
    ctx.setLineDash([])
    // 曲线上的数据点
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI)
    ctx.fill()
    // 读数框
    const txt = `(${formatTimeLabel(ct)}, ${cv.toFixed(QUANTITY.u.decimals)}${QUANTITY.u.unit})`
    const tx = cx + 10 > W - pad.right - 120 ? cx - 120 : cx + 10
    const ty = cy - 10 < pad.top + 16 ? cy + 20 : cy - 10
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(tx - 2, ty - 11, ctx.measureText(txt).width + 6, 14)
    ctx.fillStyle = '#ffd700'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(txt, tx, ty)
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
  },
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

/* 板块全屏:整块工作区转 fixed 铺满视口(盖住页眉/侧栏等外部布局与菜单);复用自身三栏栅格不变 */
.board-fs {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  overflow-y: auto;
  padding: 16px;
  background: var(--app-bg);
  border-radius: 0;
}
/* 全屏:参数栏隐藏后栅格收成两栏(元件库左 + 画布),避免右侧空列;PC 保持元件库在左 */
.board-fs .board-grid {
  grid-template-columns: 150px minmax(0, 1fr);
}
/* 全屏时 3D 画布抬高以充分利用视口(由 Circuit3DCanvas 自身 ResizeObserver 自适应) */
.board-fs :deep(.c3d-stage) {
  height: 60vh;
}
/* 窄屏(普通视图与全屏均适用):元件库退到顶部时统一改为横向滚动一排并缩小元件项 */
@media (max-width: 1023.98px) {
  .board-palette .palette {
    flex-wrap: nowrap;
    margin-bottom: 0;
  }
  .board-palette .component-item {
    flex: 0 0 auto;
  }
}
</style>
