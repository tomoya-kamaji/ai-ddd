# クラス別レーティング

分析の正本は Notion の [Rating：レーティング](https://app.notion.com/p/3e013803836380bab44fc79c345ad050)。図は [usecase-diagram.drawio](../01-usecase/usecase-diagram.drawio)。実装はセミナー予約と同じ kamae スタイル。

```bash
npm install
npm test
npm run typecheck
```

## ルール → 責務

| ルール | 実装 | 保証 |
|---|---|---|
| R1 レートはクラスごと | `Rating` の識別子が playerId + craft + seasonId。`Craft.parse` | 7クラス以外は `UnknownCraft` |
| R2 未開始にはレートがない | `Rating.start` だけが生成する。再開始は `startRatingUseCase` | 未開始型は置かない。開始済みは `AlreadyStarted` |
| R3 同じ対局は一度だけ | `MatchHistory.record`。MatchId はグローバル | `AlreadyRecorded` |
| R4 両者を同時に更新 | `recordMatchUseCase` | 2つの `Rating.apply` と `MatchHistory.record` を一つの手続きで呼ぶ |
| R5 肩書き。BEYOND は上位100 | `Grade.of` / `Grade.ofRanked` / `Rating.rank` | rank は属性に持たない。順位はシーズン内 |
| R6 シーズンは寄せる | `Season.compress` / `Season.complete` / `updateSeasonUseCase` | 旧シーズンは残す。次シーズンへ寄せた Rating を作る |
| 勝者≠敗者 | `Match.create` | `WinnerEqualsLoser` |
| 開始値 1600 | `Rating.start` | 戻り値の value だけが 1600 |

増減は相手との差。実装は Elo（K=32、尺度400、`Math.round`）。会話では Elo と呼ばない。

## ファイル

| モデル | ファイル | 表現 |
|---|---|---|
| Rating | `rating/rating.ts` | レコード + Companion |
| Match / 未集計・集計済み | `match-history/match.ts` | `Unrecorded \| Recorded`。`MatchId` もここ |
| MatchHistory | `match-history/match-history.ts` | `readonly Recorded[]` は Companion 経由だけ更新 |
| Season | `season/season.ts` | `Pending \| Updated`。Rating / Match は持たない。参照は seasonId |
| Player | `rating/player.ts` | `PlayerId` だけ（アクター） |
| Craft | `rating/craft.ts` | 7値のユニオン |
| Grade | `rating/grade.ts` | ラベル。BEYOND は `ofRanked` だけ |
| ユースケース | `application/*.ts` | `(deps) => (input) => Result`。取得 → ドメイン関数に委譲 → 保存 |
| 組み立て | `create-app.ts` | in-memory Repository をユースケースへ渡す。コンテナではない |

## 設計上の注意

- ID は `unique symbol` の Branded Type。各オブジェクトのファイル内に定義する。`of` 内の `as` はバリデーションライブラリ未導入ゆえの唯一の例外
- Repository は `insert` / `find*` / `update` のみ。業務操作は置かない
- 再開始禁止と未開始の集計拒否は、一覧が集約の外にあるのでユースケースが Repository の有無を見て弾く。セミナーの `SeminarNotFound` と同じ層
- 開始と集計は Pending のシーズンだけ。Updated のシーズンは参照用
- 寄せは旧 Rating を update しない。次シーズンの Rating を insert する
- `now` は使っていない。時刻ルールが無い
- 本番の入口は `createApp`。テストは `createApp` を使わず、ユースケースに deps を直接渡す

意図的にやっていないこと: zod、ドメインイベント / Outbox、実 DB / HTTP。
