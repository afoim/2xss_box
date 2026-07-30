import type { LoaderFunctionArgs } from 'react-router';
import { resolveBiliCover } from '@/lib/bili-cover';

/**
 * loader 单独放一个模块，**不要和页面组件放同一个文件**。
 *
 * 路由表必须在启动时就拿到 loader（静态 import），而页面组件是 `lazy()` 的
 * （动态 import）。同一个文件被两种方式导入时，Rollup 会放弃拆分它并警告
 * `INEFFECTIVE_DYNAMIC_IMPORT` —— 结果就是整个 B站封面页被塞进主 chunk，
 * 首页访客白下一份。
 */
export interface BiliCoverResult {
  /** 回填输入框用的原始查询串 */
  input: string;
  pic: string;
  error: string;
}

/**
 * CSR 下 loader 就跑在浏览器里，所以用它不是「SSR 的残留」而是白拿的好处：
 * `?url=` 因此是可分享、可刷新、可后退的真状态，而不是藏在组件 state 里的东西。
 */
export async function biliCoverLoader({ request }: LoaderFunctionArgs): Promise<BiliCoverResult> {
  const input = new URL(request.url).searchParams.get('url')?.trim() ?? '';
  if (!input) return { input: '', pic: '', error: '' };
  const { pic = '', error = '' } = await resolveBiliCover(input);
  return { input, pic, error };
}
