# オブジェクト図（O）— 具体例から始める

[01-usecase/scenarios.md](../01-usecase/scenarios.md) の事前条件・事後条件・代替/例外フローを、実際の値で書き出す。

## ケース1: 定員に空きがあるセミナーへの申込（UC1 基本フロー）

```mermaid
flowchart TB
    S1["seminar: Seminar
    id = S001
    title = DDD入門
    startAt = 2026-10-01 19:00
    capacity = 5
    applications = [A1, A2, A3]（申込済3件）"]
    A1["application: Application
    id = A1, memberId = M001, status = 申込済"]
    S1 -->|1..*| A1
    N1{{"会員M004が申込 → 定員5に対し
    申込済3件なので受付可能"}}
    S1 -.-> N1
```

## ケース2: 定員に達しているセミナーへの申込（UC1 代替フロー 3a）

```mermaid
flowchart TB
    S2["seminar: Seminar
    id = S002
    title = 満員セミナー
    capacity = 2
    applications = [A10, A11]（申込済2件）"]
    N2{{"会員M999が申込 → 定員2に対し
    申込済2件のため申込不可（isFull）"}}
    S2 -.-> N2
```

## ケース3: 重複申込（UC1 例外フロー 3b）

```mermaid
flowchart TB
    S3["seminar: Seminar
    id = S003
    applications = [A20]（memberId = M001, status = 申込済）"]
    N3{{"会員M001が再度申込 → 同一セミナーに
    同一会員の申込済が既にあるため申込不可"}}
    S3 -.-> N3
```

## ケース4: 開催直前のキャンセル（UC2 例外フロー 3a）

```mermaid
flowchart TB
    S4["seminar: Seminar
    id = S004
    startAt = 2026-10-01 19:00（現在時刻: 2026-09-30）"]
    A40["application: Application
    id = A40, memberId = M001, status = 申込済"]
    S4 --> A40
    N4{{"開催日まで残り1日 (< 3日) のため
    A40のキャンセルは不可"}}
    A40 -.-> N4
```

## ケース5: 定員0以下のセミナー作成（UC3 例外フロー 2a）

```mermaid
flowchart TB
    N5{{"capacity = 0 を指定してSeminarを
    作成しようとするとエラー（生成不可）"}}
```

## ここまでで洗い出せたルール一覧

1. 定員(capacity)に達している場合、そのセミナーへの新規申込は不可（`Seminar`の責務）
2. 同一会員は同一セミナーに重複して申込済状態になれない（`Seminar`の責務）
3. 開催日の3日前を過ぎたら、その申込はキャンセル不可（`Application`の責務、`Seminar`の開催日時が必要）
4. 定員(capacity)は1以上でなければならない（`Capacity`値オブジェクトの責務）
5. 申込は必ず「申込済」状態で作成される（`Application`の生成規則）
6. キャンセル済の申込を再度キャンセルすることはできない（`Application`の責務）

これらを [domain-model-diagram.md](domain-model-diagram.md) で抽象化し、責務を割り当てる。
