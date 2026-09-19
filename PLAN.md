# 実装設計書: セミナー予約システム（関数型DDD版）

この文書だけを読めば実装できるように書いている。会話の文脈は不要。

## 0. 目的と前提

### 目的

`docs/` の方法論（ユースケース分析 → SUDOモデリングによるドメイン分析 → 実装）を「セミナー予約システム」に適用し、**業務ルールをすべてドメイン層に吸収した**動くサンプル実装を作る。

分析成果物はすでに存在する。実装はこれらを忠実にコードへ翻訳する作業である。

- ユースケース図: `examples/seminar-reservation/01-usecase/usecase-diagram.md`
- シナリオ記述: `examples/seminar-reservation/01-usecase/scenarios.md`
- オブジェクト図と**ルール一覧 R1〜R6**: `examples/seminar-reservation/02-domain/object-diagram.md`

### 設計スタイル（確定事項・変更不可）

`~/.agents/skills/kamae/` の関数型ドメインモデリングに従う。実装前に `SKILL.md`, `domain-modeling.md`, `state-modeling.md`, `error-handling.md`, `declarative-style.md`, `test-data.md` を読むこと。`boundary-defense.md` はバリデーションライブラリを使わないため参考程度でよい。

| 項目 | 決定 |
|---|---|
| パラダイム | 関数型。`class` 禁止。型は `type` のみ（`interface` 禁止）。すべて `Readonly<>` |
| 状態表現 | Discriminated Union。判別子は必ず `kind` |
| 型と関数の配置 | Companion Object パターン（`type Seminar` と `const Seminar = {...} as const` を同名・同ファイル） |
| ファイル構成 | 1概念1ファイル。`types.ts` / `models.ts` のような寄せ集めファイル禁止 |
| エラー処理 | **neverthrow** の `Result`（`ok` / `err`）。ドメイン層・アプリケーション層で `throw` 禁止（`assertNever` のみ例外）。エラー値は自前の `kind` 判別ユニオン。Result 自体はライブラリのクラスだが、自前のドメインコードにクラスは書かない |
| Branded Type | **使う**。ID は `unique symbol` ブランド（§4.1）。ID 型はそのオブジェクトのファイル内に定義する（`seminar-id.ts` のような ID 専用ファイルは作らない） |
| バリデーションライブラリ | **使わない**（zod 等を入れない）。そのため ID のブランド付けだけ `as` を許可（§4.1 の `of` のみ） |
| テスト | **今回は書かない**（§7）。検証は `typecheck` のみ |
| ドメインイベント / Outbox | **入れない** |
| Repository | 永続化のみ。`insert / findById / findByTitle / update` の4つだけ。業務ロジック禁止（後述 §4） |
| 型アサーション | `as const` と `as const satisfies T` 以外の `as` 禁止。**唯一の例外**: ID の `of` ファクトリ内（バリデーションライブラリ未導入時の kamae の最終手段パターン）。将来 zod 等を入れたら `.brand()` に移行する |
| 時刻 | `new Date()` をドメイン・ユースケース内で呼ばない。必ず `now: Date` を引数で受ける |
| 複雑さ | 上記以上の仕組み（`ResultAsync`、パイプライン演算子的ヘルパー、DI コンテナ等）は追加しない。ユースケースは `Promise<Result<...>>` を返し、`async/await` + 早期 return で書く |

## 1. ディレクトリ構成

```
examples/seminar-reservation/03-implementation/
├── package.json
├── tsconfig.json
├── README.md                   （§8 参照）
└── src/
    ├── shared/
    │   └── assert-never.ts
    ├── domain/
    │   └── seminar/
    │       ├── member.ts       MemberId のみ（Member は別概念で今回のモデル対象外。ID 参照のためだけに存在）
    │       ├── capacity.ts
    │       ├── application.ts  ApplicationId + Application
    │       ├── seminar.ts      SeminarId + Seminar
    │       └── seminar-repository.ts
    ├── application/
    │   ├── create-seminar.ts
    │   ├── apply-to-seminar.ts
    │   └── cancel-application.ts
    └── infrastructure/
        └── in-memory-seminar-repository.ts
```

## 2. ツーリング

