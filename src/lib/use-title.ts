import { useEffect } from 'react';
import { SITE_NAME } from './site';

/**
 * CSR 下没有 `meta()` 可用（那是 RR7 SSR 框架模式的东西），标题只能在浏览器里改。
 *
 * 代价要说清楚：**首屏 HTML 里的 title 永远是 index.html 那一个**，爬虫和
 * 社交平台的 unfurl 拿不到分页面标题。工具页本来也不需要被索引；真要 SEO
 * 就得回到 SSR 或加预渲染，不要试图用这个 hook 补。
 */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  }, [title]);
}

export { SITE_NAME };
