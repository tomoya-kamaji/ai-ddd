# 実装: セミナー予約システム（関数型DDD）

[02-domain](../02-domain) のドメインモデル図を、kamae スタイル（Discriminated Union + Companion Object + 純粋関数 + Result）で実装したもの。

## 実行

```bash
npm install
npm run typecheck
```

テストは未実装（今後追加予定）。

## ルール → 責務の対応

| ルール | 実装箇所 | 保証方法 |
|---|---|---|
| R1 定員超過は申込不可 | `Seminar.apply` / `Seminar.isFull` | 実行時チェック → `SeminarIsFull` |
| R2 同一会員の重複申込不可 | `Seminar.apply` / `Seminar.hasAppliedMember` | 実行時チェック → `AlreadyApplied` |
| R3 開催3日前を過ぎたらキャンセル不可 | `Seminar.cancelApplication` / `Seminar.isCancellable` | 実行時チェック → `CancellationDeadlinePassed` |
| R4 定員は1以上 | `Capacity.create` | 実行時チェック → `CapacityMustBePositive` |
| R5 申込は申込済で作成 | `Application.create` | 戻り値型が `Applied`。他の生成関数が存在しない |
| R6 キャンセル済の再キャンセル不可 | `Application.cancel`（型）+ `Seminar.cancelApplication`（実行時） | 引数型 `Applied` でコンパイル時に排除。集約経由では `AlreadyCancelled` |
| 開催日時は未来 | `Seminar.create` | 実行時チェック → `StartAtMustBeFuture` |

## ドメインモデル図 → ファイルの対応

| モデル図の要素 | ファイル | 関数型での表現 |
|---|---|---|
| `Seminar`（集約ルート） | `src/domain/seminar/seminar.ts` | `Readonly` レコード + Companion の純粋関数 |
| `Application` + `ApplicationStatus`（区分） | `application.ts` | `Applied \| Cancelled` の Discriminated Union（区分オブジェクトは作らない） |
| `Capacity`（制約付き属性） | `capacity.ts` | `{ value }` レコード + `create` が Result を返す smart constructor |
| 吹き出しのルール | `Seminar.apply` / `Seminar.cancelApplication` / `Capacity.create` | 純粋関数の実行時チェック → 専用エラー型 |
| ユースケース基本フロー | `src/application/*.ts` | Repository から取得 → `Seminar.*` に委譲 → 保存 |

## 設計上の注意

- **R3 の境界値**: ミリ秒の単純比較。`now <= 開催日時 - 3日` ならキャンセル可（期限ちょうどは可、1msでも過ぎたら不可）。タイムゾーンや暦日への丸めはしない
- **ID**: `unique symbol` の Branded Type。各オブジェクトのファイル内に定義（`MemberId` のみ、モデル対象外の Member のため `member.ts` に単独で存在）。`of` 内の `as` はバリデーションライブラリ未導入ゆえの唯一の例外で、zod 等を導入したら `.brand()` に移行する
- **Repository**: `insert / findById / findByTitle / update` のみ。業務操作（`addApplication` 等）は追加しない。「見つからない」は `undefined` で返し、ユースケース層で `SeminarNotFound` に変換する
- **`now` と ID 生成の注入**: `new Date()` やランダム ID 生成はドメイン・ユースケース内で行わず、引数・依存で受け取る

## 意図的にやっていないこと

バリデーションライブラリ、ドメインイベント / Outbox、テスト、キャンセル待ち（UC4）、通知（UC5）、実 DB / HTTP。
