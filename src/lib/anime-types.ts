/** Bangumi API v0 返回的 Subject 结构（只取需要的字段） */
export interface BangumiSubject {
  id: number;
  name: string;
  name_cn: string;
  images: {
    large: string;
    common: string;
    medium: string;
    small: string;
    grid: string;
  };
  score: number;
  rank: number;
  date: string;
  eps: number;
  short_summary: string;
}

/** Bangumi 用户收藏中的单条记录（"看过"，type=2） */
export interface BangumiCollectionItem {
  subject_id: number;
  subject: BangumiSubject;
  rate: number;
  comment: string | null;
  tags: string[];
  updated_at: string;
  type: number;
}
