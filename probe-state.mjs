// quick page state probe
const PORT = 9340
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let wsUrl = null
for (let i = 0; i < 20; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
    const list = await res.json()
    const page = list.find((t) => t.type === 'page')
    if (page) { wsUrl = page.webSocketDebuggerUrl; break }
  } catch {}
  await sleep(300)
}
const ws = new WebSocket(wsUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let id = 0
const pend = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.method === 'Runtime.consoleAPICalled') {
    console.log('CONSOLE[' + m.params.type + ']', m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300))
  }
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evl = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value
await send('Runtime.enable')
await sleep(500)
console.log('href =>', await evl('location.href'))
console.log('title =>', await evl('document.title'))
console.log('hasApp =>', await evl("!!document.querySelector('#app')"))
console.log('bodyHead =>', await evl('document.body ? document.body.innerText.slice(0, 300) : null'))
ws.close()
process.exit(0)
