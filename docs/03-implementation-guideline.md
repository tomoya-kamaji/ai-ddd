# ドメインモデル図 → 実装への変換規則（関数型）

出典: ミノ駆動さん『良いコード/悪いコードで学ぶ設計入門』の原則（業務ルールをドメインに集約する・低凝集を避ける・不正な値を存在させない）を、kamae（`~/.agents/skills/kamae`）の関数型スタイルで実現する。**原則は踏襲し、手段をクラスから「Discriminated Union + Companion Object の純粋関数 + Result」に置き換える。**

## 変換対応表

| ドメインモデル図の要素 | 実装要素（関数型） | ねらい |
|---|---|---|
| 制約付きの属性 | `Readonly` レコード + Companion の `create` が `Result` を返す smart constructor | 検証を通った値だけがその型になる（完全コンストラクタと同じ狙い） |
| ID | Branded Type（各オブジェクトのファイル内に定義） | 別種の ID の取り違えをコンパイルエラーにする |
| 区分・状態で振る舞いや持つ属性が変わる | `kind` 判別子の Discriminated Union。状態ごとに専用 `type`、状態固有の属性は必須にする | オプショナル属性と null チェックの散在を防ぐ |
| 状態遷移 | 引数型で遷移元を制約した純粋関数（`cancel: (a: Applied) => Cancelled`） | 不正な遷移をコンパイルエラーにする |
| `0..*` の関連でコレクション自体にルールがある | 集約ルートの `Readonly` レコードに `readonly T[]` として持ち、操作関数は集約ルートの Companion にだけ置く | 呼び出し側が配列を直接操作できない |
| 集約範囲 | 集約ルート型 + Companion 関数のみが内部を「新しいオブジェクトとして」作り直す | 不変条件を破れる場所を1箇所に限定 |
| 吹き出しのルール | Companion 関数内の判定 → 専用エラー型の `Result` | ルールをドメインに閉じ込め、例外を使わない |
| ユースケースのシナリオ | 依存をカリー化で受ける関数。取得 → ドメイン関数に委譲 → 保存 | 業務判定をユースケースに書かない |
| Repository | `insert / findById / findByXxx / update` のみの `type` | 業務ロジックの混入禁止 |

## 実装時の設計原則

1. `class` 禁止。型は `type` のみ（`interface` 禁止）、すべて `Readonly<>`
2. 判別子は `kind` に統一する
3. 型と関数は Companion Object（同名の `type` と `const`）で同じファイルに置く。1概念1ファイル
4. ドメイン層・ユースケース層で `throw` しない。失敗は専用エラー型（Discriminated Union）の `Result` で返す
5. 現在時刻・ID 生成は引数/依存で注入する（`new Date()` をドメイン・ユースケース内で呼ばない）
6. `as` は `as const` 系のみ（ID の `of` ファクトリを唯一の例外とする。バリデーションライブラリ導入後は `.brand()` に移行）
7. 境界で検証した値をドメイン内で再検証しない（型を信頼する）
8. 状態を持つ集約は、集約ルートの Companion 関数を経由してのみ変更する（新しいオブジェクトを返す）

## Repository の責務

Repository は集約をまるごと保存・取得するだけ。業務ロジックを入れない。

```ts
export type SeminarRepository = Readonly<{
  insert: (seminar: Seminar) => Promise<void>;
  findById: (id: SeminarId) => Promise<Seminar | undefined>;
  findByTitle: (title: string) => Promise<readonly Seminar[]>;
  update: (seminar: Seminar) => Promise<void>;
  // addApplication(...)  // ×: リポジトリの責務を超えている
  // approve(...)         // ×: リポジトリの責務を超えている
}>;
```

## アンチパターン（レビューで見つけたら差し戻す）

- ドメインルールがユースケース関数や UI に書かれている
- プリミティブ型のまま業務ルール付きの値を引き回している
- 全状態を1つの型にオプショナル属性で詰め込んでいる（`driverId?: string` など）
- `switch` の `default` で `assertNever` を使わず、状態の追加漏れを見逃している
- 集約の外から内部コレクションを組み替えている
- Repository に `addXxx` / `approve` のような業務操作を生やしている
- 同じ状態判定の条件式が複数箇所にコピーされている（Companion の述語関数にまとめる）

## この変換規則の適用例

[examples/seminar-reservation/03-implementation](../examples/seminar-reservation/03-implementation/README.md) で、[02-domain-analysis.md](02-domain-analysis.md) のドメインモデル図を TypeScript に翻訳している。
