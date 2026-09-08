import { execSync } from 'node:child_process'

// 1) node 进程及命令行
const ps = execSync(
  'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv',
  { encoding: 'utf8', shell: 'cmd.exe' }
)
console.log('--- node.exe processes ---')
for (const line of ps.split(/\r?\n/)) {
  const c = line.trim()
  if (!c || c.startsWith('Node,') || c.startsWith('"Node')) continue
  const m = c.match(/(\d+),(.*)$/)
  if (m) console.log(`PID ${m[1]}  ${m[2].slice(0, 200)}`)
}

// 2) 5170-5180 端口监听
console.log('--- ports 5170-5180 ---')
const net = execSync('netstat -ano', { encoding: 'utf8', shell: 'cmd.exe' })
for (const line of net.split(/\r?\n/)) {
  if (/LISTENING/.test(line) && /:517\d\b/.test(line)) console.log(line.trim())
}
