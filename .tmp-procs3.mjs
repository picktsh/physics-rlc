import { execSync } from 'node:child_process'

const ps = execSync(
  'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \'name=\\\"node.exe\\\"\' | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Csv -NoTypeInformation"',
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
)
for (const line of ps.split(/\r?\n/)) {
  const m = line.match(/"(\d+)","(\d+)","(.*)"/)
  if (!m) continue
  const pid = m[1]
  if (['5012', '25504', '28120', '29580', '29672', '31512'].includes(pid)) {
    console.log(`PID ${pid} (parent ${m[2]}):`)
    console.log('   ' + m[3].replace(/""/g, '"').slice(0, 260))
  }
}