`examples/seminar-reservation/03-implementation/package.json`:

```json
{
  "name": "seminar-reservation",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

TypeScript 5.5 以上必須（述語関数の型推論を使うため。`x is Y` 注釈は書かない）。

## 3. 共有モジュール

### 3.1 Result（neverthrow）

自作せず `neverthrow` を使う（`npm install neverthrow`）。`src/shared/result.ts` は作らない。

```ts
import { err, ok, type Result } from "neverthrow";
```

- 生成は `ok(value)` / `err(error)`。判定は `r.isOk()` / `r.isErr()`（型ガードとして絞り込みが効く）
- `err` の型引数は成功側の型 `T` も持つため、型の違う Result（例: `Result<Capacity, E>`）をそのまま別の `Result<Seminar, E>` として return できない。早期 return は `return err(x.error)` で作り直す。同じ `T` のときだけ `return r` でよい
- 使うのは `ok` / `err` / `isOk` / `isErr` / `.error` / `.value` まで。`map` / `andThen` / `match` / `ResultAsync` はこのリポジトリでは使わない。非同期は `async/await` + 早期 return で扱う
- テストでは `result._unsafeUnwrap()` / `result._unsafeUnwrapErr()` で値を取り出して比較する（Result はクラスのインスタンスなので `{ kind: "ok" }` との `toEqual` は成立しない）

### 3.2 `src/shared/assert-never.ts`

```ts
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
};
```

## 4. ドメイン層

### 4.1 ID 型（Branded Type。各オブジェクトのファイル内に定義）

ID 専用ファイルは作らない。定義場所:

| ID | 定義するファイル |
|---|---|
| `SeminarId` | `seminar.ts` |
| `ApplicationId` | `application.ts` |
| `MemberId` | `member.ts`（このファイルは `MemberId` だけを持つ） |

バリデーションライブラリを使わないため、kamae の `unique symbol` パターンで定義する。**書き方はこの形に統一**（`SeminarId` の例）:

```ts
declare const SeminarIdBrand: unique symbol;
export type SeminarId = string & { readonly [SeminarIdBrand]: never };

export const SeminarId = {
  // 生の文字列を SeminarId にする唯一の入口。`as` を使ってよいのはここだけ
  of: (value: string): SeminarId => value as SeminarId,
} as const;
```

- `declare const ... : unique symbol` は実行時には存在しないブランド専用のシンボル（コードを出力しない）。kamae 原文の `export const XBrand = Symbol()` でもよいが、外部に露出させないため `declare const` + 非 export とする
- 他の ID（`ApplicationId`, `MemberId`）も同じ形で、シンボル名だけ変える
- ブランドにより `SeminarId` と `MemberId` を取り違えるとコンパイルエラーになる
- `Capacity` のように「検証が要る値」は引き続き `Result` を返す `create` を持つ。ID は検証しない（形式ルールが業務要件に無いため）ので `of` は常に成功する
- 外部入力（HTTP 等）を ID にするのは境界層の責務で、今回のスコープには境界層が無いため、ユースケースの入力型に最初から `SeminarId` / `MemberId` を要求する

### 4.2 `capacity.ts` — ルール R4「定員は1以上」

```ts
import { err, ok, type Result } from "neverthrow";

export type Capacity = Readonly<{ value: number }>;

export type CapacityError = Readonly<{ kind: "CapacityMustBePositive"; value: number }>;

export const Capacity = {
  create: (value: number): Result<Capacity, CapacityError> =>
    Number.isInteger(value) && value >= 1
      ? ok({ value })
      : err({ kind: "CapacityMustBePositive", value }),
} as const;
```

素の `number` ではなく `{ value: number }` で包む理由: 「検証済みの定員」と「ただの数値」を型で区別するため（ID とは違い、`create` を通った値だけがこの型になる）。これ以外の値オブジェクトは作らない（`Title` などは素の `string` のまま）。

### 4.3 `application.ts` — ルール R5「申込は申込済で作成」/ R6「キャンセル済は再キャンセル不可」

状態遷移: `Applied → Cancelled`（一方向、戻りなし）

```ts
import type { MemberId } from "./member";

