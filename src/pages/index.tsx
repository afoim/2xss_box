import { Link } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { TOOLS } from '@/lib/tools';
import { SITE_AVATAR, SITE_NAME } from '@/lib/site';
import { useTitle } from '@/lib/use-title';

/**
 * 工具索引。
 *
 * 布局遵循「全站无卡片」那套：不给每项套 `border + bg-card` 再用 gap 隔开，
 * 而是**连体网格线** —— 容器 `border-t md:border-l`，每项 `border-b md:border-r`，
 * 竖线只在多列断点（md）出现。单列时左右内边距归零（`py-5 md:p-5`）：手机上
 * 一行只有一项，左右 padding 只是在挤内容。
 */
export default function IndexPage() {
  useTitle();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <img
          src={SITE_AVATAR}
          alt=""
          width={56}
          height={56}
          className="size-14 shrink-0 border border-border object-cover"
        />
        <div className="min-w-0">
          <h1 className="font-mono text-3xl font-bold tracking-tight">{SITE_NAME}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            从 2x.nz 整块搬出来的六个工具页 + 追番记录，重写成纯客户端渲染的独立单页应用。
            没有服务端，产物就是一堆静态文件。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 border-t border-border md:grid-cols-2 md:border-l">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            to={tool.slug}
            className="group flex gap-4 border-b border-border py-5 transition-colors duration-75 hover:bg-card md:border-r md:p-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center border border-border transition-colors group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
              <Icon icon={tool.icon} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              {/* flex-wrap：图标 + 标题 + 角标，三个行内元素在窄屏必须能换行 */}
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-medium tracking-tight">{tool.title}</span>
                <span
                  className={`shrink-0 border px-1.5 py-px font-mono text-[10px] tracking-tight ${
                    tool.online
                      ? 'border-border text-muted-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {tool.online ? '需联网' : '纯本地'}
                </span>
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
                {tool.desc}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* 带底色的提示块要 full-bleed：只删内边距不补回来的话，窄屏上文字会直接
          顶在色块边缘。`-mx-4 px-4 sm:mx-0` 让背景铺到屏幕边缘、文字回到与页面
          其它内容同一条竖线上。 */}
      <div className="-mx-4 mt-10 border-y border-border bg-card px-4 py-5 sm:mx-0 sm:border sm:p-5">
        <h2 className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight">
          <Icon icon="mdi:shield-check-outline" className="size-4" />
          关于隐私
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">水印 / 图片转换 / 从夯到拉</strong>
            ：图片经 <code className="font-mono text-xs">URL.createObjectURL</code> 与 canvas
            在本地处理，一个字节都不出浏览器。
          </li>
          <li>
            <strong className="text-foreground">封面制作</strong>
            ：背景图与字体也在本地；只有搜图标时会请求 Iconify 的公开 API。
          </li>
          <li>
            <strong className="text-foreground">B站封面 / 文件 / 追番</strong>
            ：只做只读 GET，请求内容分别是你粘贴的链接、文件目录树和公开的番剧收藏。
          </li>
        </ul>
      </div>
    </main>
  );
}
