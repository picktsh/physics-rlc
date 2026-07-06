<template>
  <div class="space-y-5">
    <!-- ==================== 1. 电路结构 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-base">🔌</span>
        <span>RLC串联电路结构</span>
      </div>
      <div class="flex flex-col lg:flex-row gap-6 items-center">
        <div class="flex-shrink-0 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 shadow-sm">
          <svg viewBox="0 0 400 130" class="w-full max-w-[400px] h-auto text-gray-700" style="height:auto;aspect-ratio:400/130">
            <line x1="70" y1="45" x2="95" y2="45" stroke="currentColor" stroke-width="2" />
            <line x1="140" y1="45" x2="168" y2="45" stroke="currentColor" stroke-width="2" />
            <line x1="238" y1="45" x2="265" y2="45" stroke="currentColor" stroke-width="2" />
            <line x1="280" y1="45" x2="330" y2="45" stroke="currentColor" stroke-width="2" />
            <rect x="95" y="30" width="45" height="30" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="3" />
            <text x="117.5" y="50" text-anchor="middle" fill="#2e7d32" font-size="17" font-weight="bold">R</text>
            <path d="M 168 45 Q 176.75 25 185.5 45 Q 194.25 25 203 45 Q 211.75 25 220.5 45 Q 229.25 25 238 45" fill="none" stroke="#ff9800" stroke-width="2" />
            <text x="203" y="74" text-anchor="middle" fill="#e65100" font-size="17" font-weight="bold">L</text>
            <line x1="265" y1="30" x2="265" y2="60" stroke="#2196f3" stroke-width="2.5" />
            <line x1="280" y1="30" x2="280" y2="60" stroke="#2196f3" stroke-width="2.5" />
            <text x="272.5" y="80" text-anchor="middle" fill="#1565c0" font-size="17" font-weight="bold">C</text>
            <line x1="330" y1="45" x2="330" y2="98" stroke="currentColor" stroke-width="2" />
            <line x1="70" y1="98" x2="330" y2="98" stroke="currentColor" stroke-width="2" />
            <line x1="70" y1="45" x2="70" y2="56" stroke="currentColor" stroke-width="2" />
            <line x1="70" y1="84" x2="70" y2="98" stroke="currentColor" stroke-width="2" />
            <circle cx="70" cy="70" r="14" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" />
            <text x="70" y="74" text-anchor="middle" fill="#6a1b9a" font-size="15" font-weight="bold">V</text>
            <polygon points="148,41 154,45 148,49" fill="#e53935" />
            <polygon points="157,41 151,45 157,49" fill="#e53935" />
            <polygon points="198,94 192,98 198,102" fill="#e53935" />
            <polygon points="207,94 213,98 207,102" fill="#e53935" />
          </svg>
        </div>
        <div class="text-sm text-gray-600 space-y-2 leading-relaxed max-w-lg">
          <p>RLC串联电路由 <strong class="text-green-600">电阻 R</strong>、<strong class="text-orange-600">电感 L</strong> 和 <strong class="text-blue-600">电容 C</strong> 串联组成，由 <strong class="text-purple-600">交流信号源 V</strong> 驱动。</p>
          <p>电路总阻抗为各元件阻抗的矢量和，其幅值和相位随频率变化，从而产生幅频、相频等特性曲线。</p>
        </div>
      </div>
    </section>

    <!-- ==================== 2. 基本公式与阻抗特性 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-base">📐</span>
        <span>基本公式与阻抗特性</span>
      </div>
      
      <!-- 基本公式行 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-yellow-700 font-semibold mb-2 uppercase tracking-wide">角频率</div>
          <div class="text-xl font-mono font-bold text-gray-800 text-center py-2">&#x3C9; = 2&#x3C0;f</div>
          <div class="text-xs text-gray-500 mt-2">f 为频率 (Hz)，&#x3C9; 为角频率 (rad/s)</div>
        </div>
        <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-blue-700 font-semibold mb-2 uppercase tracking-wide">感抗</div>
          <div class="text-xl font-mono font-bold text-gray-800 text-center py-2">X<sub>L</sub> = &#x3C9;L</div>
          <div class="text-xs text-gray-500 mt-2">与频率成正比，频率越高感抗越大</div>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-green-700 font-semibold mb-2 uppercase tracking-wide">容抗</div>
          <div class="flex items-center justify-center text-xl font-mono font-bold text-gray-800 text-center py-2">
            <span>X<sub>C</sub> = </span>
            <div class="flex flex-col items-center mx-0.5">
              <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">1</span>
              <span class="pt-0.5 leading-none">&#x3C9;C</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">与频率成反比，频率越高容抗越小</div>
        </div>
      </div>

      <!-- 阻抗特性 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span class="text-sm font-semibold text-indigo-700">阻抗模</span>
          </div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-3 bg-white/70 rounded-lg mb-3">|Z| = &#x221A;[R&#xb2; + (X<sub>L</sub> &#x2212; X<sub>C</sub>)&#xb2;]</div>
          <div class="text-xs text-gray-600 leading-relaxed space-y-1">
            <p><span class="font-semibold text-red-500">X<sub>L</sub> = X<sub>C</sub></span> 时 |Z| = R，电路发生<strong>串联谐振</strong></p>
            <p><span class="font-semibold text-orange-500">X<sub>L</sub> &gt; X<sub>C</sub></span> 呈感性；<span class="font-semibold text-blue-500">X<sub>L</sub> &lt; X<sub>C</sub></span> 呈容性</p>
          </div>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-2 h-2 rounded-full bg-purple-500"></div>
            <span class="text-sm font-semibold text-purple-700">阻抗角（相位差）</span>
          </div>
          <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800 text-center py-3 bg-white/70 rounded-lg mb-3">
            <span>&#x3C6; = arctan</span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-gray-800 px-2 pb-0.5 leading-none">X<sub>L</sub> &#x2212; X<sub>C</sub></span>
              <span class="pt-0.5 leading-none">R</span>
            </div>
          </div>
          <div class="text-xs text-gray-600 leading-relaxed space-y-1">
            <p>&#x3C6; &gt; 0 电压超前电流（感性），&#x3C6; &lt; 0 电压滞后电流（容性）</p>
            <p>&#x3C6; = 0 时电压与电流同相，即谐振状态</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 3. 谐振条件 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-base">🎯</span>
        <span>谐振条件</span>
      </div>
      
      <div class="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 border border-red-200">
        <!-- 公式推导链 -->
        <div class="flex flex-col sm:flex-row items-stretch gap-3 mb-5">
          <div class="bg-white/80 rounded-xl px-5 py-3 border border-red-100 text-center flex-1 shadow-sm">
            <div class="text-xs text-red-600 font-semibold mb-1.5 uppercase tracking-wide">谐振条件</div>
            <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800">
              <span>&#x3C9;&#x2080;L &#x2212; </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">1</span>
                <span class="pt-0.5 leading-none">&#x3C9;&#x2080;C</span>
              </div>
              <span> = 0</span>
            </div>
          </div>
          <div class="hidden sm:flex items-center justify-center text-red-400 text-2xl font-bold">&#x21D2;</div>
          <div class="bg-white/80 rounded-xl px-5 py-3 border border-red-100 text-center flex-1 shadow-sm">
            <div class="text-xs text-red-600 font-semibold mb-1.5 uppercase tracking-wide">谐振角频率</div>
            <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800">
              <span>&#x3C9;&#x2080; = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">1</span>
                <span class="pt-0.5 leading-none">&#x221A;(LC)</span>
              </div>
            </div>
          </div>
          <div class="hidden sm:flex items-center justify-center text-red-400 text-2xl font-bold">&#x21D2;</div>
          <div class="bg-white/80 rounded-xl px-5 py-3 border border-red-100 text-center flex-1 shadow-sm">
            <div class="text-xs text-red-600 font-semibold mb-1.5 uppercase tracking-wide">谐振频率</div>
            <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800">
              <span>f&#x2080; = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">1</span>
                <span class="pt-0.5 leading-none">2&#x3C0;&#x221A;LC</span>
              </div>
            </div>
            <div class="text-xs text-gray-500 mt-1.5">仅与 L、C 有关，与 R 无关</div>
          </div>
        </div>

        <!-- 谐振特征 -->
        <div class="bg-white rounded-xl p-5 border border-red-200 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span class="text-sm font-semibold text-gray-800">串联谐振特征</span>
          </div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-green-50 rounded-lg py-3 px-3 border border-green-200">
              <div class="text-xs text-green-700 font-medium mb-1">阻抗最小</div>
              <div class="text-lg font-mono font-bold text-green-600">|Z|<sub>min</sub> = R</div>
            </div>
            <div class="bg-blue-50 rounded-lg py-3 px-3 border border-blue-200">
              <div class="text-xs text-blue-700 font-medium mb-1">电流最大</div>
              <div class="flex items-center justify-center text-lg font-mono font-bold text-blue-600">
                <span>I<sub>max</sub> = </span>
                <div class="flex flex-col items-center mx-0.5">
                  <span class="border-0 border-b-2 border-solid border-blue-600 px-1 pb-0.5 leading-none">V</span>
                  <span class="pt-0.5 leading-none">R</span>
                </div>
              </div>
            </div>
            <div class="bg-purple-50 rounded-lg py-3 px-3 border border-purple-200">
              <div class="text-xs text-purple-700 font-medium mb-1">相位差为零</div>
              <div class="text-lg font-mono font-bold text-purple-600">&#x3C6; = 0</div>
            </div>
          </div>
          <div class="text-xs text-gray-600 mt-3 text-center">
            电路呈<strong class="text-red-500">纯阻性</strong>，电压与电流<strong class="text-red-500">同相位</strong>，回路电流达到最大值
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 4. 品质因数 Q 与通频带 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">🔧</span>
        <span>品质因数 Q 与通频带</span>
      </div>

      <!-- Q / BW / 半功率点 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-amber-700 font-semibold mb-2 uppercase tracking-wide">品质因数</div>
          <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800 text-center py-2 bg-white/60 rounded-lg">
            <span>Q = </span>
            <div class="flex flex-col items-center mx-0.5">
              <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">&#x3C9;&#x2080;L</span>
              <span class="pt-0.5 leading-none">R</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">Q 值越大，谐振曲线越尖锐，选择性越好</div>
        </div>
        <div class="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-teal-700 font-semibold mb-2 uppercase tracking-wide">通频带</div>
          <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800 text-center py-2 bg-white/60 rounded-lg">
            <span>BW = </span>
            <div class="flex flex-col items-center mx-0.5">
              <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">f&#x2080;</span>
              <span class="pt-0.5 leading-none">Q</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">BW = f&#x2082; &#x2212; f&#x2081;，半功率点间频率宽度</div>
        </div>
        <div class="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-200 hover:shadow-md transition-shadow">
          <div class="text-xs text-rose-700 font-semibold mb-2 uppercase tracking-wide">半功率点电流</div>
          <div class="flex items-center justify-center text-lg font-mono font-bold text-gray-800 text-center py-2 bg-white/60 rounded-lg">
            <span>I<sub>max/√2</sub> = </span>
            <div class="flex flex-col items-center mx-0.5">
              <span class="border-0 border-b-2 border-solid border-gray-800 px-1.5 pb-0.5 leading-none">I<sub>max</sub></span>
              <span class="pt-0.5 leading-none">&#x221A;2</span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">I = I<sub>max</sub>/√2，功率为最大值一半</div>
        </div>
      </div>

      <!-- Q值三种推导 Tab -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div class="px-4 pt-4 pb-3 border-b border-gray-100">
          <div class="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span>📐</span>
            <span>Q值的三种推导方法</span>
          </div>
        </div>
        
        <!-- Tab 按钮 -->
        <div class="flex bg-gray-50 border-b border-gray-200">
          <button v-for="(tab, idx) in qTabs" :key="idx"
            @click="activeQTab = idx"
            class="flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-all cursor-pointer relative"
            :class="activeQTab === idx ? tab.activeColor + ' bg-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'">
            <span class="hidden sm:inline">{{ tab.title }}</span>
            <span class="sm:hidden">{{ tab.short }}</span>
            <div v-if="activeQTab === idx" class="absolute bottom-0 left-0 right-0 h-0.5" :class="tab.barColor"></div>
          </button>
        </div>

        <!-- Tab 内容 -->
        <div class="p-5">
          <!-- 方法一：幅频带宽法 -->
          <div v-if="activeQTab === 0" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</span>
              <div class="text-sm text-gray-700 flex-1">
                <strong class="text-gray-900">电流表达式</strong>
                <div class="flex items-center justify-center font-mono text-sm bg-indigo-50 px-4 py-2 rounded-lg mt-2 border border-indigo-100">
                  <span>I(f) = </span>
                  <div class="flex flex-col items-center mx-1">
                    <span class="border-0 border-b-2 border-solid border-indigo-400 px-3 pb-0.5 leading-none">V</span>
                    <span class="pt-0.5 leading-none">&#x221A;[R&#xb2; + (&#x3C9;L &#x2212; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 1px"><span style="border-bottom:1px solid #6366f1;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span>)&#xb2;]</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">半功率点：</strong><span class="text-gray-500 ml-1">I = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:1px solid #6b7280;padding:0 3px 1px">I<sub>max</sub></span><span style="padding:1px 0 0">&#x221A;2</span></span> 对应 f&#x2081;、f&#x2082;，此时 |X<sub>L</sub> &#x2212; X<sub>C</sub>| = R</span></div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">解出带宽：</strong><span class="text-gray-500 ml-1">&#x394;&#x3C9; = &#x3C9;&#x2082; &#x2212; &#x3C9;&#x2081; = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:1px solid #6b7280;padding:0 3px 1px">R</span><span style="padding:1px 0 0">L</span></span></span></div>
            </div>
            <div class="bg-indigo-50 rounded-lg px-4 py-3 border-l-4 border-indigo-500 mt-4">
              <div class="flex items-center justify-start text-sm font-semibold text-indigo-800 font-mono">
                <span>Q = </span>
                <div class="flex flex-col items-center mx-1">
                  <span class="border-0 border-b-2 border-solid border-indigo-600 px-2 pb-0.5 leading-none">&#x3C9;&#x2080;</span>
                  <span class="pt-0.5 leading-none">&#x394;&#x3C9;</span>
                </div>
                <span> = </span>
                <div class="flex flex-col items-center mx-1">
                  <span class="border-0 border-b-2 border-solid border-indigo-600 px-2 pb-0.5 leading-none">&#x3C9;&#x2080;L</span>
                  <span class="pt-0.5 leading-none">R</span>
                </div>
              </div>
              <p class="text-xs text-indigo-600 mt-1">Q 等于谐振频率与带宽之比，反映电路的频率选择性</p>
            </div>
          </div>

          <!-- 方法二：相频带宽法 -->
          <div v-if="activeQTab === 1" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</span>
              <div class="text-sm text-gray-700 flex-1">
                <strong class="text-gray-900">相位表达式</strong>
                <div class="flex items-center justify-center font-mono text-sm bg-purple-50 px-4 py-2 rounded-lg mt-2 border border-purple-100">
                  <span>&#x3C6; = arctan</span>
                  <div class="flex flex-col items-center mx-1">
                    <span class="border-0 border-b border-solid border-purple-400 px-2 pb-0.5 leading-none">&#x3C9;L &#x2212; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 1px"><span style="border-bottom:1px solid #a855f7;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span></span>
                    <span class="pt-0.5 leading-none">R</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">特征相位点：</strong><span class="text-gray-500 ml-1">&#x3C6; = &#xB1;45&#xB0; 时 tan&#x3C6; = &#xB1;1，即 |X<sub>L</sub> &#x2212; X<sub>C</sub>| = R</span></div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">高Q近似：</strong><span class="text-gray-500 ml-1">两式相减并近似得 &#x394;&#x3C9; &#x2248; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:1px solid #6b7280;padding:0 3px 1px">R</span><span style="padding:1px 0 0">L</span></span></span></div>
            </div>
            <div class="bg-purple-50 rounded-lg px-4 py-3 border-l-4 border-purple-500 mt-4">
              <div class="flex items-center justify-start text-sm font-semibold text-purple-800 font-mono">
                <span>Q = </span>
                <div class="flex flex-col items-center mx-1">
                  <span class="border-0 border-b-2 border-solid border-purple-600 px-2 pb-0.5 leading-none">&#x3C9;&#x2080;</span>
                  <span class="pt-0.5 leading-none">&#x394;&#x3C9;</span>
                </div>
                <span> = </span>
                <div class="flex flex-col items-center mx-1">
                  <span class="border-0 border-b-2 border-solid border-purple-600 px-2 pb-0.5 leading-none">&#x3C9;&#x2080;L</span>
                  <span class="pt-0.5 leading-none">R</span>
                </div>
              </div>
              <p class="text-xs text-purple-600 mt-1">&#xB1;45&#xB0; 点对应功率减半，相位变化率反映储能与耗散之比</p>
            </div>
          </div>

          <!-- 方法三：Q的理论值（与各元件参数关系） -->
          <div v-if="activeQTab === 2" class="space-y-3">
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">代入谐振角频率：</strong><span class="text-gray-500 ml-1">由 Q = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:1px solid #6b7280;padding:0 3px 1px">&#x3C9;&#x2080;L</span><span style="padding:1px 0 0">R</span></span>，将 &#x3C9;&#x2080; = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:1px solid #6b7280;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x221A;(LC)</span></span> 代入</span></div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</span>
              <div class="text-sm text-gray-700 flex-1">
                <strong class="text-gray-900">化简得纯参数表达式</strong>
                <div class="flex items-center justify-center font-mono text-sm bg-green-50 px-4 py-2 rounded-lg mt-2 border border-green-100">
                  <span>Q = </span>
                  <div class="flex flex-col items-center mx-1">
                    <span class="border-0 border-b border-solid border-green-400 px-2 pb-0.5 leading-none">1</span>
                    <span class="pt-0.5 leading-none">R</span>
                  </div>
                  <span>&#x221A;</span>
                  <span class="border-0 border-b-2 border-solid border-green-400 px-1 pb-0.5 leading-none">
                    <span class="flex flex-col items-center">
                      <span class="leading-none">L</span>
                      <span class="leading-none mt-0.5">C</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</span>
              <div class="text-sm text-gray-700"><strong class="text-gray-900">物理含义：</strong><span class="text-gray-500 ml-1">Q 仅由 R、L、C 三个元件参数决定，与外加信号无关</span></div>
            </div>
            <div class="bg-green-50 rounded-lg px-4 py-3 border-l-4 border-green-500 mt-4">
              <div class="flex items-center justify-start text-sm font-semibold text-green-800 font-mono">
                <span>Q = </span>
                <div class="flex flex-col items-center mx-1">
                  <span class="border-0 border-b-2 border-solid border-green-600 px-2 pb-0.5 leading-none">1</span>
                  <span class="pt-0.5 leading-none">R</span>
                </div>
                <span>&#x221A;</span>
                <span class="border-0 border-b-2 border-solid border-green-600 px-1 pb-0.5 leading-none">
                  <span class="flex flex-col items-center">
                    <span class="leading-none">L</span>
                    <span class="leading-none mt-0.5">C</span>
                  </span>
                </span>
              </div>
              <p class="text-xs text-green-600 mt-1">L 越大或 C 越小 → Q 越大；R 越大 → Q 越小。Q 是电路的固有属性</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 三方法统一结论 -->
      <div class="mt-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
        <div class="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>三种方法统一结论</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div class="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
            <div class="text-xs font-semibold text-indigo-600 mb-1">幅频带宽法</div>
            <div class="flex items-center font-mono text-sm text-gray-800">
              <span>Q = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">f&#x2080;</span>
                <span class="pt-0.5 leading-none">BW</span>
              </div>
              <span> = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">&#x3C9;&#x2080;L</span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">测幅频曲线半功率点</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-purple-100 shadow-sm">
            <div class="text-xs font-semibold text-purple-600 mb-1">相频带宽法</div>
            <div class="flex items-center font-mono text-sm text-gray-800">
              <span>Q = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">&#x3C9;&#x2080;</span>
                <span class="pt-0.5 leading-none">&#x394;&#x3C9;</span>
              </div>
              <span> = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">&#x3C9;&#x2080;L</span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
            </div>
            <div class="text-xs text-gray-400 mt-1">测相频曲线&#xB1;45&#xB0;点</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
            <div class="text-xs font-semibold text-green-600 mb-1">理论参数法</div>
            <div class="flex items-center font-mono text-sm text-gray-800">
              <span>Q = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">1</span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
              <span>&#x221A;</span>
              <span class="border-0 border-b border-solid border-gray-600 px-1 pb-0.5 leading-none">
                <span class="flex flex-col items-center">
                  <span class="leading-none">L</span>
                  <span class="leading-none mt-0.5">C</span>
                </span>
              </span>
            </div>
            <div class="text-xs text-gray-400 mt-1">由元件参数直接计算</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 5. 三大频率特性 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-base">📈</span>
        <span>三大频率特性</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span class="text-sm font-semibold text-gray-800">幅频特性 I(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-2 leading-relaxed">
            <p>描述电流 I 随频率 f 的变化关系：</p>
            <div class="flex items-center justify-center font-mono text-sm text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">
              <span>I = </span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-indigo-400 px-1.5 pb-0.5 leading-none">V</span>
                <span class="pt-0.5 leading-none">&#x221A;[R&#xb2; + (&#x3C9;L &#x2212; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 1px"><span style="border-bottom:1px solid #6366f1;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span>)&#xb2;]</span>
              </div>
            </div>
            <p>谐振频率 f&#x2080; 处电流最大 I<sub>max</sub> = V/R</p>
            <p>Q 越大曲线越尖锐</p>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full bg-purple-500"></div>
            <span class="text-sm font-semibold text-gray-800">相频特性 &#x3C6;(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-2 leading-relaxed">
            <p>描述相位差 &#x3C6; 随频率 f 的变化关系：</p>
            <div class="flex items-center justify-center font-mono text-sm text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
              <span>&#x3C6; = arctan</span>
              <div class="flex flex-col items-center mx-0.5">
                <span class="border-0 border-b border-solid border-purple-400 px-1.5 pb-0.5 leading-none">&#x3C9;L &#x2212; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 1px"><span style="border-bottom:1px solid #a855f7;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span></span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
            </div>
            <p>f &lt; f&#x2080; 时 &#x3C6; &lt; 0（容性）</p>
            <p>f &gt; f&#x2080; 时 &#x3C6; &gt; 0（感性）</p>
            <p>f = f&#x2080; 时 &#x3C6; = 0，呈纯阻性</p>
          </div>
        </div>
        <div class="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span class="text-sm font-semibold text-gray-800">阻抗模特性 Z(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-2 leading-relaxed">
            <p>描述阻抗模 |Z| 随频率 f 的变化关系：</p>
            <p class="font-mono text-sm text-cyan-600 bg-cyan-50 px-3 py-2 rounded-lg">|Z| = &#x221A;[R&#xb2; + (&#x3C9;L &#x2212; <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 1px"><span style="border-bottom:1px solid #0891b2;padding:0 3px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span>)&#xb2;]</p>
            <p>在 f&#x2080; 处 |Z| = R 为最小值</p>
            <p>远离 f&#x2080; 时阻抗增大，电流减小</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== 6. 关键参数速查 ==================== -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-base">📋</span>
        <span>关键参数速查</span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <th class="px-4 py-3 text-left font-semibold">参数</th>
              <th class="px-4 py-3 text-left font-semibold">符号</th>
              <th class="px-4 py-3 text-left font-semibold">公式</th>
              <th class="px-4 py-3 text-left font-semibold">物理意义</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in paramTable" :key="idx" :class="idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'" class="hover:bg-indigo-50/50 transition-colors">
              <td class="px-4 py-3 border-t border-gray-100 font-medium text-gray-800">{{ row.name }}</td>
              <td class="px-4 py-3 border-t border-gray-100 font-mono text-gray-700" v-html="row.symbol"></td>
              <td class="px-4 py-3 border-t border-gray-100 font-mono text-indigo-600" v-html="row.formula"></td>
              <td class="px-4 py-3 border-t border-gray-100 text-gray-600 text-xs" v-html="row.meaning"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeQTab = ref(0)

const qTabs = [
  { title: '方法一：幅频带宽法', short: '幅频法', activeColor: 'text-indigo-700', barColor: 'bg-indigo-500' },
  { title: '方法二：相频带宽法', short: '相频法', activeColor: 'text-purple-700', barColor: 'bg-purple-500' },
  { title: '方法三：理论参数法', short: '参数法', activeColor: 'text-green-700', barColor: 'bg-green-500' },
]

const paramTable = [
  { name: '角频率', symbol: '&#x3C9;', formula: '&#x3C9; = 2&#x3C0;f', meaning: '单位 rad/s，描述交流电变化快慢' },
  { name: '感抗', symbol: 'X<sub>L</sub>', formula: 'X<sub>L</sub> = &#x3C9;L', meaning: '单位 &#x3A9;，电感对交流电的阻碍作用' },
  { name: '容抗', symbol: 'X<sub>C</sub>', formula: 'X<sub>C</sub> = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">1</span><span style="padding:1px 0 0">&#x3C9;C</span></span>', meaning: '单位 &#x3A9;，电容对交流电的阻碍作用' },
  { name: '阻抗模', symbol: '|Z|', formula: '|Z| = &#x221A;[R&#xb2;+(X<sub>L</sub>&#x2212;X<sub>C</sub>)&#xb2;]', meaning: '单位 &#x3A9;，电路总阻抗的幅值' },
  { name: '阻抗角', symbol: '&#x3C6;', formula: '&#x3C6; = arctan<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">X<sub>L</sub>&#x2212;X<sub>C</sub></span><span style="padding:1px 0 0">R</span></span>', meaning: '单位 &#xb0;，电压与电流的相位差' },
  { name: '谐振频率', symbol: 'f&#x2080;', formula: 'f&#x2080; = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">1</span><span style="padding:1px 0 0">2&#x3C0;&#x221A;LC</span></span>', meaning: '单位 Hz，电路发生谐振的频率' },
  { name: '品质因数', symbol: 'Q', formula: 'Q = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">&#x3C9;&#x2080;L</span><span style="padding:1px 0 0">R</span></span>', meaning: '无量纲，衡量选择性与储能效率' },
  { name: '通频带', symbol: 'BW', formula: 'BW = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">f&#x2080;</span><span style="padding:1px 0 0">Q</span></span>', meaning: '单位 Hz，半功率点间频率宽度' },
  { name: '最大电流', symbol: 'I<sub>max</sub>', formula: 'I<sub>max</sub> = <span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;font-size:0.85em;margin:0 2px"><span style="border-bottom:2px solid #4f46e5;padding:0 4px 1px">V</span><span style="padding:1px 0 0">R</span></span>', meaning: '单位 mA，谐振时的回路电流' },
]
</script>
