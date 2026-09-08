<template>
  <div class="space-y-5">
    <!-- ==================== 1. 电路结构 ==================== -->
    <section class="card">
      <h2 class="sec-title">一、RLC 串联电路结构</h2>
      <div class="flex flex-col lg:flex-row gap-8 items-center">
        <div class="flex-shrink-0 w-full max-w-[440px] rounded-xl bg-[#f7f9fc] border border-[#e6eaf2] p-4">
          <svg viewBox="0 0 400 130" class="w-full h-auto" style="aspect-ratio:400/130">
            <!-- 顶轨导线 -->
            <line x1="70" y1="45" x2="95" y2="45" stroke="#475569" stroke-width="1.75" />
            <line x1="140" y1="45" x2="168" y2="45" stroke="#475569" stroke-width="1.75" />
            <line x1="238" y1="45" x2="265" y2="45" stroke="#475569" stroke-width="1.75" />
            <line x1="280" y1="45" x2="330" y2="45" stroke="#475569" stroke-width="1.75" />
            <!-- 底轨与竖线 -->
            <line x1="70" y1="98" x2="330" y2="98" stroke="#475569" stroke-width="1.75" />
            <line x1="330" y1="45" x2="330" y2="98" stroke="#475569" stroke-width="1.75" />
            <line x1="70" y1="45" x2="70" y2="55" stroke="#475569" stroke-width="1.75" />
            <line x1="70" y1="85" x2="70" y2="98" stroke="#475569" stroke-width="1.75" />
            <!-- 电阻 R -->
            <rect x="95" y="30" width="45" height="30" fill="#ffffff" stroke="#475569" stroke-width="1.75" rx="2" />
            <text x="117.5" y="49" text-anchor="middle" fill="#1c2534" font-size="16" font-weight="700">R</text>
            <!-- 电感 L -->
            <path d="M 168 45 Q 176.75 25 185.5 45 Q 194.25 25 203 45 Q 211.75 25 220.5 45 Q 229.25 25 238 45" fill="none" stroke="#475569" stroke-width="1.75" />
            <text x="203" y="76" text-anchor="middle" fill="#1c2534" font-size="16" font-weight="700">L</text>
            <!-- 电容 C -->
            <line x1="265" y1="30" x2="265" y2="60" stroke="#475569" stroke-width="2.5" />
            <line x1="280" y1="30" x2="280" y2="60" stroke="#475569" stroke-width="2.5" />
            <text x="272.5" y="81" text-anchor="middle" fill="#1c2534" font-size="16" font-weight="700">C</text>
            <!-- 信号源 V -->
            <circle cx="70" cy="70" r="15" fill="#ffffff" stroke="#2563eb" stroke-width="1.75" />
            <text x="70" y="75" text-anchor="middle" fill="#2563eb" font-size="15" font-weight="700">V</text>
          </svg>
        </div>
        <div class="flex-1 max-w-[560px] space-y-3 text-[14.5px] leading-[1.9] text-[#56647a]">
          <p>
            RLC 串联电路由<strong class="font-semibold text-[#1c2534]">电阻</strong>
            <span v-html="K('R')"></span>、<strong class="font-semibold text-[#1c2534]">电感</strong>
            <span v-html="K('L')"></span>和<strong class="font-semibold text-[#1c2534]">电容</strong>
            <span v-html="K('C')"></span>串联组成,由
            <strong class="font-semibold text-[#1c2534]">交流信号源</strong>
            <span v-html="K('V')"></span>驱动,三者流过同一电流。
          </p>
          <p>
            电路总阻抗为各元件阻抗的<strong class="font-semibold text-[#1c2534]">矢量和</strong>,
            其幅值与相位均随频率变化,由此产生幅频、相频、阻抗模等特性曲线;
            当信号频率恰使感抗与容抗相等时,电路进入<strong class="font-semibold text-[#1c2534]">串联谐振</strong>状态。
          </p>
        </div>
      </div>
    </section>

    <!-- ==================== 2. 基本公式与阻抗特性 ==================== -->
    <section class="card">
      <h2 class="sec-title">二、基本公式与阻抗特性</h2>

      <!-- 三个基本定义 -->
      <h3 class="flex items-center gap-2.5 text-[15px] font-bold text-[#1c2534] mb-4">
        <span class="inline-block w-[3px] h-[15px] rounded-full bg-[#2563eb]"></span>三个基本定义
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-[#e2e7f0] bg-white divide-y md:divide-y-0 md:divide-x divide-[#e2e7f0] overflow-hidden mb-6">
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">角频率</div>
            <div class="formula-k text-[#1c2534]" style="font-size:23px" v-html="K('\\omega = 2\\pi f', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">频率 <span v-html="K('f')"></span> 的角频率表示,单位 rad/s</p>
          </div>
        </div>
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">感抗</div>
            <div class="formula-k text-[#1c2534]" style="font-size:23px" v-html="K('X_L = \\omega L', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">与频率成正比——频率越高,阻碍越强</p>
          </div>
        </div>
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">容抗</div>
            <div class="formula-k text-[#1c2534]" style="font-size:23px" v-html="K('X_C = \\dfrac{1}{\\omega C}', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">与频率成反比——频率越高,阻碍越弱</p>
          </div>
        </div>
      </div>

      <!-- 阻抗模与阻抗角 -->
      <h3 class="flex items-center gap-2.5 text-[15px] font-bold text-[#1c2534] mb-4">
        <span class="inline-block w-[3px] h-[15px] rounded-full bg-[#2563eb]"></span>阻抗模与阻抗角
      </h3>
      <div class="grid grid-cols-1 xl:grid-cols-2 rounded-xl border border-[#e2e7f0] bg-white divide-y xl:divide-y-0 xl:divide-x divide-[#e2e7f0] overflow-hidden">
        <div class="p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-[15px] font-bold text-[#1c2534]">阻抗模</span>
            <span class="formula-k text-[#8a97ab] text-[14px]" v-html="K('|Z|')"></span>
          </div>
          <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-4 overflow-x-auto">
            <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:19px" v-html="K('|Z| = \\sqrt{R^{2} + (X_L - X_C)^{2}}', true)"></div>
          </div>
          <ul class="mt-4 space-y-2 text-[13.5px] leading-6 text-[#56647a]">
            <li class="flex gap-2.5">
              <span class="mt-[9px] w-[3px] h-[3px] rounded-full bg-[#c3cede] flex-shrink-0"></span>
              <p>当 <span v-html="K('X_L = X_C')"></span> 时阻抗最小、<span v-html="K('|Z| = R')"></span>,电路发生<strong class="font-semibold text-[#d14a3f]">串联谐振</strong></p>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-[9px] w-[3px] h-[3px] rounded-full bg-[#c3cede] flex-shrink-0"></span>
              <p><span v-html="K('X_L &gt; X_C')"></span> 呈<strong class="font-semibold text-[#1c2534]">感性</strong>;<span v-html="K('X_L &lt; X_C')"></span> 呈<strong class="font-semibold text-[#1c2534]">容性</strong></p>
            </li>
          </ul>
        </div>
        <div class="p-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-[15px] font-bold text-[#1c2534]">阻抗角</span>
            <span class="text-[13px] text-[#8a97ab]">电压超前电流的角度</span>
            <span class="formula-k text-[#8a97ab] text-[14px] ml-auto" v-html="K('\\varphi')"></span>
          </div>
          <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-4 overflow-x-auto">
            <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:19px" v-html="K('\\varphi = \\arctan\\!\\dfrac{X_L - X_C}{R}', true)"></div>
          </div>
          <ul class="mt-4 space-y-2 text-[13.5px] leading-6 text-[#56647a]">
            <li class="flex gap-2.5">
              <span class="mt-[9px] w-[3px] h-[3px] rounded-full bg-[#c3cede] flex-shrink-0"></span>
              <p><span v-html="K('\\varphi &gt; 0')"></span> 电压超前电流——<strong class="font-semibold text-[#1c2534]">感性</strong></p>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-[9px] w-[3px] h-[3px] rounded-full bg-[#c3cede] flex-shrink-0"></span>
              <p><span v-html="K('\\varphi &lt; 0')"></span> 电压滞后电流——<strong class="font-semibold text-[#1c2534]">容性</strong></p>
            </li>
            <li class="flex gap-2.5">
              <span class="mt-[9px] w-[3px] h-[3px] rounded-full bg-[#c3cede] flex-shrink-0"></span>
              <p><span v-html="K('\\varphi = 0')"></span> 电压电流同相,即<strong class="font-semibold text-[#d14a3f]">谐振状态</strong></p>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ==================== 3. 谐振条件 ==================== -->
    <section class="card">
      <h2 class="sec-title">三、谐振条件</h2>

      <h3 class="flex items-center gap-2.5 text-[15px] font-bold text-[#1c2534] mb-4">
        <span class="inline-block w-[3px] h-[15px] rounded-full bg-[#2563eb]"></span>由谐振定义推出特征频率
      </h3>
      <div class="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-2">
        <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-4 py-5 text-center">
          <div class="text-[12px] text-[#8a97ab] font-medium tracking-[0.14em] mb-3">谐振条件</div>
          <div class="formula-k text-[#1c2534]" style="font-size:19px" v-html="K('\\omega_0 L - \\dfrac{1}{\\omega_0 C} = 0', true)"></div>
        </div>
        <div class="hidden xl:flex items-center justify-center text-[#c3cede] text-[26px] font-light select-none" aria-hidden="true">&#x21D2;</div>
        <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-4 py-5 text-center">
          <div class="text-[12px] text-[#8a97ab] font-medium tracking-[0.14em] mb-3">谐振角频率</div>
          <div class="formula-k text-[#1c2534]" style="font-size:19px" v-html="K('\\omega_0 = \\dfrac{1}{\\sqrt{LC}}', true)"></div>
        </div>
        <div class="hidden xl:flex items-center justify-center text-[#c3cede] text-[26px] font-light select-none" aria-hidden="true">&#x21D2;</div>
        <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-4 py-5 text-center">
          <div class="text-[12px] text-[#8a97ab] font-medium tracking-[0.14em] mb-3">谐振频率</div>
          <div class="formula-k text-[#1c2534]" style="font-size:19px" v-html="K('f_0 = \\dfrac{1}{2\\pi\\sqrt{LC}}', true)"></div>
        </div>
      </div>
      <p class="text-[13px] text-[#7d8aab] text-center mt-3.5">
        谐振频率 <span v-html="K('f_0')"></span> 仅由 <span v-html="K('L')"></span>、<span v-html="K('C')"></span> 决定,与 <span v-html="K('R')"></span> 无关
      </p>

      <h3 class="flex items-center gap-2.5 text-[15px] font-bold text-[#1c2534] mt-7 mb-4">
        <span class="inline-block w-[3px] h-[15px] rounded-full bg-[#d14a3f]"></span>谐振时的三大特征
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-[#e2e7f0] bg-white divide-y md:divide-y-0 md:divide-x divide-[#e2e7f0] overflow-hidden">
        <div class="p-6 text-center">
          <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">阻抗最小</div>
          <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('|Z|_{min} = R', true)"></div>
          <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">回路阻抗只剩电阻分量</p>
        </div>
        <div class="p-6 text-center">
          <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">电流最大</div>
          <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('I_{max} = \\dfrac{V}{R}', true)"></div>
          <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">振幅达到由电阻决定的峰值</p>
        </div>
        <div class="p-6 text-center">
          <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">相位差为零</div>
          <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('\\varphi = 0', true)"></div>
          <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">电压与电流同相,电路纯阻性</p>
        </div>
      </div>
      <p class="text-[13.5px] text-[#56647a] text-center mt-4">
        谐振时回路电流达到最大值,电路呈<strong class="font-semibold text-[#d14a3f]">纯阻性</strong>,
        电压与电流<strong class="font-semibold text-[#d14a3f]">同相位</strong>
      </p>
    </section>

    <!-- ==================== 4. 品质因数 Q 与通频带 ==================== -->
    <section class="card">
      <h2 class="sec-title">四、品质因数 Q 与通频带</h2>

      <!-- 定义三格 -->
      <div class="grid grid-cols-1 md:grid-cols-3 rounded-xl border border-[#e2e7f0] bg-white divide-y md:divide-y-0 md:divide-x divide-[#e2e7f0] overflow-hidden mb-6">
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">品质因数</div>
            <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('Q = \\dfrac{\\omega_0 L}{R}', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">Q 越大,谐振曲线越尖锐、选择性越好</p>
          </div>
        </div>
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">通频带</div>
            <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('BW = \\dfrac{f_0}{Q}', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5"><span v-html="K('f_2 - f_1')"></span>,半功率点之间的频宽</p>
          </div>
        </div>
        <div class="p-6">
          <div class="text-center">
            <div class="text-[12px] font-semibold text-[#8a97ab] tracking-[0.14em] mb-3">半功率点电流</div>
            <div class="formula-k text-[#1c2534]" style="font-size:20px" v-html="K('I = \\dfrac{I_{max}}{\\sqrt{2}}', true)"></div>
            <p class="text-[13px] text-[#7d8aab] leading-5 mt-3.5">对应功率降为峰值的一半</p>
          </div>
        </div>
      </div>

      <!-- Q 值三种推导 Tab -->
      <div class="rounded-xl border border-[#e2e7f0] bg-white overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#eef1f7]">
          <div class="text-[14.5px] font-bold text-[#1c2534]">Q 值的三种推导方法</div>
          <div class="flex gap-1.5">
            <button
              v-for="(tab, idx) in qTabs"
              :key="idx"
              type="button"
              @click="activeQTab = idx"
              class="px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
              :class="activeQTab === idx
                ? 'bg-[#2563eb] text-white shadow-sm'
                : 'text-[#56647a] hover:bg-[#eef1f7] hover:text-[#1c2534]'"
            >
              <span class="hidden sm:inline">{{ idx + 1 }} · {{ tab.title }}</span>
              <span class="sm:hidden">{{ tab.short }}</span>
            </button>
          </div>
        </div>

        <div class="p-6">
          <!-- 方法一:幅频带宽法 -->
          <div v-if="activeQTab === 0">
            <ol class="space-y-7">
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">1</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">电流表达式</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">回路电流由电压与阻抗模共同决定,随频率变化:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-4 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('I(f) = \\dfrac{V}{\\sqrt{R^{2} + \\left(\\omega L - \\dfrac{1}{\\omega C}\\right)^{2}}}', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">2</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">半功率点</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">电流降至峰值的 <span v-html="K('1/\\sqrt{2}')"></span> 时功率减半,对应频率 <span v-html="K('f_1')"></span> 与 <span v-html="K('f_2')"></span>,此时感抗与容抗之差恰等于电阻:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\dfrac{I_{max}}{\\sqrt{2}} \\;\\Longrightarrow\\; \\left|X_L - X_C\\right| = R', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">3</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">解出带宽</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">两个半功率点之间即为通频带,由 <span v-html="K('X_L - X_C = \\pm R')"></span> 直接解得:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\Delta\\omega = \\omega_2 - \\omega_1 = \\dfrac{R}{L}', true)"></div>
                  </div>
                </div>
              </li>
            </ol>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 rounded-xl border border-[#e2e7f0] border-l-[3px] border-l-[#2563eb] bg-[#f6f8fb] px-5 py-4">
              <div class="text-[12px] font-bold tracking-[0.2em] text-[#2563eb] flex-shrink-0">结论</div>
              <div class="formula-k text-[#1c2534] min-w-max mx-auto sm:mx-0" style="font-size:18px" v-html="K('Q = \\dfrac{\\omega_0}{\\Delta\\omega} = \\dfrac{\\omega_0 L}{R}', true)"></div>
              <p class="text-[12.5px] text-[#7d8aab] leading-5 sm:ml-auto">Q 等于谐振频率与带宽之比,衡量频率选择性</p>
            </div>
          </div>

          <!-- 方法二:相频带宽法 -->
          <div v-if="activeQTab === 1">
            <ol class="space-y-7">
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">1</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">相位表达式</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">电压与电流的相位差随频率变化:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-4 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\varphi(f) = \\arctan\\!\\dfrac{\\omega L - \\dfrac{1}{\\omega C}}{R}', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">2</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">特征相位点</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">相位差为 <span v-html="K('\\pm45^\\circ')"></span> 处,功率恰好减半:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\varphi = \\pm45^\\circ \\;\\Longrightarrow\\; \\left|X_L - X_C\\right| = R', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">3</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">高 Q 近似</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">高 Q 时特征频率接近谐振频率,带宽近似为:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\Delta\\omega \\approx \\dfrac{R}{L}', true)"></div>
                  </div>
                </div>
              </li>
            </ol>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 rounded-xl border border-[#e2e7f0] border-l-[3px] border-l-[#2563eb] bg-[#f6f8fb] px-5 py-4">
              <div class="text-[12px] font-bold tracking-[0.2em] text-[#2563eb] flex-shrink-0">结论</div>
              <div class="formula-k text-[#1c2534] min-w-max mx-auto sm:mx-0" style="font-size:18px" v-html="K('Q = \\dfrac{\\omega_0}{\\Delta\\omega} = \\dfrac{\\omega_0 L}{R}', true)"></div>
              <p class="text-[12.5px] text-[#7d8aab] leading-5 sm:ml-auto">±45° 点即半功率点,相位变化率反映储能与耗散之比</p>
            </div>
          </div>

          <!-- 方法三:理论参数法 -->
          <div v-if="activeQTab === 2">
            <ol class="space-y-7">
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">1</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">代入谐振角频率</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">将 <span v-html="K('\\omega_0 = \\dfrac{1}{\\sqrt{LC}}')"></span> 代入 <span v-html="K('Q = \\dfrac{\\omega_0 L}{R}')"></span>,消去频率变量:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('Q = \\dfrac{1}{\\sqrt{LC}} \\cdot \\dfrac{L}{R} = \\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}}', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">2</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">纯参数表达式</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7">Q 最终只由 <span v-html="K('R')"></span>、<span v-html="K('L')"></span>、<span v-html="K('C')"></span> 三个元件参数决定:</p>
                  <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto">
                    <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:19px" v-html="K('Q = \\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}}', true)"></div>
                  </div>
                </div>
              </li>
              <li class="flex gap-4">
                <span class="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border border-[#c9d3e2] bg-white text-[13px] font-bold text-[#8a97ab] mt-0.5">3</span>
                <div class="flex-1 min-w-0 space-y-3">
                  <div class="text-[14.5px] font-bold text-[#1c2534]">物理含义</div>
                  <p class="text-[13.5px] text-[#56647a] leading-7"><span v-html="K('L')"></span> 越大或 <span v-html="K('C')"></span> 越小 → Q 越大;<span v-html="K('R')"></span> 越大 → Q 越小。Q 是电路与外接信号无关的固有属性。</p>
                </div>
              </li>
            </ol>
            <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 rounded-xl border border-[#e2e7f0] border-l-[3px] border-l-[#2563eb] bg-[#f6f8fb] px-5 py-4">
              <div class="text-[12px] font-bold tracking-[0.2em] text-[#2563eb] flex-shrink-0">结论</div>
              <div class="formula-k text-[#1c2534] min-w-max mx-auto sm:mx-0" style="font-size:18px" v-html="K('Q = \\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}}', true)"></div>
              <p class="text-[12.5px] text-[#7d8aab] leading-5 sm:ml-auto">与幅频、相频两条测量路径殊途同归</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 三方法统一结论 -->
      <div class="mt-4 rounded-xl border border-[#e2e7f0] bg-white divide-y sm:divide-y-0 sm:divide-x divide-[#e2e7f0] sm:grid sm:grid-cols-3 overflow-hidden">
        <div class="p-5 sm:p-4 lg:p-5">
          <div class="text-[13px] font-semibold text-[#1c2534] mb-2.5">幅频带宽法</div>
          <div class="formula-k text-[#2563eb]" style="font-size:17px" v-html="K('Q = \\dfrac{f_0}{BW}', true)"></div>
          <p class="text-[12.5px] text-[#8a97ab] mt-2 leading-5">测幅频曲线,取半功率点带宽</p>
        </div>
        <div class="p-5 sm:p-4 lg:p-5">
          <div class="text-[13px] font-semibold text-[#1c2534] mb-2.5">相频带宽法</div>
          <div class="formula-k text-[#2563eb]" style="font-size:17px" v-html="K('Q = \\dfrac{\\omega_0}{\\Delta\\omega}', true)"></div>
          <p class="text-[12.5px] text-[#8a97ab] mt-2 leading-5">测相频曲线,取 ±45° 点间带宽</p>
        </div>
        <div class="p-5 sm:p-4 lg:p-5">
          <div class="text-[13px] font-semibold text-[#1c2534] mb-2.5">理论参数法</div>
          <div class="formula-k text-[#2563eb]" style="font-size:17px" v-html="K('Q = \\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}}', true)"></div>
          <p class="text-[12.5px] text-[#8a97ab] mt-2 leading-5">由元件参数直接计算,无需测量</p>
        </div>
      </div>
    </section>

    <!-- ==================== 5. 三大频率特性 ==================== -->
    <section class="card">
      <h2 class="sec-title">五、三大频率特性</h2>
      <div class="rounded-xl border border-[#e2e7f0] bg-white divide-y divide-[#eef1f7] overflow-hidden">
        <!-- 幅频特性 -->
        <div class="px-6 py-5">
          <div class="space-y-3.5">
            <div class="flex items-center gap-2.5">
              <span class="inline-block w-[3px] h-4 rounded-full bg-[#2563eb]"></span>
              <span class="text-[16px] font-bold text-[#1c2534]">幅频特性</span>
              <span class="formula-k text-[#8a97ab] text-[15px]" v-html="K('I(f)')"></span>
            </div>
            <div class="flex flex-col xl:flex-row xl:items-start gap-5 xl:gap-8">
              <div class="rounded-xl bg-[#f7f9fc] border border-[#e6eaf2] p-2.5 w-full max-w-[340px] xl:shrink-0">
                <svg viewBox="0 0 300 156" class="w-full h-auto block">
                  <line x1="20" y1="131" x2="280" y2="131" stroke="#dbe2ec" stroke-width="1" />
                  <line x1="150" y1="14" x2="150" y2="131" stroke="#d14a3f" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.75" />
                  <path :d="curves.amp" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="150" cy="26" r="2.4" fill="#d14a3f" />
                  <text x="150" y="147" text-anchor="middle" fill="#d14a3f" font-size="10.5" font-weight="600">f₀</text>
                  <text x="279" y="147" text-anchor="end" fill="#8a97ab" font-size="10">f</text>
                </svg>
              </div>
              <div class="min-w-0 flex-1 flex flex-col gap-3">
                <p class="text-[14px] leading-7 text-[#56647a]">在谐振频率 <span v-html="K('f_0')"></span> 处电流达到峰值 <span v-html="K('I_{max} = V/R')"></span>;Q 越高,峰越尖锐、选择性越好。</p>
                <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto w-fit xl:w-full max-w-full">
                  <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('I = \\dfrac{V}{\\sqrt{R^{2} + \\left(\\omega L - \\dfrac{1}{\\omega C}\\right)^{2}}}', true)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 相频特性 -->
        <div class="px-6 py-5">
          <div class="space-y-3.5">
            <div class="flex items-center gap-2.5">
              <span class="inline-block w-[3px] h-4 rounded-full bg-[#2563eb]"></span>
              <span class="text-[16px] font-bold text-[#1c2534]">相频特性</span>
              <span class="formula-k text-[#8a97ab] text-[15px]" v-html="K('\\varphi(f)')"></span>
            </div>
            <div class="flex flex-col xl:flex-row xl:items-start gap-5 xl:gap-8">
              <div class="rounded-xl bg-[#f7f9fc] border border-[#e6eaf2] p-2.5 w-full max-w-[340px] xl:shrink-0">
                <svg viewBox="0 0 300 156" class="w-full h-auto block">
                  <line x1="20" y1="131" x2="280" y2="131" stroke="#dbe2ec" stroke-width="1" />
                  <line x1="20" y1="79" x2="280" y2="79" stroke="#c9d3e2" stroke-width="1" stroke-dasharray="2 4" />
                  <line x1="150" y1="14" x2="150" y2="131" stroke="#d14a3f" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.75" />
                  <path :d="curves.phase" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="150" cy="79" r="2.4" fill="#d14a3f" />
                  <text x="150" y="147" text-anchor="middle" fill="#d14a3f" font-size="10.5" font-weight="600">f₀</text>
                  <text x="279" y="147" text-anchor="end" fill="#8a97ab" font-size="10">f</text>
                </svg>
              </div>
              <div class="min-w-0 flex-1 flex flex-col gap-3">
                <p class="text-[14px] leading-7 text-[#56647a]"><span v-html="K('f &lt; f_0')"></span> 时 <span v-html="K('\\varphi &lt; 0')"></span> 呈容性,<span v-html="K('f &gt; f_0')"></span> 时 <span v-html="K('\\varphi &gt; 0')"></span> 呈感性;<span v-html="K('f = f_0')"></span> 时 <span v-html="K('\\varphi = 0')"></span>,电路呈纯阻性。</p>
                <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto w-fit xl:w-full max-w-full">
                  <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('\\varphi = \\arctan\\!\\dfrac{\\omega L - \\dfrac{1}{\\omega C}}{R}', true)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 阻抗模特性 -->
        <div class="px-6 py-5">
          <div class="space-y-3.5">
            <div class="flex items-center gap-2.5">
              <span class="inline-block w-[3px] h-4 rounded-full bg-[#2563eb]"></span>
              <span class="text-[16px] font-bold text-[#1c2534]">阻抗模特性</span>
              <span class="formula-k text-[#8a97ab] text-[15px]" v-html="K('|Z|(f)')"></span>
            </div>
            <div class="flex flex-col xl:flex-row xl:items-start gap-5 xl:gap-8">
              <div class="rounded-xl bg-[#f7f9fc] border border-[#e6eaf2] p-2.5 w-full max-w-[340px] xl:shrink-0">
                <svg viewBox="0 0 300 156" class="w-full h-auto block">
                  <line x1="20" y1="131" x2="280" y2="131" stroke="#dbe2ec" stroke-width="1" />
                  <line x1="150" y1="14" x2="150" y2="131" stroke="#d14a3f" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.75" />
                  <path :d="curves.imp" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="150" cy="106" r="2.4" fill="#d14a3f" />
                  <text x="150" y="147" text-anchor="middle" fill="#d14a3f" font-size="10.5" font-weight="600">f₀</text>
                  <text x="279" y="147" text-anchor="end" fill="#8a97ab" font-size="10">f</text>
                </svg>
              </div>
              <div class="min-w-0 flex-1 flex flex-col gap-3">
                <p class="text-[14px] leading-7 text-[#56647a]">在 <span v-html="K('f_0')"></span> 处阻抗降到谷底 <span v-html="K('|Z| = R')"></span>(最小);远离 <span v-html="K('f_0')"></span> 时阻抗迅速增大,电流随之减小。</p>
                <div class="rounded-lg bg-[#f6f8fb] border border-[#e6eaf2] px-5 py-3.5 overflow-x-auto w-fit xl:w-full max-w-full">
                  <div class="formula-k text-[#1c2534] min-w-max mx-auto" style="font-size:18px" v-html="K('|Z| = \\sqrt{R^{2} + \\left(\\omega L - \\dfrac{1}{\\omega C}\\right)^{2}}', true)"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 6. 关键参数速查 ==================== -->
    <section class="card">
      <h2 class="sec-title">六、关键参数速查表</h2>
      <div class="rounded-xl border border-[#e2e7f0] overflow-x-auto">
        <table class="w-full text-[13.5px] border-collapse min-w-[760px]">
          <thead>
            <tr class="bg-[#f1f4f9]">
              <th class="px-5 py-3 text-left text-[12px] font-semibold text-[#56647a] whitespace-nowrap">参数</th>
              <th class="px-5 py-3 text-left text-[12px] font-semibold text-[#56647a] whitespace-nowrap">符号</th>
              <th class="px-5 py-3 text-left text-[12px] font-semibold text-[#56647a] whitespace-nowrap">公式</th>
              <th class="px-5 py-3 text-left text-[12px] font-semibold text-[#56647a] whitespace-nowrap">物理意义</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in paramTable"
              :key="idx"
              :class="idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfd]'"
              class="hover:bg-[#eef4ff] transition-colors"
            >
              <td class="px-5 py-3 border-t border-[#eef1f7] font-medium text-[#1c2534] whitespace-nowrap">{{ row.name }}</td>
              <td class="px-5 py-3 border-t border-[#eef1f7] text-[#1c2534] whitespace-nowrap formula-k" v-html="K(row.symbol)"></td>
              <td class="px-5 py-3 border-t border-[#eef1f7] text-[#2563eb] whitespace-nowrap formula-k" v-html="K(row.formula)"></td>
              <td class="px-5 py-3 border-t border-[#eef1f7] text-[#7d8aab] leading-6">{{ row.meaning }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const activeQTab = ref(0)

/** 把函数采样为折线 path,用于绘制三大频率特性示意曲线 */
function samplePath(fn, x0 = 24, x1 = 276, step = 3) {
  const pts = []
  for (let x = x0; x <= x1; x += step) {
    pts.push(x.toFixed(1) + ' ' + fn(x).toFixed(1))
  }
  return 'M' + pts.join('L')
}

const curves = {
  amp: samplePath((x) => 131 - 105 * Math.exp(-(((x - 150) / 34) ** 2))),
  phase: samplePath((x) => 79 - 52 * Math.tanh((x - 150) / 46)),
  imp: samplePath((x) => 26 + 80 * Math.exp(-(((x - 150) / 34) ** 2))),
}

const qTabs = [
  { title: '幅频带宽法', short: '幅频法' },
  { title: '相频带宽法', short: '相频法' },
  { title: '理论参数法', short: '参数法' },
]

const paramTable = [
  { name: '角频率', symbol: '\\omega', formula: '\\omega = 2\\pi f', meaning: '单位 rad/s,描述交流电变化的快慢' },
  { name: '感抗', symbol: 'X_L', formula: 'X_L = \\omega L', meaning: '单位 Ω,电感对交流电的阻碍作用,随频率增大' },
  { name: '容抗', symbol: 'X_C', formula: 'X_C = \\dfrac{1}{\\omega C}', meaning: '单位 Ω,电容对交流电的阻碍作用,随频率减小' },
  { name: '阻抗模', symbol: '|Z|', formula: '|Z| = \\sqrt{R^{2} + (X_L - X_C)^{2}}', meaning: '单位 Ω,电路总阻抗的幅值,谐振时最小' },
  { name: '阻抗角', symbol: '\\varphi', formula: '\\varphi = \\arctan\\!\\dfrac{X_L - X_C}{R}', meaning: '单位 °,电压超前电流的相位差' },
  { name: '谐振频率', symbol: 'f_0', formula: 'f_0 = \\dfrac{1}{2\\pi\\sqrt{LC}}', meaning: '单位 Hz,电路发生谐振的频率,与 R 无关' },
  { name: '品质因数', symbol: 'Q', formula: 'Q = \\dfrac{\\omega_0 L}{R}', meaning: '无量纲,衡量频率选择性与储能效率' },
  { name: '通频带', symbol: 'BW', formula: 'BW = \\dfrac{f_0}{Q}', meaning: '单位 Hz,半功率点之间的频率宽度' },
  { name: '最大电流', symbol: 'I_{max}', formula: 'I_{max} = \\dfrac{V}{R}', meaning: '谐振时回路电流峰值,仅由 V 与 R 决定' },
]

/** 渲染 LaTeX 为 KaTeX HTML */
function K(tex, display = false) {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
  })
}
</script>

<style>
/* KaTeX display 公式在组件公式容器内不额外留外边距(由容器 padding 控制) */
.formula-k .katex-display {
  margin: 0;
}
</style>
