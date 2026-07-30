/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** B 站封面解析 API 前缀，默认 https://bili-pic.2x.nz/?url= */
  readonly VITE_BILI_API?: string;
  /** 文件索引根地址，默认 https://raw-files.2x.nz */
  readonly VITE_FILES_BASE_URL?: string;
  /** Bangumi API 代理，默认 https://api-bgm-tv.2x.nz */
  readonly VITE_BGM_API?: string;
  /** 追番读谁的收藏，默认 acofork */
  readonly VITE_BGM_USER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
