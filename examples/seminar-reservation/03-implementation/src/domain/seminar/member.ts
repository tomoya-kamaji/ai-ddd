declare const MemberIdBrand: unique symbol;
export type MemberId = string & { readonly [MemberIdBrand]: never };

export const MemberId = {
  // 生の文字列を MemberId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): MemberId => value as MemberId,
} as const;
