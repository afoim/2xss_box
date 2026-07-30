/**
 * Umami 自定义事件上报。
 *
 * 这份是从 svaf-next 原样搬过来的：**没有 umami 时它是个安全的空操作**，
 * 队列里的事件等 10 秒等不到就丢掉，绝不会抛错、也绝不会拖住页面。
 * 想接统计就在 index.html 里插一行 umami 的 script.js，其余代码不用改。
 *
 * 两个约束（原文照录，因为踩过）：
 * - **必须容忍 umami 还没加载完**：script.js 通常是动态插入的，而首屏就可能
 *   触发事件（比如带 ?url= 直接打开 B 站封面页）。所以这里排队，等
 *   `window.umami` 出现再冲刷。
 * - **不要上报用户内容**：prompt、文件名、搜索到的标题、tier 图标题都不进
 *   event_data。
 */

type EventData = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventData) => void };
  }
}

const queue: [string, EventData | undefined][] = [];
let waiting = false;

/** 有 umami 就把队列排空；返回是否已就绪 */
function flush(): boolean {
  const umami = typeof window === 'undefined' ? undefined : window.umami;
  if (typeof umami?.track !== 'function') return false;
  while (queue.length) {
    const [name, data] = queue.shift()!;
    try {
      umami.track(name, data);
    } catch {
      /* 埋点永远不该影响页面 */
    }
  }
  return true;
}

/**
 * 上报一个自定义事件。
 * @param name 事件名，直接显示在 Umami「行为类别」列表里，用中文
 * @param data 附加属性，落到 event_data 表。**不要传用户隐私数据**
 */
export function track(name: string, data?: EventData) {
  if (typeof window === 'undefined') return;

  // undefined / 空串的字段直接丢掉，免得在 event_data 里堆一列空值
  const clean = data
    ? (Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== ''),
      ) as EventData)
    : undefined;

  queue.push([name, clean]);
  if (flush() || waiting) return;

  waiting = true;
  let tries = 0;
  const timer = setInterval(() => {
    if (flush() || ++tries > 40) {
      clearInterval(timer);
      waiting = false;
    }
  }, 250);
}
