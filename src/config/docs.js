// 文档中心单一数据源：内置篇目清单 + 会话暂存口径。
// 新增内置文档：把 md 放进 public/docs/ 后在此登记一行即可，视图 / store 无需改动。

// 本地拖入 tab 的会话快照 key：sessionStorage，刷新保留、× 手动关闭清除
// （命名沿用全站 rlc_ 前缀惯例，见 stores/historyDB.js）
export const DOCS_TABS_KEY = 'rlc_docs_tabs'
// 当前激活 tab key 的会话记忆：刷新后停在原阅读位置；指向已消失的 local tab / 已下线内置文档时回退首篇内置
export const DOCS_ACTIVE_KEY = 'rlc_docs_active'
// 单个本地 md tab 允许进 sessionStorage 的字节上限；超过则 tab 转 transient（能预览但不落盘）
export const DOCS_TAB_PERSIST_MAX_BYTES = 1 * 1024 * 1024
// 所有本地 tab 累计字节上限（sessionStorage 浏览器配额一般 5 MB，留余量）
export const DOCS_TABS_TOTAL_MAX_BYTES = 3 * 1024 * 1024
// zip 压缩包体积上限，超过直接跳过（避免长时间冻结主线程）
export const DOCS_ZIP_MAX_BYTES = 50 * 1024 * 1024
// 内置文档元数据：文件名→展示标题；fetch 时 encodeURIComponent。
// 来源两种形态：默认从 public/docs/ 静态 fetch（大文档不进 bundle）；
// 带 getRaw 的条目为 ?raw 构建期内联（适合仓库根文件，单一来源不必拷进 public，dev 改文件热更新）。
// 动态 import 仅在文档页 chunk 加载后才执行，不增加首页体积。
export const DOCS_BUILTIN = [{ file: '操作指南.md', title: '操作指南' }]
