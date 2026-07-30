import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { FileExplorer } from '@/components/file-explorer';
import type { FileItem } from '@/lib/file-utils';
import { useTitle } from '@/lib/use-title';

const FILES_BASE_URL =
  (import.meta.env.VITE_FILES_BASE_URL as string | undefined) || 'https://raw-files.2x.nz';
const FILES_INDEX_URL = `${FILES_BASE_URL}/index.json`;

export default function FilesPage() {
  useTitle('文件索引');

  const [fileTree, setFileTree] = useState<FileItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(FILES_INDEX_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<FileItem[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setFileTree(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      {/* 整页内容原本被一层 bg-card + p-6 + ring 包住，窄屏白吃 48px 宽度；
          页面只有这一块内容，外框不承载信息 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Icon icon="mdi:folder-open" className="size-6 text-primary" />
          文件索引
        </h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>这里展示了托管的各项公开资源，你可以点击查看并下载。</p>
          {/* 带底色的块要 full-bleed：只删内边距不补回来的话，
              窄屏上文字会直接顶在色块边缘 */}
          <div className="-mx-4 flex items-start gap-2 border-y border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive sm:mx-0 sm:border">
            <Icon icon="mdi:alert-outline" className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs">
              免责声明：本站不对任何文件的安全性做保证，请在下载或运行前自行核实，风险自担。
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Spinner className="mr-2 size-5" />
            正在加载文件列表…
          </div>
        )}
        {error && (
          <div className="border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            加载失败：{error}
          </div>
        )}
        {fileTree && <FileExplorer items={fileTree} baseUrl={FILES_BASE_URL} />}
      </div>
    </div>
  );
}
