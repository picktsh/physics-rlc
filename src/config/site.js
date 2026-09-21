// 全站站点信息单一数据源:页眉、页脚、浏览器标题共用一份,避免多处文案漂移。
// 浏览器标题由 router/index.js afterEach 据此拼接(格式:页面名 · 站名,首页仅站名);
// index.html 的静态 <title> 是 JS 执行前的首屏兜底,须与 siteName 保持一致(故意重复)。
export const siteName = 'RLC 数字仿真平台'
export const siteDesc = '面向 RLC 电路实验的理论仿真、实测比对、误差分析与工程应用'
