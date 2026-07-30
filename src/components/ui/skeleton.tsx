import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Shell 风格骨架屏：45° 斜纹缓慢滚动的扫描块（高对比度，近黑背景上清晰可见）。
 * 样式定义在 styles.css 的 .shell-skeleton。
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" aria-hidden="true" className={cn('shell-skeleton', className)} {...props} />
  );
}

export { Skeleton };
