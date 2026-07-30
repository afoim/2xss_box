import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { TOOLS } from '@/lib/tools';
import { SITE_AVATAR, SITE_NAME } from '@/lib/site';

/**
 * 全站外壳：顶栏 + 内容 + 页脚。
 *
 * 顶栏的工具列表是**横向可滚动的一排真链接**，不是汉堡菜单里的浮层 —— 七个条目
 * 在手机上滑一下就到头，而一旦做成 useState 驱动的浮层，就得再处理点外面关闭、
 * Esc 关闭、路由变化时关闭那一串状态，还得自己管焦点。
 * 滚动条本身藏掉（`[scrollbar-width:none]` + `::-webkit-scrollbar`），
 * 那条横杠横在顶栏里很难看，而内容明显被截断已经足够提示「还能滑」。
 */
function TopNav() {
  return (
    <nav
      aria-label="工具"
      className="-mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TOOLS.map((tool) => (
        <NavLink
          key={tool.slug}
          to={tool.slug}
          className={({ isActive }) =>
            `flex h-8 shrink-0 items-center gap-1.5 border px-2.5 font-mono text-xs tracking-tight transition-colors duration-75 ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-transparent text-muted-foreground hover:bg-foreground hover:text-background'
            }`
          }
        >
          <Icon icon={tool.icon} className="size-4" />
          {tool.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  return (
    <>
      {/* sticky 而不是 fixed：fixed 需要给 body 补 padding-top，而且一旦顶栏加了
          backdrop-filter，它就会成为内部 fixed 后代的包含块（踩过：抽屉被压进
          56px 高的 header 里）。sticky 没有这些问题。 */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 font-mono text-sm font-bold tracking-tight"
          >
            {/* 宽高写死：头像是跨域原图，不给尺寸的话它落地前顶栏会抖一下 */}
            <img
              src={SITE_AVATAR}
              alt=""
              width={24}
              height={24}
              className="size-6 border border-border object-cover"
            />
            <span className="hidden sm:inline">{SITE_NAME}</span>
          </Link>
          <span className="h-5 w-px shrink-0 bg-border" />
          <TopNav />
        </div>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 font-mono text-xs text-muted-foreground">
          <p className="min-w-0">
            全部工具在浏览器本地运行。图片与字体
            <strong className="text-foreground">不会上传</strong>
            到任何服务器 —— 「B站封面」「文件」「追番」三项只请求各自的公开只读接口。
          </p>
          <a
            href="https://2x.nz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Icon icon="mdi:open-in-new" className="size-3.5" />
            {SITE_NAME.replace('工具箱', '')} · 2x.nz
          </a>
        </div>
      </footer>

      {/* 客户端导航默认保留滚动位置，从长列表点进详情会停在半山腰 */}
      <ScrollRestoration />
    </>
  );
}
