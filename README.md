# 二叉树树工具箱（2xss_box）

从 [2x.nz](https://2x.nz)（React Router 7 服务端框架模式 / 全站 SSR）整块搬出来的工具页，
重写成**纯客户端渲染**的独立单页应用。产物就是一个 `index.html` + 一堆哈希资源，
没有任何服务端。

| 路由 | 工具 | 联网 |
|---|---|---|
| `/cover` | 封面制作 —— 文字 + 图标 + 背景图合成，多比例预览，导出 PNG / SVG | 搜图标时请求 Iconify 公开 API |
| `/watermark` | 图片水印 —— 单个定位（四角）或全屏平铺 | 否 |
| `/convert` | 图片转换 —— PNG / JPEG / WebP / BMP / AVIF 批量互转 | 否 |
| `/files` | 文件索引 —— 浏览下载公开资源 | `raw-files.2x.nz` |
| `/bili-cover` | B站封面提取 —— BV / AV / b23 短链 / 分享文本 | `bili-pic.2x.nz` |
| `/tier` | 从夯到拉 —— 拖拽排名，导出成图 | 否 |
| `/anime` | 追番记录 —— Bangumi「看过」的收藏 | `api-bgm-tv.2x.nz` |

「水印 / 图片转换 / 从夯到拉」的图片经 `URL.createObjectURL` 与 canvas 在本地处理，
**一个字节都不出浏览器**。

---

## 开发

```bash
pnpm install
pnpm dev        # http://localhost:5180
pnpm build      # 图标子集 → tsc --noEmit → vite build → dist/
pnpm preview
```

`pnpm dev` / `pnpm build` 会先跑 `scripts/build-icon-subset.mjs`，从
`@iconify-json/*` 里抽出源码中出现过的图标名，生成 `src/lib/icons/subset.json`
（当前 51 个图标 / 10.7 KB）。`Icon` 组件直接查表出 `<svg>`，**零网络请求**；
表里没有的名字（封面工具里用户搜出来的 `simple-icons:*`）才回退到
`@iconify/react` 的运行时加载路径，那条路径是动态 `import()`，不进主 chunk。

### `pnpm-workspace.yaml` 别删

它把本目录声明成自己的 pnpm 根。这个项目一度放在 `svaf-next` 仓库树里，而上一级也有
一份 `pnpm-workspace.yaml` —— 没有这个文件时 pnpm 会一路往上找到那个根，把这里的依赖
当成外部包忽略掉。症状很迷惑：`pnpm install` 秒完、报 `resolved 3`、连 `node_modules`
都不建。

---

## 部署

与 [`2xss_hub`](https://github.com/afoim/2xss_hub) 同一套模型：

```
edit ──────────────── 源码（GitHub 默认分支，日常都推这里）
  │
  │  push 触发 .github/workflows/deploy.yml
  ▼
GitHub Actions ────── pnpm install → pnpm build → 校验产物
  │
  ▼
main ──────────────── 纯产物：dist/ + wrangler.jsonc（每次强制覆盖）
  │
  ▼
Cloudflare Workers ── 静态资源直接取用，**不在 CDN 侧构建**
```

两条必须知道的：

- **`main` 上任何独有提交都会被永久抹掉**，别把它当备份。
- **构建和推送必须在同一个 workflow 里**。GitHub 的官方行为是：用仓库自带的
  `GITHUB_TOKEN` 推送**不会触发**任何下游 workflow，而且不报错 —— 拆成两个的话
  `main` 前进了、站点没更新，查都没处查。

### `wrangler.jsonc` 里唯一不能照抄 hub 的一行

```jsonc
"not_found_handling": "single-page-application"
```

hub 那边写的是 `404-page`。这里是客户端路由的 SPA，`/cover`、`/bili-cover?url=…`
在磁盘上根本没有对应文件，`404-page` 会让**直接刷新深链接变成真 404**，只有从首页点
进去才行。`single-page-application` 对未命中的路径回 `index.html` + 200，交给
`createBrowserRouter` 接管。

**别再加 `public/_redirects`。** 那是 Cloudflare Pages 的写法，但 Workers 静态资源
也会读并校验它 —— `/*  /index.html  200` 配上 `drop-trailing-slash` 会被判成死循环，
整个 deploy 直接失败：

```
Invalid _redirects configuration:
Line 4: Infinite loop detected in this rule. This would cause a redirect to
strip `.html` or `/index` and end up triggering this rule again. [code: 100324]
```

换到别的托管上时，SPA 回退各写各的：nginx 是 `try_files $uri $uri/ /index.html;`，
Netlify 才用 `_redirects`。

---

## 三个外部接口

全部**已经在跑**，且都带 `Access-Control-Allow-Origin: *`，浏览器直接读得到 ——
所以这个项目不需要任何代理、不需要 Worker，是真的纯静态。地址都可以用环境变量换掉
（见 `.env.example`），代码不用动。

| 用途 | 默认地址 | 契约 |
|---|---|---|
| B站封面 | `https://bili-pic.2x.nz/?url=` | `GET <前缀><encodeURIComponent(输入)>` → `{"pic": "http://i0.hdslb.com/..."}` |
| 文件索引 | `https://raw-files.2x.nz` | `GET <base>/index.json` → 目录树；文件也从这个域下载 |
| 追番 | `https://api-bgm-tv.2x.nz` | Bangumi API v0 代理，按 50 条一页翻 |

几个不写下来下次一定会重新踩的点：

- **B站接口回的封面地址是 `http://`**，直接贴进 HTTPS 页面就是混合内容，会被浏览器
  拦掉、图裂。`src/lib/bili-cover.ts` 里统一升到 https。
- `bili-pic.2x.nz` 是一个独立的小服务，不在本仓库里：抠 URL、跟 b23 短链、问官方
  `x/web-interface/view` 三步都在它那边做完了，所以前端只发一次请求。
- **Bangumi 代理已经把封面地址改写成了 `lain-bgm-tv.2x.nz`**（官方 `lain.bgm.tv`
  国内连不上），前端拿到就能直接用，不用再 replace 一遍。
- 请求里**不要设 `User-Agent`** —— 那是 fetch 的 forbidden header，浏览器直接丢掉，
  写了只是自欺欺人（主站那份客户端实现里那行就是无效的）。

---

## 与主站的关系

**分叉拷贝，不是同步。** 主站 2x.nz 的 `/cover`、`/watermark`、`/convert`、
`/files`、`/bili-cover`、`/tier`、`/anime` 仍在正常服务，改这边不会同步过去，反之亦然。

搬过来时顺手修掉的几处（主站那边仍在）：

- **水印页第一次选图不出水印**：`setImageSrc` 写在 `img.onload` 外面，绘制 effect 跑
  的时候 `imageLoadedRef.current` 还是 `null`，得手动动一下参数才会画。现在 `setState`
  挪进 `onload`。
- **封面页拖颜色滑杆会狂发网络请求**：原本有两段逐字节相同的 effect，一段监听图标名、
  一段监听颜色，两段都重新 `fetch` 一遍 svg。上色只是字符串替换，现在原始 svg 进模块级
  缓存，换色只走本地。
- **上传字体泄漏 object URL**：连传几个字体文件（动辄几十 MB）而不释放旧的，标签页一路
  涨。现在换字体 / 移除字体 / 卸载都会 `revokeObjectURL`。
- **搜图标没有加载指示器**：`isSearching` 一直是设了不用的死状态，而搜索是 500ms 防抖 +
  一次网络往返，打完字有一秒多什么都不动，看着像坏了。
- `mdi:font-download` 在 mdi 集里不存在（那是 Material Icons 的名字），换成
  `mdi:format-font`，否则这一个图标会白白拖一次 `@iconify/react` 的 chunk。

CSR 化本身丢掉的东西，也一并说清楚：

- **没有服务端渲染，就没有分页面的 SEO**。首屏 HTML 里的 `<title>` 永远是
  `index.html` 那一个，`useTitle()` 只在浏览器里改，爬虫和社交平台 unfurl 拿不到。
  工具页本来也不需要被索引 —— 真要 SEO 得回到 SSR 或加预渲染，别试图用那个 hook 补。
- **禁用 JS 就是白屏**。主站那边「无 JS 可用性是硬指标」，这里做不到，也不打算做。

---

## 设计系统

沿用主站的自研「Shell UI」（`src/components/ui/`，无第三方 UI 依赖）：
终端风格，近黑灰阶 `oklch(0.205)`≈`#171717` 背景 + `oklch(0.92)` 前景、**零圆角**
（`styles.css` 里全局归零，含 `rounded-full`）、实色 1px 边框、mono 字体 chrome、
反色 hover。浮层基于 `createPortal` + 手写定位。

两条布局约定（照搬主站，改动时请一起遵守）：

1. **全站无卡片**：内容不套壳，边界只用分隔线。列表/网格用**连体网格线**
   （容器 `border-t md:border-l`，每项 `border-b md:border-r`，竖线只在多列断点出现），
   不要 `gap-4` + 独立卡片。单列时左右内边距归零（`py-4 md:p-4`）。
2. **带底色的块要 full-bleed**：`-mx-4 px-4 sm:mx-0`，让背景铺到屏幕边缘、文字回到与
   页面其它内容同一条竖线上。只删内边距不补回来的话，窄屏上文字会直接顶在色块边缘。
   `<Card>` 自己已经是 full-bleed 的，**调用点不要再加 `border-x-0` / `px-0`**。
