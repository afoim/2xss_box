/**
 * 追番数据 —— 直接打 `api-bgm-tv.2x.nz`（Bangumi 官方 API 的代理）。
 *
 * 原站是 SSR loader 取好直出，本项目纯静态、没有服务端，所以搬回浏览器里取。
 * 这条路走得通的三个前提都已实测确认：
 *
 * 1. 代理带 `Access-Control-Allow-Origin: *`，浏览器能直接读；
 * 2. **代理已经把封面地址改写成 `lain-bgm-tv.2x.nz`** 了（官方 `lain.bgm.tv`
 *    国内连不上），前端拿到就能直接 `<img src>`，不用再自己 replace 一遍；
 * 3. 请求里**不要设 `User-Agent`** —— 那是 fetch 的 forbidden header，浏览器
 *    直接丢掉，写了只是自欺欺人（原客户端实现里那行就是无效的）。
 *
 * 接口按 50 条一页翻，串行请求。数据低频变动，用 sessionStorage 缓存 30 分钟，
 * 免得来回切页签就重翻十几页。
 */
import type { BangumiCollectionItem } from './anime-types';

const BGM_API = (import.meta.env.VITE_BGM_API as string | undefined) || 'https://api-bgm-tv.2x.nz';
const BGM_USER = (import.meta.env.VITE_BGM_USER as string | undefined) || 'acofork';

const CACHE_KEY = `bgm:watched:${BGM_USER}`;
const TTL_MS = 30 * 60 * 1000;

function readCache(): BangumiCollectionItem[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: BangumiCollectionItem[] };
    if (Date.now() - at > TTL_MS) return null;
    return data;
  } catch {
    // 无痕模式 / 配额满 / 存的是旧结构 —— 一律当没缓存
    return null;
  }
}

function writeCache(data: BangumiCollectionItem[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* 缓存写不进去不影响功能 */
  }
}

/** 按 updated_at 倒序 —— 最近看的排最前 */
function byRecent(items: BangumiCollectionItem[]): BangumiCollectionItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export async function fetchWatchedAnime(signal?: AbortSignal): Promise<BangumiCollectionItem[]> {
  const cached = readCache();
  if (cached) return cached;

  const all: BangumiCollectionItem[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `${BGM_API}/v0/users/${BGM_USER}/collections?subject_type=2&type=2&limit=50&offset=${offset}`,
      { signal },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = (await res.json()) as {
      data: BangumiCollectionItem[];
      total: number;
      limit: number;
    };
    all.push(...page.data);
    offset += page.limit;
    // `!page.data.length` 那一半是防翻页死循环：total 与实际条数对不上时
    // （被删除的条目仍计入 total）没有这条会一直空转下去
    if (offset >= page.total || !page.data.length) break;
  }

  const sorted = byRecent(all);
  writeCache(sorted);
  return sorted;
}
