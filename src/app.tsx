import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Spinner } from '@/components/ui/spinner';
import IndexPage from '@/pages/index';
import NotFoundPage from '@/pages/not-found';
import { biliCoverLoader } from '@/pages/bili-cover.loader';

/**
 * 路由表。
 *
 * 用 `createBrowserRouter`（数据路由）而不是 `<BrowserRouter>`：需要 `loader`
 * 和 `<Form method="get">`。CSR 下 loader 就跑在浏览器里 —— B站封面的 `?url=`
 * 因此是可分享、可刷新、可后退的真状态，而不是藏在组件 state 里的东西。
 *
 * 每个工具都是 `lazy()` 的独立 chunk。封面制作那页尤其值：它一个人就有十个
 * 设置面板，没道理让只想打个水印的人也下这堆代码。
 *
 * 注意：`Suspense` 在这里是必要的（lazy 真的会挂起），这和主站
 * 「不要给已有 loader 数据的组件包 Suspense」那条不冲突 —— 那条讲的是流式 SSR
 * 会为无谓的边界生成占位，而这里根本没有 SSR。
 */
const CoverPage = lazy(() => import('@/pages/cover'));
const WatermarkPage = lazy(() => import('@/pages/watermark'));
const ConvertPage = lazy(() => import('@/pages/convert'));
const FilesPage = lazy(() => import('@/pages/files'));
const BiliCoverPage = lazy(() => import('@/pages/bili-cover'));
const TierPage = lazy(() => import('@/pages/tier'));
const AnimePage = lazy(() => import('@/pages/anime'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
      <Spinner className="size-4" />
      加载中…
    </div>
  );
}

/** 把 lazy 页面裹进 Suspense，省得每条路由各写一遍 */
function page(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    // 任意子路由抛错都落到这里，而不是整个应用白屏
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <IndexPage /> },
      { path: 'cover', element: page(CoverPage) },
      { path: 'watermark', element: page(WatermarkPage) },
      { path: 'convert', element: page(ConvertPage) },
      { path: 'files', element: page(FilesPage) },
      { path: 'bili-cover', element: page(BiliCoverPage), loader: biliCoverLoader },
      { path: 'tier', element: page(TierPage) },
      { path: 'anime', element: page(AnimePage) },
      // catch-all 兜 404。部署时还需要服务端把未知路径回退到 index.html
      // （见 public/_redirects），否则直接刷新深链接根本到不了这里
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
