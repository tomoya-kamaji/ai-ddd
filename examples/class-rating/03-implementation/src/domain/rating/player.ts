declare const PlayerIdBrand: unique symbol;
export type PlayerId = string & { readonly [PlayerIdBrand]: never };

export const PlayerId = {
  // 生の文字列を PlayerId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): PlayerId => value as PlayerId,
} as const;
