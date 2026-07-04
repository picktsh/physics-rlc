<template>
  <div class="space-y-4">
    <!-- 1. RLC串联电路结构 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>🔌</span>
        <span>RLC串联电路结构</span>
      </div>
      <div class="flex flex-col lg:flex-row gap-6 items-center">
        <div class="flex-shrink-0 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <svg width="380" height="120" viewBox="0 0 380 120" class="text-gray-700">
            <line x1="20" y1="60" x2="60" y2="60" stroke="currentColor" stroke-width="2" />
            <line x1="340" y1="60" x2="360" y2="60" stroke="currentColor" stroke-width="2" />
            <line x1="20" y1="20" x2="20" y2="100" stroke="currentColor" stroke-width="2" />
            <line x1="360" y1="20" x2="360" y2="100" stroke="currentColor" stroke-width="2" />
            <line x1="20" y1="20" x2="60" y2="20" stroke="currentColor" stroke-width="2" />
            <line x1="300" y1="20" x2="360" y2="20" stroke="currentColor" stroke-width="2" />
            <line x1="20" y1="100" x2="60" y2="100" stroke="currentColor" stroke-width="2" />
            <line x1="300" y1="100" x2="360" y2="100" stroke="currentColor" stroke-width="2" />
            <rect x="80" y="45" width="50" height="30" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="4" />
            <text x="105" y="64" text-anchor="middle" fill="#2e7d32" font-size="16" font-weight="bold">R</text>
            <path d="M 170 35 Q 185 20 200 35 Q 215 50 230 35 Q 245 20 260 35" fill="none" stroke="#ff9800" stroke-width="2.5" />
            <text x="215" y="70" text-anchor="middle" fill="#e65100" font-size="16" font-weight="bold">L</text>
            <line x1="285" y1="30" x2="285" y2="55" stroke="#2196f3" stroke-width="2.5" />
            <line x1="295" y1="30" x2="295" y2="55" stroke="#2196f3" stroke-width="2.5" />
            <text x="290" y="78" text-anchor="middle" fill="#1565c0" font-size="16" font-weight="bold">C</text>
            <circle cx="40" cy="60" r="18" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" />
            <text x="40" y="64" text-anchor="middle" fill="#6a1b9a" font-size="14" font-weight="bold">V</text>
            <polygon points="70,55 80,60 70,65" fill="#e53935" />
            <polygon points="310,55 320,60 310,65" fill="#e53935" />
            <polygon points="365,55 355,60 365,65" fill="#e53935" />
            <polygon points="365,85 355,80 365,75" fill="#e53935" />
          </svg>
        </div>
        <div class="text-sm text-gray-600 space-y-2 leading-relaxed">
          <p>RLC串联电路由 <strong class="text-green-600">电阻 R</strong>、<strong class="text-orange-600">电感 L</strong> 和 <strong class="text-blue-600">电容 C</strong> 串联组成，由 <strong class="text-purple-600">交流信号源 V</strong> 驱动。</p>
          <p>电路总阻抗为各元件阻抗的矢量和，其幅值和相位随频率变化，从而产生幅频、相频等特性曲线。</p>
        </div>
      </div>
    </section>

    <!-- 2. 基本公式 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>📐</span>
        <span>基本电学公式</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
          <div class="text-xs text-yellow-700 font-semibold mb-1">角频率</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">&#x3C9; = 2&#x3C0;f</div>
          <div class="text-xs text-gray-500">f 为频率 (Hz)，&#x3C9; 为角频率 (rad/s)</div>
        </div>
        <div class="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
          <div class="text-xs text-blue-700 font-semibold mb-1">感抗</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">X<sub>L</sub> = &#x3C9;L</div>
          <div class="text-xs text-gray-500">与频率成正比，频率越高感抗越大</div>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
          <div class="text-xs text-green-700 font-semibold mb-1">容抗</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">X<sub>C</sub> = 1 / (&#x3C9;C)</div>
          <div class="text-xs text-gray-500">与频率成反比，频率越高容抗越小</div>
        </div>
      </div>
    </section>

    <!-- 3. 阻抗特性 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>⚡</span>
        <span>阻抗特性</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-5 border border-indigo-200">
          <div class="text-sm font-semibold text-indigo-700 mb-3">阻抗模</div>
          <div class="text-xl font-mono font-bold text-gray-800 text-center py-3 bg-white/60 rounded-lg">|Z| = &#x221A;[R&#xb2; + (X<sub>L</sub> &#x2212; X<sub>C</sub>)&#xb2;]</div>
          <div class="text-sm text-gray-600 mt-2 leading-relaxed">
            <p>当 X<sub>L</sub> = X<sub>C</sub> 时，阻抗最小，|Z| = R，此时电路发生<strong class="text-red-500">串联谐振</strong>。</p>
            <p class="mt-1">当 X<sub>L</sub> &gt; X<sub>C</sub> 时，电路呈<strong class="text-orange-500">感性</strong>；反之呈<strong class="text-blue-500">容性</strong>。</p>
          </div>
        </div>
        <div class="bg-gradient-to-br from-gray-50 to-purple-50 rounded-xl p-5 border border-purple-200">
          <div class="text-sm font-semibold text-purple-700 mb-3">阻抗角（相位差）</div>
          <div class="text-xl font-mono font-bold text-gray-800 text-center py-3 bg-white/60 rounded-lg">&#x3C6; = arctan[(X<sub>L</sub> &#x2212; X<sub>C</sub>) / R]</div>
          <div class="text-sm text-gray-600 mt-2 leading-relaxed">
            <p>&#x3C6; &gt; 0 时电压超前电流（感性），&#x3C6; &lt; 0 时电压滞后电流（容性）。</p>
            <p class="mt-1">谐振时 &#x3C6; = 0，电压与电流同相位。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. 谐振条件与品质因数 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>🎯</span>
        <span>谐振条件与品质因数</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
          <div class="text-xs text-red-700 font-semibold mb-1">谐振条件</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">X<sub>L</sub> = X<sub>C</sub></div>
        </div>
        <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
          <div class="text-xs text-indigo-700 font-semibold mb-1">谐振频率</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">f&#x2080; = 1 / (2&#x3C0;&#x221A;LC)</div>
          <div class="text-xs text-gray-500">仅与 L、C 有关，与 R 无关</div>
        </div>
        <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
          <div class="text-xs text-amber-700 font-semibold mb-1">品质因数</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">Q = &#x3C9;&#x2080;L / R</div>
          <div class="text-xs text-gray-500">Q 越大，曲线越尖锐，选择性越好</div>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200">
          <div class="text-xs text-teal-700 font-semibold mb-1">通频带</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">BW = f&#x2080; / Q</div>
          <div class="text-xs text-gray-500">BW = f&#x2082; &#x2212; f&#x2081;，即半功率点间的频率宽度</div>
        </div>
        <div class="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-200">
          <div class="text-xs text-rose-700 font-semibold mb-1">半功率点电流</div>
          <div class="text-lg font-mono font-bold text-gray-800 text-center py-2">I<sub>0.707</sub> = I<sub>max</sub> / &#x221A;2</div>
          <div class="text-xs text-gray-500">对应 I = 0.707 &#xd7; I<sub>max</sub>，功率为最大值的一半</div>
        </div>
      </div>
    </section>

    <!-- 5. 三种频率特性 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>📈</span>
        <span>三大频率特性</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span class="text-sm font-semibold text-gray-700">幅频特性 I(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-1 leading-relaxed">
            <p>描述电流 I 随频率 f 的变化关系：</p>
            <p class="font-mono text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded">I = V / &#x221A;[R&#xb2; + (&#x3C9;L &#x2212; 1/&#x3C9;C)&#xb2;]</p>
            <p>在谐振频率 f&#x2080; 处电流达到最大值 I<sub>max</sub> = V/R。</p>
            <p>曲线形状与 Q 值相关，Q 越大曲线越尖锐。</p>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full bg-purple-500"></div>
            <span class="text-sm font-semibold text-gray-700">相频特性 &#x3C6;(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-1 leading-relaxed">
            <p>描述相位差 &#x3C6; 随频率 f 的变化关系：</p>
            <p class="font-mono text-sm text-purple-600 bg-purple-50 px-2 py-1 rounded">&#x3C6; = arctan[(&#x3C9;L &#x2212; 1/&#x3C9;C) / R]</p>
            <p>f &lt; f&#x2080; 时 &#x3C6; &lt; 0（容性），f &gt; f&#x2080; 时 &#x3C6; &gt; 0（感性）。</p>
            <p>f = f&#x2080; 时 &#x3C6; = 0，电路呈纯阻性。</p>
          </div>
        </div>
        <div class="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span class="text-sm font-semibold text-gray-700">阻抗模特性 Z(f)</span>
          </div>
          <div class="text-xs text-gray-600 space-y-1 leading-relaxed">
            <p>描述阻抗模 |Z| 随频率 f 的变化关系：</p>
            <p class="font-mono text-sm text-cyan-600 bg-cyan-50 px-2 py-1 rounded">|Z| = &#x221A;[R&#xb2; + (&#x3C9;L &#x2212; 1/&#x3C9;C)&#xb2;]</p>
            <p>在 f&#x2080; 处 |Z| = R 为最小值。</p>
            <p>远离 f&#x2080; 时阻抗增大，电流减小。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. 关键参数总结表 -->
    <section class="card">
      <div class="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>📋</span>
        <span>关键参数速查</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <th class="px-4 py-2.5 text-left">参数</th>
              <th class="px-4 py-2.5 text-left">符号</th>
              <th class="px-4 py-2.5 text-left">公式</th>
              <th class="px-4 py-2.5 text-left">物理意义</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in paramTable" :key="idx" :class="idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'">
              <td class="px-4 py-2.5 border-t border-gray-200 font-medium">{{ row.name }}</td>
              <td class="px-4 py-2.5 border-t border-gray-200 font-mono" v-html="row.symbol"></td>
              <td class="px-4 py-2.5 border-t border-gray-200 font-mono text-indigo-600" v-html="row.formula"></td>
              <td class="px-4 py-2.5 border-t border-gray-200 text-gray-600 text-xs">{{ row.meaning }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
const paramTable = [
  { name: '角频率', symbol: '&#x3C9;', formula: '&#x3C9; = 2&#x3C0;f', meaning: '单位 rad/s，描述交流电变化快慢' },
  { name: '感抗', symbol: 'X<sub>L</sub>', formula: 'X<sub>L</sub> = &#x3C9;L', meaning: '单位 &#x3A9;，电感对交流电的阻碍作用' },
  { name: '容抗', symbol: 'X<sub>C</sub>', formula: 'X<sub>C</sub> = 1/(&#x3C9;C)', meaning: '单位 &#x3A9;，电容对交流电的阻碍作用' },
  { name: '阻抗模', symbol: '|Z|', formula: '|Z| = &#x221A;[R&#xb2;+(X<sub>L</sub>&#x2212;X<sub>C</sub>)&#xb2;]', meaning: '单位 &#x3A9;，电路总阻抗的幅值' },
  { name: '阻抗角', symbol: '&#x3C6;', formula: '&#x3C6; = arctan[(X<sub>L</sub>&#x2212;X<sub>C</sub>)/R]', meaning: '单位 &#xb0;，电压与电流的相位差' },
  { name: '谐振频率', symbol: 'f&#x2080;', formula: 'f&#x2080; = 1/(2&#x3C0;&#x221A;LC)', meaning: '单位 Hz，电路发生谐振的频率' },
  { name: '品质因数', symbol: 'Q', formula: 'Q = &#x3C9;&#x2080;L/R', meaning: '无量纲，衡量选择性与储能效率' },
  { name: '通频带', symbol: 'BW', formula: 'BW = f&#x2080;/Q', meaning: '单位 Hz，半功率点间频率宽度' },
  { name: '最大电流', symbol: 'I<sub>max</sub>', formula: 'I<sub>max</sub> = V/R', meaning: '单位 mA，谐振时的回路电流' },
]
</script>
