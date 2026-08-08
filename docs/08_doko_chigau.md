# どこちがう？（間違い探し）

対応 issue: #13

## 概要

左右2枚のSVGイラストから5か所の違いをタップで見つける間違い探しゲーム。ステージはJSON+SVGで管理し、ファイルを追加するだけで増やせる構成。

## 実装内容

### ファイル構成

```
games/doko-chigau/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── sound.js    — 正解/不正解/クリア効果音
│   ├── stage.js    — ステージ読み込み・違い判定・ヒント・localStorage
│   └── main.js     — 画面遷移・マーカー描画・入力処理
└── stages/
    ├── index.json       — ステージ一覧
    ├── stage01.json     — 公園のひるさがり（違い座標）
    ├── stage01_a.svg    — 左の絵（正解版）
    ├── stage01_b.svg    — 右の絵（違いあり版）
    ├── stage02.json     — かわいいキッチン
    ├── stage02_a.svg / stage02_b.svg
    ├── stage03.json     — うみのたんけん
    └── stage03_a.svg / stage03_b.svg
```

## 使い方

- タイトルからステージを選択
- 左右の絵を見比べて、違うところをタップ
- 5か所すべて見つけるとステージクリア
- 💡ヒントボタン（2回まで）で未発見の違いをハイライト
- クリアタイムがベストタイムとして保存される

## 技術的な補足

- 違いの判定: タップ座標を SVG の viewBox 空間（0〜300×0〜220）に正規化して、JSON の `{x, y, r}` の円形当たり判定と比較
- `object-fit: contain` で表示されるため、`getBoundingClientRect` と viewBox のアスペクト比から offset を計算してマーカーを正確に配置
- 右パネルのタップは左パネルと同じ viewBox 空間に変換して同一判定ロジックを使用
- SVG は `pointer-events: none` の img タグで表示し、タップは上のレイヤーが受け取る
- ステージ追加方法: `stages/stageNN_a.svg` と `stages/stageNN_b.svg` を作成 → `stages/stageNN.json` で違い座標を定義 → `stages/index.json` に追記
- ローカル確認: `python3 -m http.server 8000` → `http://localhost:8000/games/doko-chigau/`
- localStorage: `doko-chigau.clear.{stageId}` → ベストタイム（秒）
