import { execSync } from 'node:child_process'

// 杀 .tmp-animchk 相关残留:命令行含 animchk 的 node / msedge
const ps = execSync(
  'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -in @(\'node.exe\',\'msedge.exe\') } | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Csv -NoTypeInformation"',
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
)
const rows = []
for (const line of ps.split(/\r?\n/)) {
  const m = line.match(/"(\d+)","(\d+)","([^"]*)","(.*)"/)
  if (m) rows.push({ pid: m[1], ppid: m[2], name: m[3], cmd: m[4].replace(/""/g, '"') })
}
const targets = new Set()
for (const r of rows) if (/animchk/.test(r.cmd)) targets.add(r.pid)
// 级联收集子进程
let grew = true
while (grew) {
  grew = false
  for (const r of rows) if (targets.has(r.ppid) && !targets.has(r.pid)) { targets.add(r.pid); grew = true }
}
for (const pid of targets) {
  try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }) } catch {}
}
console.log('killed:', [...targets].join(','))
