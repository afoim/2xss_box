import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { Icon } from '@/components/ui/icon';
import { TOOLS } from '@/lib/tools';
import { useTitle } from '@/lib/use-title';

/**
 * 兜底页：既当 404（catch-all 路由），也当 errorElement。
 *
 * `useRouteError()` 在普通路由里返回 undefined，所以同一个组件两用没问题。
 */
export default function NotFoundPage() {
  const error = useRouteError();
  const is404 = !error || (isRouteErrorResponse(error) && error.status === 404);

  useTitle(is404 ? '页面不存在' : '出错了');

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-20">
      <p className="font-mono text-sm text-muted-foreground">
        {is404 ? '404' : isRouteErrorResponse(error) ? String(error.status) : 'ERROR'}
      </p>
      <h1 className="mt-2 font-mono text-3xl font-bold tracking-tight">
        {is404 ? '这里什么都没有' : '页面出错了'}
      </h1>
      {!is404 && (
        <pre className="mt-4 overflow-x-auto border border-border bg-card p-3 font-mono text-xs text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}

      <p className="mt-6 text-sm text-muted-foreground">去别处看看：</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/"
          className="inline-flex h-8 items-center gap-1.5 border border-border px-2.5 font-mono text-xs transition-colors hover:bg-foreground hover:text-background"
        >
          <Icon icon="mdi:home-outline" className="size-4" />
          首页
        </Link>
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            to={tool.slug}
            className="inline-flex h-8 items-center gap-1.5 border border-border px-2.5 font-mono text-xs transition-colors hover:bg-foreground hover:text-background"
          >
            <Icon icon={tool.icon} className="size-4" />
            {tool.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
