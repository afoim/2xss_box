import { useEffect, useState, type ComponentType } from 'react';
// **只导入类型**：`import type` 在编译期被完全擦除，不会把 @iconify/react 的
// 51KB 运行时拽进包里。运行时实现走下面 RuntimeIcon 里的动态 import()。
import type { IconProps } from '@iconify/react';
import { cn } from '@/lib/utils';
import subset from '@/lib/icons/subset.json';

/**
 * 图标。
 *
 * `@iconify/react` 默认在运行时向 Iconify API 拉图标数据 —— 每个图标一次
 * 网络往返，断网就是一片空白，首屏还会闪。这里走的是构建期子集：
 * `scripts/build-icon-subset.mjs` 扫描源码里出现过的图标名字面量，从
 * `@iconify-json/*` 抽出对应数据写进 `src/lib/icons/subset.json`，渲染时直接
 * 查表出 `<svg>`，零请求。
 *
 * 表里没有的名字（例如封面工具里用户搜出来的 `simple-icons:*`）才回退到
 * `<IconifyIcon>` 的运行时加载路径 —— 那条路径**必须是动态 import**，否则
 * @iconify/react 的整个运行时会被打进每个页面都要下的共享块。
 */
interface IconData {
  body: string;
  width: number;
  height: number;
  left: number;
  top: number;
}

const ICONS: Record<string, IconData> = {};
for (const [prefix, collection] of Object.entries(
  subset as Record<
    string,
    { icons: Record<string, Partial<IconData>>; width?: number; height?: number }
  >,
)) {
  for (const [name, data] of Object.entries(collection.icons)) {
    ICONS[`${prefix}:${name}`] = {
      body: data.body ?? '',
      width: data.width ?? collection.width ?? 24,
      height: data.height ?? collection.height ?? 24,
      left: data.left ?? 0,
      top: data.top ?? 0,
    };
  }
}

interface Props extends Omit<IconProps, 'icon'> {
  icon: string;
  className?: string;
}

export function Icon({ icon, className, ...props }: Props) {
  const wrapper = cn('inline-flex items-center justify-center shrink-0 leading-none', className);
  const data = ICONS[icon];

  if (data) {
    return (
      <span className={wrapper}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${data.left} ${data.top} ${data.width} ${data.height}`}
          className="size-full block"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      </span>
    );
  }

  return (
    <span className={wrapper}>
      <RuntimeIcon icon={icon} {...props} />
    </span>
  );
}

/** 已解析的 @iconify/react <Icon>，模块级缓存，避免每个未收录图标各触发一次状态切换 */
let LoadedIconify: ComponentType<IconProps> | null = null;

/** 未收录图标的运行时兜底：effect 里手动 import，落地后再换成真图标 */
function RuntimeIcon({ icon, ...props }: Props) {
  const [Loaded, setLoaded] = useState<ComponentType<IconProps> | null>(LoadedIconify);

  useEffect(() => {
    if (LoadedIconify) return;
    let alive = true;
    import('@iconify/react').then((m) => {
      LoadedIconify = m.Icon;
      if (alive) setLoaded(() => m.Icon);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!Loaded) return <span className="size-full block" />;
  return <Loaded icon={icon} className="size-full block" {...props} />;
}
