import { execSync } from 'node:child_process'

const ps = execSync(
  'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \'name=\\\"msedge.exe\\\"\' | Select-Object ProcessId,CommandLine | ConvertTo-Csv -NoTypeInformation"',
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
)
for (const line of ps.split(/\r?\n/)) {
  const m = line.match(/"(\d+)","(.*)"/)
  if (!m) continue
  const cmd = m[2]
  if (/tmp-(diag|sci)-edge/.test(cmd)) {
    console.log(`PID ${m[1]}:`)
    console.log('   ' + cmd.replace(/""/g, '"').slice(0, 300))
  }
}