declare const ApplicationIdBrand: unique symbol;
export type ApplicationId = string & { readonly [ApplicationIdBrand]: never };
export const ApplicationId = {
  of: (value: string): ApplicationId => value as ApplicationId,
} as const;

export type Applied = Readonly<{
  kind: "Applied";
  id: ApplicationId;
  memberId: MemberId;
  appliedAt: Date;
}>;

export type Cancelled = Readonly<{
  kind: "Cancelled";
  id: ApplicationId;
  memberId: MemberId;
  appliedAt: Date;
  cancelledAt: Date;
}>;

export type Application = Applied | Cancelled;

export const Application = {
  // R5: 必ず Applied で生成される（他の状態で作る関数は存在しない）
  create: (id: ApplicationId, memberId: MemberId, now: Date): Applied => ({
    kind: "Applied",
    id,
    memberId,
    appliedAt: now,
  }),

  // R6: 引数型が Applied なので Cancelled を渡すとコンパイルエラー
  cancel: (applied: Applied, now: Date): Cancelled => ({
    kind: "Cancelled",
    id: applied.id,
    memberId: applied.memberId,
    appliedAt: applied.appliedAt,
    cancelledAt: now,
  }),

  isApplied: (application: Application) => application.kind === "Applied",
} as const;
```

共通プロパティを基底型に `extends` で切り出さない（kamae の方針）。冗長でも各状態に全プロパティを書く。

### 4.4 `seminar.ts` — 集約ルート。ルール R1 / R2 / R3 / 生成時検証

`Seminar` は `Application` の集合を持つ集約ルート。**Application の追加・状態変更は必ず `Seminar` の関数経由で行う**。`seminar.applications` を外から直接組み替えるコードを書かない。

```ts
import { err, ok, type Result } from "neverthrow";
import type { MemberId } from "./member";
import { Capacity, type CapacityError } from "./capacity";
import { Application, type ApplicationId, type Applied } from "./application";

declare const SeminarIdBrand: unique symbol;
export type SeminarId = string & { readonly [SeminarIdBrand]: never };
export const SeminarId = {
  of: (value: string): SeminarId => value as SeminarId,
} as const;

export type Seminar = Readonly<{
  id: SeminarId;
  title: string;
  startAt: Date;
  capacity: Capacity;
  applications: readonly Application[];
}>;

// --- エラー型（関数ごとに専用の Union。共通 AppError を作らない） ---

export type CreateSeminarError =
  | CapacityError
  | Readonly<{ kind: "StartAtMustBeFuture"; startAt: Date }>;

export type ApplyError =
  | Readonly<{ kind: "SeminarIsFull"; seminarId: SeminarId }>
  | Readonly<{ kind: "AlreadyApplied"; seminarId: SeminarId; memberId: MemberId }>;

export type CancelApplicationError =
  | Readonly<{ kind: "ApplicationNotFound"; applicationId: ApplicationId }>
  | Readonly<{ kind: "AlreadyCancelled"; applicationId: ApplicationId }>
  | Readonly<{ kind: "CancellationDeadlinePassed"; applicationId: ApplicationId; deadline: Date }>;

