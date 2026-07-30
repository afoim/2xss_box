/**
 * 工具清单 —— **唯一的权威索引**。
 *
 * 索引页、顶栏导航、每页的标题与文档 title 全部从这里派生。新增工具时改这一处
 * 再去 `src/app.tsx` 挂一条路由即可；不要在别处再抄一份清单（原仓库的
 * `src/lib/nav.ts` 与各页面标题就是两份，改一处漏一处）。
 */
export interface Tool {
  /** 路由 path，同时是 key。**无尾斜杠**（沿用原站的 URL 规范形态） */
  slug: string;
  /** 导航与索引卡上的名字 */
  label: string;
  /** 页面里的完整标题（可能比 label 长） */
  title: string;
  /** mdi 图标名，构建期会被 scripts/build-icon-subset.mjs 抽成内联 svg */
  icon: string;
  /** 索引页上的一句话说明 */
  desc: string;
  /** 是否需要联网。false = 图片全程留在浏览器里，不上传 */
  online: boolean;
}

export const TOOLS: Tool[] = [
  {
    slug: '/cover',
    label: '封面制作',
    title: '封面制作',
    icon: 'mdi:image-edit',
    desc: '文字 + 图标 + 背景图合成封面，多比例同时预览，导出 PNG / SVG，支持 1~4 倍率。',
    online: true,
  },
  {
    slug: '/watermark',
    label: '水印',
    title: '图片水印',
    icon: 'mdi:water',
    desc: '给图片打文字水印，单个定位（四角）或全屏平铺，字号与不透明度实时可调。',
    online: false,
  },
  {
    slug: '/convert',
    label: '图片转换',
    title: '图片转换',
    icon: 'mdi:swap-horizontal-bold',
    desc: 'PNG / JPEG / WebP / BMP / AVIF 批量互转，逐张自动下载。',
    online: false,
  },
  {
    slug: '/files',
    label: '文件',
    title: '文件索引',
    icon: 'mdi:folder-open',
    desc: '浏览并下载托管在对象存储上的公开资源，目录可逐级进入。',
    online: true,
  },
  {
    slug: '/bili-cover',
    label: 'B站封面',
    title: 'B站封面提取',
    icon: 'mdi:image-search',
    desc: 'BV 号 / AV 号 / b23.tv 短链 / 一整段分享文本，粘贴即出原图封面。',
    online: true,
  },
  {
    slug: '/tier',
    label: '从夯到拉',
    title: 'Tier List 制作器',
    icon: 'mdi:podium-gold',
    desc: '拖拽把图片排进「夯 / 顶级 / 人上人 / NPC / 拉」五档，一键导出成图。',
    online: false,
  },
  {
    slug: '/anime',
    label: '追番',
    title: '追番记录',
    icon: 'mdi:play-box-multiple',
    desc: '从 Bangumi 拉「看过」的收藏，按最近更新排序展示评分与短评。',
    online: true,
  },
];

export function findTool(pathname: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === pathname);
}
