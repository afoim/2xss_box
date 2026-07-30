/**
 * B 站视频封面解析 —— 纯客户端。
 *
 * 走的是**已有的后端** `bili-pic.2x.nz` —— 一个独立的小服务，不在本仓库里。
 * 契约极简：
 *
 *     GET https://bili-pic.2x.nz/?url=<encodeURIComponent(任意输入)>
 *     → 200 {"pic": "http://i0.hdslb.com/bfs/archive/....jpg"}
 *
 * 抠 URL、跟 b23 短链、问官方 `x/web-interface/view` 三步都在它那边做完了，
 * 前端只管发一次请求。**它带 `Access-Control-Allow-Origin: *`**，所以浏览器
 * 直接读得到，不需要任何 CORS 代理 —— 别去接公共代理，那是把可用性外包给陌生人。
 *
 * 两件必须知道的事：
 *
 * 1. **返回的封面地址是 `http://`**，直接贴进 HTTPS 页面就是混合内容，会被
 *    浏览器拦掉、图裂。hdslb 本身支持 https，这里统一升协议。
 * 2. 这个域名挂了这一页就废 —— 本项目是纯静态产物，没有自己的服务端可以兜底。
 *    换用别的同契约实现时把地址填进 `VITE_BILI_API` 即可，代码不用动。
 */

const API_BASE =
  (import.meta.env.VITE_BILI_API as string | undefined) || 'https://bili-pic.2x.nz/?url=';

const TIMEOUT_MS = 15_000;

export interface BiliCoverResult {
  pic?: string;
  error?: string;
}

/** 输入可以是：分享文本 / b23 短链 / bilibili.com 完整链接 / BV 号 / AV 号 / b23 短码 */
export async function resolveBiliCover(raw: string): Promise<BiliCoverResult> {
  const input = raw.trim();
  if (!input) return { error: '请输入视频链接或 BV / AV 号' };
  if (input.length > 2000) return { error: '输入过长' };

  let data: { pic?: string };
  try {
    const res = await fetch(API_BASE + encodeURIComponent(input), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { error: `解析服务返回 HTTP ${res.status}，请稍后重试` };
    data = await res.json();
  } catch {
    return { error: '请求解析服务失败，请检查网络后重试' };
  }

  if (!data.pic) return { error: '未找到封面，请检查链接是否正确（视频可能已失效或为私密稿件）' };

  return { pic: data.pic.replace(/^http:\/\//i, 'https://') };
}
