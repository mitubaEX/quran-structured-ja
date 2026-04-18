# クルアーン理解支援データ

このディレクトリは、クルアーンを「原典そのものの改変版」としてではなく、理解支援のために現代日本語で整理した構造化データとして扱うための最小実装です。

## 目的

- クルアーンを章・節単位で機械処理しやすい形で保持する
- 原文に対する理解補助として、逐語寄り表現・現代日本語表現・要約・テーマ・注記を分けて管理する
- 将来的に検索、UI表示、LLM入力、注釈表示へ流用しやすくする

## このプロジェクトの立場

- このデータは、クルアーン本文の正式な置き換えを意図しません
- `literal_ja` `modern_ja` `summary_ja` `notes` `caution` は、理解支援のための整理情報です
- 宗教的・学術的に解釈差がありうる箇所は、断定せず `notes` または `caution` に分けて記録します
- 特定の訳や学派を唯一の正解として固定することは目的にしていません

## ディレクトリ構成

```text
quran-structured-ja/
├── README.md
├── data
│   ├── index.json
│   └── chapters
│       └── surah-001-al-fatiha.json
├── schema
│   ├── quran-index.schema.json
│   └── quran-surah.schema.json
└── scripts
    └── validate.py
```

## データ構造

### 章ファイル

各章は `data/chapters/` 配下に 1 ファイルずつ保存します。

- `surah`: 章番号
- `chapter_name_ar`: 章名のアラビア語表記
- `chapter_name_ja`: 章名の日本語表記
- `chapter_name_en`: 章名の英語表記
- `traditional_order`: 一般的な章順
- `approximate_theme`: 章全体の主題を短く記述
- `ayah_count_total`: 章全体の総節数
- `ayah_count_included`: 現在このデータに収録済みの節数
- `is_partial`: 章が部分収録かどうか
- `summary_ja`: 章全体の短い要約
- `coverage_note`: 部分収録時の補足
- `ayahs`: 節データの配列

### 節データ

- `ayah`: 節番号
- `arabic`: 原文。収録する場合のみ入れる
- `romanized`: ローマナイズ。任意
- `literal_ja`: 逐語寄りの日本語表現
- `modern_ja`: 現代日本語で読みやすくした表現
- `summary_ja`: その節の短い要約
- `themes`: 検索や分類に使うテーマ配列
- `notes`: 語義・背景・補足の注記
- `caution`: 解釈差、読みの違い、断定を避けたい点

## 第1章サンプルについて

第1章「アル＝ファーティハ」を全節収録し、第2章「アル＝バカラ」は段階取り込みの開始として冒頭5節を収録しています。現時点では、将来の 114 章展開を見据えたスキーマ検証可能なサンプルです。

第1章では以下を意識しています。

- `literal_ja` と `modern_ja` の差が見えること
- `summary_ja` を 1〜3 文で短く保つこと
- `themes` を検索に使いやすい粒度に抑えること
- 解釈差や宗教的に慎重であるべき点を `caution` に逃がすこと


## Webビューア

静的ページとして閲覧できる最小ビューアを `explorer/` に追加しています。

- エントリ: `/Users/mituba/Documents/Playground/quran-structured-ja/explorer/index.html`
- 同梱データ: `explorer/data.js`
- 再生成スクリプト: `scripts/build_explorer_data.py`
- 主な機能: 章選択、キーワード検索、テーマ絞り込み、節詳細表示

ブラウザで `index.html` を直接開いても動きます。
章データを追加・更新した後は、次を実行すると Web 用データを再生成できます。

```bash
python3 /Users/mituba/Documents/Playground/quran-structured-ja/scripts/build_explorer_data.py
```

## 検証方法

依存なしで次を実行できます。

```bash
python3 /Users/mituba/Documents/Playground/quran-structured-ja/scripts/validate.py
```

このスクリプトは次を確認します。

- JSON が読み込めること
- `index.json` と章ファイルの整合
- 必須フィールドの存在
- 文字列・配列・数値の型
- 章番号と節番号の一貫性

## 拡張方針

- 114 章へ拡張する際は `data/chapters/` に章ファイルを追加します
- 長大な章は `ayah_count_total` `ayah_count_included` `is_partial` で段階取り込みを管理します
- 一覧用の `data/index.json` に収録章を追記します
- 将来的には、出典情報、啓示区分、主要概念タグ、相互参照、複数訳比較のフィールドを追加できます
- より厳密な検証が必要なら、後段で JSON Schema バリデータ導入や CI 連携を追加できます

## 利用上の注意

- このデータのみを根拠に、宗教的・学術的な唯一解を提示する用途には向きません
- 注釈や表現は理解支援を目的とするため、礼拝・朗誦・正式引用では採用する底本や訳の確認が必要です
- 原文表記や読誦法、節番号の扱いには版や伝承の差異があるため、全面展開前に採用方針を固定することを推奨します
