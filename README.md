# ai-ddd

ログラス松岡幸一郎さんの「ユースケース駆動 × SUDOモデリング」と、ミノ駆動さんの「ドメインオブジェクト設計（良いコード/悪いコードで学ぶ設計入門）」を統合し（実装は kamae の関数型スタイル。原則は踏襲し、手段をクラスから純粋関数 + Discriminated Union に置き換える）、**ユースケース分析 → ドメイン分析 → 実装**という一本の型に落とし込んだ方法論と、型チェックの通るサンプル実装です。

## 読む順番

1. [docs/00-methodology.md](docs/00-methodology.md) — 全体プロセス（なぜこの順番か、フェーズごとの入出力）
2. [docs/01-usecase-analysis.md](docs/01-usecase-analysis.md) — ユースケース分析の型（ユースケース図・シナリオ記述）
3. [docs/02-domain-analysis.md](docs/02-domain-analysis.md) — ドメイン分析の型（SUDOモデリング: S/D/O）
4. [docs/03-implementation-guideline.md](docs/03-implementation-guideline.md) — ドメインモデル→実装への変換規則（関数型）
5. [docs/checklist.md](docs/checklist.md) — 各フェーズのレビューチェックリスト
6. [examples/seminar-reservation/](examples/seminar-reservation/README.md) — 上記の型を「セミナー予約システム」に適用した一気通貫の実例（分析ドキュメント + TypeScript実装）

## 出典・参考

- 松岡幸一郎さん（ログラス）のユースケース駆動モデリング講演: https://logmi.jp/tech/articles/322835
- SUDOモデリングの実践例（Qiita）: https://qiita.com/takuuuuuuu777/items/ab5f6854738af5f1b401
- ミノ駆動『良いコード/悪いコードで学ぶ設計入門』
- kamae（関数型ドメインモデリングのスキル。ローカル: `~/.agents/skills/kamae`）
