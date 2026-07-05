import { readFileSync, writeFileSync } from 'fs'

const file = 'src/components/FormulaPrinciple.vue'
let content = readFileSync(file, 'utf-8')
const lines = content.split('\n')

console.log(`Total lines: ${lines.length}`)

// Find the old markers
let startLine = -1, endLine = -1
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()
  if (line.includes('方法一：幅频带宽法') || line.includes('方法一：利用谐振曲线')) {
    startLine = i
    console.log(`Found method 1 marker at line ${i + 1}: ${line}`)
  }
  if (line.includes('6. 三大频率特性')) {
    endLine = i
    console.log(`Found section 6 marker at line ${i + 1}: ${line}`)
  }
}

if (startLine === -1 || endLine === -1) {
  console.log('ERROR: Could not find markers')
  process.exit(1)
}

console.log(`Replacing lines ${startLine + 1} to ${endLine} (before line ${endLine + 1})`)

const newSection = `      <!-- 方法一：利用谐振曲线 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">1</div>
          <h3 class="text-base font-semibold text-gray-800">利用谐振曲线（幅频特性）</h3>
        </div>
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-indigo-200 space-y-3">
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第一步：</strong>电流达到最大值的条件
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-indigo-100">
              <p class="font-mono text-xs text-indigo-700">当 X<sub>L</sub> = X<sub>C</sub> 时，阻抗最小，电流达到最大值：</p>
              <p class="font-mono text-xs text-indigo-700 mt-1">I<sub>max</sub> = U / R</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第二步：</strong>半功率点条件
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-indigo-100">
              <p class="font-mono text-xs text-indigo-700">当 I = I<sub>max</sub>/√2 时，对应的两个频率为 f<sub>1</sub> 和 f<sub>2</sub></p>
              <p class="font-mono text-xs text-indigo-700 mt-1">此时 |X<sub>L</sub> &#x2212; X<sub>C</sub>| = R，即 &#x3C9;L &#x2212; 1/(&#x3C9;C) = &#xB1;R</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第三步：</strong>求解带宽与Q值
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-indigo-100">
              <p class="font-mono text-xs text-indigo-700">解得：&#x394;&#x3C9; = &#x3C9;<sub>2</sub> &#x2212; &#x3C9;<sub>1</sub> = R/L</p>
              <p class="font-mono text-xs text-indigo-700 mt-1">因此：</p>
            </div>
          </div>
          
          <div class="flex items-center justify-center font-mono text-base bg-white/80 px-4 py-3 rounded-lg border border-indigo-200">
            <span>Q = </span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-indigo-600 px-2 pb-0.5 leading-none">&#x3C9;<sub>0</sub></span>
              <span class="pt-0.5 leading-none">&#x394;&#x3C9;</span>
            </div>
            <span class="mx-2">=</span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-indigo-600 px-2 pb-0.5 leading-none">f<sub>0</sub></span>
              <span class="pt-0.5 leading-none">BW</span>
            </div>
            <span class="mx-2">=</span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-indigo-600 px-2 pb-0.5 leading-none">&#x3C9;<sub>0</sub>L</span>
              <span class="pt-0.5 leading-none">R</span>
            </div>
          </div>
          
          <div class="bg-indigo-100 rounded-lg px-4 py-2 border-l-4 border-indigo-500">
            <p class="text-xs font-semibold text-indigo-800">💡 物理意义：Q值等于谐振频率与带宽之比，反映电路的频率选择性</p>
          </div>
        </div>
      </div>
      
      <!-- 方法二：利用相位-频率曲线 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">2</div>
          <h3 class="text-base font-semibold text-gray-800">利用相位-频率曲线（相频特性）</h3>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200 space-y-3">
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第一步：</strong>相位差表达式
            <div class="flex items-center justify-center font-mono text-sm bg-white/70 px-3 py-2 rounded-lg mt-2 border border-purple-100">
              <span>&#x3C6; = arctan</span>
              <div class="flex flex-col items-center mx-1">
                <span class="border-0 border-b border-solid border-purple-400 px-2 pb-0.5 leading-none">&#x3C9;L &#x2212; 1/(&#x3C9;C)</span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第二步：</strong>确定特征相位点
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-purple-100">
              <p class="font-mono text-xs text-purple-700">当 &#x3C6; = &#xB1;&#x3C0;/2 时，|X<sub>L</sub> &#x2212; X<sub>C</sub>| = R</p>
              <p class="text-xs text-gray-600 mt-1">此时电流为最大值的 1/√2 倍，对应半功率点</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第三步：</strong>建立方程
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-purple-100">
              <p class="font-mono text-xs text-purple-700">&#x3C9;<sub>1</sub>L &#x2212; 1/(&#x3C9;<sub>1</sub>C) = &#x2212;R （容性区，&#x3C6; = &#x2212;&#x3C0;/2）</p>
              <p class="font-mono text-xs text-purple-700 mt-1">&#x3C9;<sub>2</sub>L &#x2212; 1/(&#x3C9;<sub>2</sub>C) = +R （感性区，&#x3C6; = +&#x3C0;/2）</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第四步：</strong>求解频率差
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-purple-100">
              <p class="font-mono text-xs text-purple-700">两式相减：(&#x3C9;<sub>2</sub> &#x2212; &#x3C9;<sub>1</sub>)L + (1/(&#x3C9;<sub>1</sub>C) &#x2212; 1/(&#x3C9;<sub>2</sub>C)) = 2R</p>
              <p class="font-mono text-xs text-purple-700 mt-1">近似处理（高Q条件下）：&#x394;&#x3C9; &#x2248; R/L</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第五步：</strong>导出Q值
            <div class="flex items-center justify-center font-mono text-base bg-white/80 px-4 py-3 rounded-lg border border-purple-200 mt-2">
              <span>Q = </span>
              <div class="flex flex-col items-center mx-1">
                <span class="border-0 border-b-2 border-solid border-purple-600 px-2 pb-0.5 leading-none">&#x3C9;<sub>0</sub></span>
                <span class="pt-0.5 leading-none">&#x394;&#x3C9;</span>
              </div>
              <span class="mx-2">=</span>
              <div class="flex flex-col items-center mx-1">
                <span class="border-0 border-b-2 border-solid border-purple-600 px-2 pb-0.5 leading-none">&#x3C9;<sub>0</sub>L</span>
                <span class="pt-0.5 leading-none">R</span>
              </div>
            </div>
          </div>
          
          <div class="bg-purple-100 rounded-lg px-4 py-2 border-l-4 border-purple-500">
            <p class="text-xs font-semibold text-purple-800">💡 物理意义：&#xB1;&#x3C0;/2 相位点对应功率减半，相位变化率反映能量存储与耗散的比值</p>
          </div>
        </div>
      </div>
      
      <!-- 方法三：利用Q值的定义式 -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">3</div>
          <h3 class="text-base font-semibold text-gray-800">利用Q值的定义式（能量关系）</h3>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 space-y-3">
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第一步：</strong>Q值的能量定义
            <div class="flex items-center justify-center font-mono text-sm bg-white/70 px-3 py-2 rounded-lg mt-2 border border-green-100">
              <span>Q = 2&#x3C0; &#xD7; </span>
              <div class="flex flex-col items-center mx-1">
                <span class="border-0 border-b border-solid border-green-400 px-2 pb-0.5 leading-none">一个周期内储存的最大能量</span>
                <span class="pt-0.5 leading-none">一个周期内消耗的能量</span>
              </div>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第二步：</strong>计算储能与耗能
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-green-100">
              <p class="font-mono text-xs text-green-700">谐振时总储能：W<sub>stored</sub> = LI&#xb2;</p>
              <p class="font-mono text-xs text-green-700 mt-1">一个周期耗能：W<sub>diss</sub> = I&#xb2;R &#xD7; (2&#x3C0;/&#x3C9;<sub>0</sub>)</p>
            </div>
          </div>
          
          <div class="text-sm text-gray-700 leading-relaxed">
            <strong>第三步：</strong>代入定义式化简
            <div class="mt-2 bg-white/70 px-3 py-2 rounded-lg border border-green-100">
              <p class="font-mono text-xs text-green-700">Q = 2&#x3C0; &#xD7; (LI&#xb2;) / [I&#xb2;R &#xD7; (2&#x3C0;/&#x3C9;<sub>0</sub>)]</p>
              <p class="font-mono text-xs text-green-700 mt-1">化简得：</p>
            </div>
          </div>
          
          <div class="flex items-center justify-center font-mono text-base bg-white/80 px-4 py-3 rounded-lg border border-green-200">
            <span>Q = </span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-green-600 px-2 pb-0.5 leading-none">&#x3C9;<sub>0</sub>L</span>
              <span class="pt-0.5 leading-none">R</span>
            </div>
            <span class="mx-3">=</span>
            <div class="flex flex-col items-center mx-1">
              <span class="border-0 border-b-2 border-solid border-green-600 px-1 pb-0.5 leading-none">1</span>
              <span class="pt-0.5 leading-none">R</span>
            </div>
            <span class="mx-1">&#x221A;</span>
            <span class="border-0 border-b-2 border-solid border-green-600 px-1 pb-0.5 leading-none font-mono text-base">
              <span class="flex flex-col items-center">
                <span class="leading-none">L</span>
                <span class="leading-none mt-0.5">C</span>
              </span>
            </span>
          </div>
          
          <div class="bg-green-100 rounded-lg px-4 py-2 border-l-4 border-green-500">
            <p class="text-xs font-semibold text-green-800">💡 物理意义：Q值正比于储能元件(L,C)，反比于耗能元件(R)，体现电路的"品质"</p>
          </div>
        </div>
      </div>
      
      <!-- 总结对比 -->
      <div class="mt-6 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200">
        <div class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>📊</span>
          <span>三种方法的统一结论</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="bg-white rounded-lg p-3 border border-indigo-200">
            <div class="text-xs font-semibold text-indigo-700 mb-1">幅频特性法</div>
            <div class="font-mono text-sm text-gray-800">Q = f<sub>0</sub>/BW = &#x3C9;<sub>0</sub>L/R</div>
            <div class="text-xs text-gray-500 mt-1">实验测量：测幅频曲线半功率点</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-purple-200">
            <div class="text-xs font-semibold text-purple-700 mb-1">相频特性法</div>
            <div class="font-mono text-sm text-gray-800">Q = &#x3C9;<sub>0</sub>/&#x394;&#x3C9; = &#x3C9;<sub>0</sub>L/R</div>
            <div class="text-xs text-gray-500 mt-1">实验测量：测相频曲线&#xB1;&#x3C0;/2点</div>
          </div>
          <div class="bg-white rounded-lg p-3 border border-green-200">
            <div class="text-xs font-semibold text-green-700 mb-1">能量定义法</div>
            <div class="font-mono text-sm text-gray-800">Q = (1/R)&#x221A;(L/C)</div>
            <div class="text-xs text-gray-500 mt-1">理论计算：直接用元件参数</div>
          </div>
        </div>
        <div class="mt-3 text-xs text-gray-600 leading-relaxed bg-white rounded-lg p-3 border border-gray-200">
          <strong>核心要点：</strong>三种方法殊途同归，都得到 Q = &#x3C9;<sub>0</sub>L/R = (1/R)&#x221A;(L/C)。这表明Q值是电路的固有属性，既可通过实验测量（幅频/相频），也可通过理论计算（元件参数）获得。
        </div>
      </div>`

const before = lines.slice(0, startLine).join('\n')
const after = lines.slice(endLine).join('\n')
const newContent = before + '\n' + newSection + '\n\n    ' + after

writeFileSync(file, newContent, 'utf-8')
console.log('SUCCESS!')