const CANCEL_DEADLINE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const Seminar = {
  create: (
    input: Readonly<{ id: SeminarId; title: string; startAt: Date; capacity: number }>,
    now: Date,
  ): Result<Seminar, CreateSeminarError> => { /* 仕様は下記 */ },

  // R1 判定: 申込済(Applied)の件数が定員以上
  isFull: (seminar: Seminar): boolean => ...,

  // R2 判定: 同一会員の Applied が存在する（Cancelled は数えない）
  hasAppliedMember: (seminar: Seminar, memberId: MemberId): boolean => ...,

  // R3 判定: now が「開催日時 − 3日」を過ぎていない
  cancellationDeadline: (seminar: Seminar): Date => ...,
  isCancellable: (seminar: Seminar, now: Date): boolean => ...,

  apply: (
    seminar: Seminar,
    applicationId: ApplicationId,
    memberId: MemberId,
    now: Date,
  ): Result<Seminar, ApplyError> => { /* 仕様は下記 */ },

  cancelApplication: (
    seminar: Seminar,
    applicationId: ApplicationId,
    now: Date,
  ): Result<Seminar, CancelApplicationError> => { /* 仕様は下記 */ },
} as const;
```

#### `Seminar.create` の仕様

1. `Capacity.create(input.capacity)` を呼び、`err` ならそのまま返す（`CapacityError` は `CreateSeminarError` に含まれる）
2. `input.startAt.getTime() <= now.getTime()` なら `err({ kind: "StartAtMustBeFuture", startAt })`
3. 成功時 `applications: []` で `Seminar` を返す

#### `Seminar.apply` の仕様（UC1）

チェック順は固定:

1. `hasAppliedMember(seminar, memberId)` が true → `err({ kind: "AlreadyApplied", ... })`
2. `isFull(seminar)` が true → `err({ kind: "SeminarIsFull", ... })`
3. `Application.create(applicationId, memberId, now)` を末尾に追加した**新しい** `Seminar` を返す（`[...seminar.applications, created]`。元のオブジェクトは変更しない）

順序の理由: 重複申込のユーザーに「満員」と返すのは誤解を招くため、重複を先に判定する。

#### `Seminar.cancelApplication` の仕様（UC2）

1. `applications.find(a => a.id === applicationId)` が `undefined` → `err({ kind: "ApplicationNotFound", ... })`
2. 見つかった申込の `kind === "Cancelled"` → `err({ kind: "AlreadyCancelled", ... })`（R6）
3. `!isCancellable(seminar, now)` → `err({ kind: "CancellationDeadlinePassed", applicationId, deadline: cancellationDeadline(seminar) })`（R3）
4. `Application.cancel(applied, now)` で置き換えた新しい `applications` 配列を持つ `Seminar` を返す（`map` で該当 id のみ置換。順序を保つ）

#### R3 の境界値定義

- `cancellationDeadline = new Date(startAt.getTime() - CANCEL_DEADLINE_DAYS * MS_PER_DAY)`
- `isCancellable = now.getTime() <= deadline.getTime()`（**deadline ちょうどはキャンセル可**、1ms でも過ぎたら不可）
- タイムゾーン・暦日の丸めは行わない（ミリ秒差の単純比較）。README に明記する

#### ルール → 責務の対応（object-diagram.md の R1〜R6）

| ルール | 実装箇所 | 保証方法 |
|---|---|---|
| R1 定員超過は申込不可 | `Seminar.apply` / `Seminar.isFull` | 実行時チェック → `SeminarIsFull` |
| R2 同一会員の重複申込不可 | `Seminar.apply` / `Seminar.hasAppliedMember` | 実行時チェック → `AlreadyApplied` |
| R3 開催3日前を過ぎたらキャンセル不可 | `Seminar.cancelApplication` / `Seminar.isCancellable` | 実行時チェック → `CancellationDeadlinePassed` |
| R4 定員は1以上 | `Capacity.create` | 実行時チェック → `CapacityMustBePositive`。検証済みの値だけが `Capacity` 型になる |
| R5 申込は申込済で作成 | `Application.create` | 戻り値型が `Applied`。他の生成関数が存在しない |
| R6 キャンセル済の再キャンセル不可 | `Application.cancel`（型）+ `Seminar.cancelApplication`（実行時） | 引数型 `Applied` でコンパイル時に排除。集約経由では `AlreadyCancelled` |
| 開催日時は未来（UC3 例外 2b） | `Seminar.create` | 実行時チェック → `StartAtMustBeFuture` |

### 4.5 `seminar-repository.ts` — 永続化のみ

元となる Kotlin の設計:

```kotlin
interface ClubRepository {
    fun insert(club: Club)
    fun findById(clubId: ClubId): Club
    fun findByName(name: String): List<Club>
    fun update(club: Club)
    // fun addMember(...)  // x: リポジトリの責務を超えている
    // fun approve(...)    // x: リポジトリの責務を超えている
}
```

TypeScript 版:

```ts
import type { Seminar, SeminarId } from "./seminar";

