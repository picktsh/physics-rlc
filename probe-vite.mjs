// probe vite transform results
const main = await fetch('http://127.0.0.1:5174/src/main.js')
console.log('main.js =>', main.status)
const cb = await fetch('http://127.0.0.1:5174/src/components/CircuitBoard.vue')
console.log('CircuitBoard.vue =>', cb.status)
const t = await cb.text()
console.log('body =>', t.slice(0, 300).replace(/\n/g, ' '))
