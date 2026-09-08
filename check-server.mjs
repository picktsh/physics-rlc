// 临时脚本:验证 dev server 是否可达
for (const url of ['http://127.0.0.1:5174/', 'http://localhost:5174/', 'http://10.96.163.189:5174/']) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    const text = await res.text()
    console.log(url, '=>', res.status, 'html-bytes:', text.length, 'has-root:', text.includes('<div id="app">'))
  } catch (e) {
    console.log(url, '=> ERROR', e.message)
  }
}