export type SeminarRepository = Readonly<{
  insert: (seminar: Seminar) => Promise<void>;
  findById: (id: SeminarId) => Promise<Seminar | undefined>;
  findByTitle: (title: string) => Promise<readonly Seminar[]>;
  update: (seminar: Seminar) => Promise<void>;
}>;
```

- 関数プロパティ記法（メソッド記法禁止）
- Kotlin の `findById` は非 null を返すが、TS では `undefined` を返し「見つからない」はユースケース層で `SeminarNotFound` エラーに変換する（Repository で throw させないため）
- **禁止**: `applyToSeminar(seminarId, memberId)`、`cancelApplication(...)`、`incrementAppliedCount(...)` のような業務操作をここに足すこと。Repository は集約をまるごと保存・取得するだけ
- `insert` と `update` は分ける（Kotlin と同じ）。`save` に統合しない

## 5. アプリケーション層（ユースケース）

共通の形:

```ts
type Deps = Readonly<{
  seminarRepository: SeminarRepository;
  generateId: () => string;
}>;

export const xxxUseCase = (deps: Deps) => async (input, now: Date): Promise<Result<...>> => { ... };
```

- 依存はカリー化した第1引数で注入する。DI コンテナは使わない
- `generateId` は `crypto.randomUUID` 等の注入用（戻り値は素の `string`）。ユースケース内で直接 `crypto.randomUUID()` を呼ばない（決定的な ID を注入できるようにするため）。ブランド付けは `SeminarId.of(...)` / `ApplicationId.of(...)` をユースケース内で行う
- ユースケース関数の中に業務判定（定員・重複・期限）を書かない。すべて `Seminar.*` に委譲し、結果の `Result` を返すだけ

### 5.1 `create-seminar.ts`（UC3）

```ts
export type CreateSeminarInput = Readonly<{ title: string; startAt: Date; capacity: number }>;
export type CreateSeminarUseCaseError = CreateSeminarError;

export const createSeminar =
  (deps: Deps) =>
  async (input: CreateSeminarInput, now: Date): Promise<Result<Seminar, CreateSeminarUseCaseError>> => {
    const created = Seminar.create({ id: SeminarId.of(deps.generateId()), ...input }, now);
    if (created.isErr()) return created;
    await deps.seminarRepository.insert(created.value);
    return created;
  };
```

### 5.2 `apply-to-seminar.ts`（UC1）

```ts
export type ApplyToSeminarInput = Readonly<{ seminarId: SeminarId; memberId: MemberId }>;
export type ApplyToSeminarError =
  | Readonly<{ kind: "SeminarNotFound"; seminarId: SeminarId }>
  | ApplyError;

// 手順:
// 1. findById → undefined なら SeminarNotFound
// 2. Seminar.apply(seminar, ApplicationId.of(deps.generateId()), input.memberId, now)
// 3. err ならそのまま返す / ok なら update して ok を返す
```

### 5.3 `cancel-application.ts`（UC2）

```ts
export type CancelApplicationInput = Readonly<{ seminarId: SeminarId; applicationId: ApplicationId }>;
export type CancelApplicationUseCaseError =
  | Readonly<{ kind: "SeminarNotFound"; seminarId: SeminarId }>
  | CancelApplicationError;

