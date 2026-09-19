# ハンドオフ（クラス別レーティング）

このファイルはチャット引き継ぎ用。ドメインの正本は Notion。図の正本は draw.io。

- 文書: https://app.notion.com/p/3e013803836380bab44fc79c345ad050
- ドメインモデル文書: https://app.notion.com/p/3e013803836381db92fbfd0336e12425
- 図: `01-usecase/usecase-diagram.drawio`
- 実装: `03-implementation`

リポジトリはまだ未コミット（`main` に commit なし）。

## いまの到達点

シーズン別のレートと対戦を残すため、案1を実装済み。テスト 53 件と `tsc` は通過。

Rating の識別子は `playerId + craft + seasonId`。Match も `seasonId` を持つ。MatchHistory は1本。Season は Rating / Match を所有しない。

寄せは旧シーズンを update しない。次シーズンの Rating を insert する。

## 設計で決めたこと

- Season と Rating / Match は薄い参照（seasonId）。集約に入れない
- 開始・集計は Pending のシーズンだけ。Updated は参照用
- 同じ対局は MatchId グローバルで一度だけ
- ランキングと BEYOND 判定はシーズン内
- `updateSeasonUseCase` の入力は `{ seasonId, nextSeasonId }`。次シーズンは先に create する
- 次シーズンに既にレートがあるときは `NextSeasonOccupied`
- seasonId と nextSeasonId が同じなら `NextSeasonInvalid`

寄せの流れ:

1. `createSeason(2026-1)`
2. 開始・対局
3. `createSeason(2026-2)`
4. `updateSeason({ seasonId: 2026-1, nextSeasonId: 2026-2 })`
5. `listRanking({ craft, seasonId: 2026-1 })` で旧シーズンが見える

## 実装の地図

| 場所 | 役割 |
|---|---|
| `src/domain/rating/rating.ts` | Rating。start に seasonId |
| `src/domain/match-history/match.ts` | Unrecorded / Recorded。seasonId |
| `src/domain/match-history/match-history.ts` | 1本の履歴。`inSeason` で絞る |
| `src/domain/season/season.ts` | `compress(rating, nextSeasonId)` が次シーズンの Rating を返す |
| `src/application/require-pending-season.ts` | Pending 以外は拒否 |
| `src/application/update-season.ts` | 旧を残し、次へ insert |
| `src/application/start-rating.ts` / `record-match.ts` | 入力に seasonId。Pending 必須 |
| `src/application/list-ranking.ts` | 入力に seasonId。Updated も見られる |

Companion の純粋関数。Repository は insert / find* / update のみ。

## 図（draw.io）の注意

ドメインモデル図は同じ `usecase-diagram.drawio` の下側（id 接頭辞 `d-`）。

やってはいけないこと: 集約枠を swimlane にして、その中に stackLayout のクラスを入れる。draw.io が Season の行を剥がし、空の Season が右に残る。

やり方: 集約枠は `container=0;dropTarget=0` のただの箱。クラスは枠の兄弟で `parent="d-g"`。

図を開いたまま編集したら、閉じて開き直す。

## まだやっていないこと

- Notion 正本の更新（seasonId、寄せの意味変更）
- オブジェクト図・ユースケース図・語彙表の追従
- git commit（依頼なし）
- 次シーズンが Updated のときの専用エラー（今は `SeasonNotPending`）
- 実 DB / HTTP / zod

## 次にやるときの入口

実装を変えるなら `03-implementation` で `npm test` と `npm run typecheck`。

図を直すなら skill `draw-io`。参照は `xml-reference.md` と `layout-guide.md`。編集後は自動で開かない。

会話の流れ: draw-io skill の確認 → ドメインモデル図の作り方 → 集約ルート欠落 → 図の作り直し → シーズン別レートが消える指摘 → 案1で実装。
