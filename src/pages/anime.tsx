import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { fetchWatchedAnime } from '@/lib/anime';
import type { BangumiCollectionItem } from '@/lib/anime-types';
import { useTitle } from '@/lib/use-title';

function coverUrl(img: BangumiCollectionItem['subject']['images']): string {
  return img.medium || img.common || img.large || img.small || '';
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function AnimeCard({ item }: { item: BangumiCollectionItem }) {
  const { subject } = item;
  const src = coverUrl(subject.images);
  const score = subject.score ?? 0;

  return (
    <a
      href={`https://bangumi.tv/subject/${subject.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block border-b border-border bg-background py-4 transition-colors duration-75 hover:bg-card md:border-r md:p-4"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="w-16 shrink-0 sm:w-28">
          {/* loading=lazy + 尺寸 + fetchPriority=low：一页几百张封面，
              不能和首屏内容抢带宽 */}
          <img
            src={src}
            alt={subject.name_cn || subject.name || ''}
            className="aspect-[3/4] w-full bg-muted object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm leading-snug font-semibold transition-colors group-hover:text-rose-400 sm:text-base">
            {subject.name_cn || subject.name}
          </h3>
          {subject.name_cn && subject.name && subject.name_cn !== subject.name && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subject.name}</p>
          )}

          {/* flex-wrap：这一行常有 4 个行内小元素，窄屏必须能换行 */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {score > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Icon icon="mdi:star-outline" className="size-3.5" />
                {score}
              </span>
            )}
            {item.rate > 0 && <span className="shrink-0 text-rose-500">我的评分: {item.rate}</span>}
            {subject.eps > 0 && <span className="shrink-0">{subject.eps} 集</span>}
            {subject.date && <span className="shrink-0">{subject.date}</span>}
          </div>

          {subject.short_summary && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
              {truncate(subject.short_summary.replace(/\n/g, ' '), 200)}
            </p>
          )}

          {item.comment && (
            <p className="mt-1.5 flex items-start gap-1 text-xs text-rose-400/80 italic">
              <Icon icon="mdi:format-quote-open" className="mt-0.5 size-3 shrink-0" />
              {item.comment}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

export default function AnimePage() {
  useTitle('追番记录');

  const [items, setItems] = useState<BangumiCollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    fetchWatchedAnime(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('获取追番数据失败，请稍后重试');
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
            追番记录
          </h1>
          {!loading && (
            <button
              type="button"
              onClick={load}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-border px-2.5 font-mono text-xs transition-colors hover:bg-foreground hover:text-background"
            >
              <Icon icon="mdi:refresh" className="size-4" />
              刷新
            </button>
          )}
        </div>

        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          {loading ? (
            <>
              <Spinner className="size-3.5" />
              正在翻页取数据…
            </>
          ) : (
            `已观看 ${items.length} 部动画`
          )}
        </p>
      </div>

      {error && (
        <div className="-mx-4 mb-6 border-y border-destructive/50 bg-destructive/10 px-4 py-4 text-sm text-destructive sm:mx-0 sm:border">
          {error}
        </div>
      )}

      {/* 连体网格线：容器 border-t md:border-l，每项 border-b md:border-r，
          竖线只在多列断点出现 */}
      <div className="grid grid-cols-1 border-t border-border md:grid-cols-2 md:border-l xl:grid-cols-3">
        {loading
          ? Array.from({ length: 9 }).map((_, c) => (
              <div key={c} className="border-b border-border py-4 md:border-r md:p-4">
                <div className="flex gap-3 sm:gap-4">
                  <Skeleton className="aspect-[3/4] w-16 shrink-0 sm:w-28" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </div>
            ))
          : items.map((item) => <AnimeCard key={item.subject_id} item={item} />)}
      </div>
    </main>
  );
}