// 手順: findById → SeminarNotFound / Seminar.cancelApplication / update
```

`SeminarNotFound` は 2 ユースケースで同じ形だが、kamae の方針（ユースケースごとに専用エラー型）に従い、共通ファイルに切り出さず各ファイルで Union に含める。型リテラルの重複は許容する。

## 6. インフラ層

### `in-memory-seminar-repository.ts`

```ts
export const createInMemorySeminarRepository = (): SeminarRepository => {
  const store = new Map<SeminarId, Seminar>();
  return {
    insert: async (seminar) => { store.set(seminar.id, seminar); },
    findById: async (id) => store.get(id),
    findByTitle: async (title) => [...store.values()].filter((s) => s.title === title),
    update: async (seminar) => { store.set(seminar.id, seminar); },
  };
};
```

`Map` のミュータビリティはインフラ層の内部に閉じているので許容。`Seminar` 自体は `Readonly` なので取り出した値を書き換える手段はない。`findByTitle` は完全一致でよい（部分一致は不要）。

## 7. テスト

**今回は書かない。** テストランナー（vitest 等）も導入しない。検証は `npm run typecheck` のみ。

将来テストを足す際の指針（今は実装しない）:

- 業務ルール R1〜R6 と `Seminar.create` の検証に対して最低1本ずつ対応するテストを書く
- 重点ケース: 定員境界、Cancelled を定員・重複に数えないこと、重複が満員より優先されること、R3 の deadline ちょうど（可）と +1ms（不可）、集約関数が元のオブジェクトを変更しないこと
- フィクスチャは `as const satisfies Type` で定義する（kamae の `test-data.md`）

## 8. `03-implementation/README.md` に書くこと

1. 実行方法（`npm install` / `npm run typecheck`。テストは未実装である旨も明記）
2. §4.4 の「ルール → 責務の対応表」を転記
3. ドメインモデル図（`02-domain/domain-model-diagram.md`）の要素 → ファイルの対応表:

| モデル図の要素 | ファイル | 関数型での表現 |
|---|---|---|
| `Seminar`（集約ルート） | `seminar.ts` | `Readonly` レコード + Companion の純粋関数 |
| `Application` + `ApplicationStatus`（区分） | `application.ts` | `Applied \| Cancelled` の Discriminated Union（区分オブジェクトは作らない） |
| `Capacity`（制約付き属性） | `capacity.ts` | `{ value }` レコード + `create` が Result を返す smart constructor |
| 吹き出しのルール | `Seminar.apply` / `Seminar.cancelApplication` / `Capacity.create` | 純粋関数の実行時チェック → 専用エラー型 |
| ユースケース基本フロー | `application/*.ts` | Repository から取得 → `Seminar.*` に委譲 → 保存、の3行 |

4. R3 の境界値定義（ミリ秒比較、deadline ちょうどは可）
5. ID は `unique symbol` の Branded Type で、各オブジェクトのファイル内に定義していること（`of` 内の `as` はバリデーションライブラリ未導入ゆえの唯一の例外。zod 等を入れたら `.brand()` に移行）
6. 意図的にやっていないこと: バリデーションライブラリ、ドメインイベント、テスト、Repository への業務関数追加

## 9. `docs/` の修正（実装と同時に行う）

既存の `docs/02-domain-analysis.md` と `docs/03-implementation-guideline.md` は OOP（クラス・完全コンストラクタ・区分オブジェクト・ポリモーフィズム）前提で書かれている。以下のとおり関数型に書き直す。**ミノ駆動さんの「業務ルールをドメインに集約する・低凝集を避ける・不正な値を存在させない」という原則は残し、その実現手段だけを関数型に置き換える。**

### 9.1 `docs/03-implementation-guideline.md` — 全面書き直し

変換対応表を次に差し替える:

| ドメインモデル図の要素 | 実装要素（関数型） | ねらい |
|---|---|---|
| 制約付きの属性 | `Readonly` レコード + Companion の `create` が `Result` を返す smart constructor | 検証を通った値だけがその型になる（完全コンストラクタと同じ狙い） |
| 区分・状態で振る舞いや持つ属性が変わる | `kind` 判別子の Discriminated Union。状態ごとに専用 `type`、状態固有の属性は必須にする | オプショナル属性と null チェックの散在を防ぐ |
| 状態遷移 | 引数型で遷移元を制約した純粋関数（`cancel: (a: Applied) => Cancelled`） | 不正な遷移をコンパイルエラーにする |
| `0..*` の関連でコレクション自体にルールがある | 集約ルートの `Readonly` レコードに `readonly T[]` として持ち、操作関数は集約ルートの Companion にだけ置く | 呼び出し側が配列を直接操作できない |
| 集約範囲 | 集約ルート型 + Companion 関数のみが内部を「新しいオブジェクトとして」作り直す | 不変条件を破れる場所を1箇所に限定 |
| 吹き出しのルール | Companion 関数内の判定 → 専用エラー型の `Result` | ルールをドメインに閉じ込め、例外を使わない |
| ユースケースのシナリオ | 依存をカリー化で受ける関数。取得 → ドメイン関数に委譲 → 保存 | 業務判定をユースケースに書かない |
| Repository | `insert / findById / findByTitle / update` のみの `type` | 業務ロジックの混入禁止 |

「実装時の設計原則」節は次の内容に置き換える: `class` 禁止 / `type` のみ / `Readonly` / `kind` 統一 / Companion Object / 1概念1ファイル / throw 禁止（Result） / `now` 注入 / `as` 禁止（ID の `of` のみ例外） / ID は Branded Type / 境界で検証した値をドメイン内で再検証しない。

「アンチパターン」節に追加: `switch` の `default` で `assertNever` を使わない / 全状態を1つの型にオプショナル属性で詰め込む / Repository に `addXxx` `approve` のような業務操作を生やす。

### 9.2 `docs/02-domain-analysis.md` — 末尾「ドメインモデル図から実装可能な粒度へ落とすコツ」節のみ修正

- 「`Seminar.isFull()` / `Seminar.apply(memberId)`」→「`Seminar.isFull(seminar)` / `Seminar.apply(seminar, ...)`」（Companion の純粋関数として）
- 「区分ごとに振る舞いが変わるならポリモーフィズムの対象」→「区分ごとに**持つ属性**や許される遷移が変わるなら Discriminated Union で状態ごとに型を分ける」
- 「ファーストクラスコレクション」→「集約ルートのレコードに `readonly T[]` として持ち、操作は集約ルートの Companion 関数に限定する」

ドメインモデル図（Mermaid の `classDiagram`）自体はそのままでよい。クラス図は「概念」を表すものであり、実装が関数型でも矛盾しない旨を一文追記する。

### 9.3 `docs/checklist.md` — 「実装」節を差し替え

- [ ] 制約のある属性は Companion の `create` が `Result` を返す形で、検証済みの値だけがその型になっているか
- [ ] 状態は `kind` 判別子の Discriminated Union で、状態固有の属性が必須になっているか
- [ ] 状態遷移関数の引数型が遷移元の状態に制約されているか
- [ ] 集約の内部コレクションを Companion 関数の外から組み替えていないか
- [ ] ドメイン層・ユースケース層で `throw` していないか（`assertNever` を除く）
- [ ] ユースケース関数の中に業務判定（定員・重複・期限など）が書かれていないか
- [ ] Repository が `insert / findById / findByXxx / update` 以外の業務操作を持っていないか
- [ ] `new Date()` をドメイン・ユースケース内で呼んでいないか
- [ ] `as const` / `as const satisfies` 以外の `as` を使っていないか（ID の `of` を除く）
- [ ] ID は Branded Type で、取り違えがコンパイルエラーになるか
- [ ] ドメインモデル図の吹き出しルールごとに対応するテストがあるか（※サンプル実装ではテスト未実装。実プロジェクトでは必須）

### 9.4 `README.md`（ルート）

冒頭の説明「ミノ駆動さんのドメインオブジェクト設計」の後に「（実装は kamae の関数型スタイル。原則は踏襲し手段をクラスから純粋関数 + Discriminated Union に置き換える）」を追記。参考リンクに `~/.agents/skills/kamae`（ローカル）を追加。

### 9.5 `examples/seminar-reservation/README.md`（新規）

01 → 02 → 03 の順に読むための短い案内と、03 の README へのリンク。

## 10. 完了条件

- [ ] `npm run typecheck` がエラー 0
- [ ] `src/` 内に `class`、`interface`、`throw`（`assert-never.ts` を除く）、`as`（`as const` 系と各 ID の `of` を除く）、`new Date()` が存在しない（`grep` で確認）
- [ ] ID 専用ファイル（`*-id.ts`）が存在せず、`SeminarId` は `seminar.ts`、`ApplicationId` は `application.ts`、`MemberId` は `member.ts` に定義されている
- [ ] `seminar-repository.ts` の関数が4つだけ
- [ ] §9 のドキュメント修正が完了している
- [ ] `docs/checklist.md` の「実装」節を実装に対して一通り確認済み

## 11. やらないこと（スコープ外の明示）

- キャンセル待ち（UC4）、通知（UC5）
- HTTP / DB などの実インフラ。インメモリ Repository のみ
- zod 等のバリデーションライブラリ、ドメインイベント、Outbox、ResultAsync
- テストの実装とテストランナー導入（§7。後日追加）
- `Title` など制約のない属性の値オブジェクト化
- Repository への `save` 統合や業務メソッド追加
