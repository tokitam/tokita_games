# Google Analytics 対応（ga.js による静的方式）

## 概要
メニューと全ゲームページの `<head>` に `games/ga.js` を読み込む `<script>` タグを 1 行追加した。`ga.js` が存在する場合のみ GA 計測が始まる。PHP 化・ファイルリネームは行わず、静的構成のまま実現。

## 実装内容
- `games/index.html`（メニュー）の `<meta charset>` 直後に追加:
  ```html
  <script src="./ga.js" defer></script>
  ```
- `games/<name>/index.html`（全 20 ゲーム）の `<meta charset>` 直後に追加:
  ```html
  <script src="../ga.js" defer></script>
  ```
- `.gitignore` に `games/ga.js` を追加（誤コミット防止）
- README に GA 設置手順と `ga.js` スニペット例を追記

## 使い方

### GA タグを有効にする
`games/ga.js` をデプロイ先に配置する。内容は GA 測定 ID を含む gtag スニペットを JS で記述したもの（README 参照）。ファイルが無い場合は 404 が console に出るだけでページ表示・ゲーム動作への影響はない。

### 新しいゲームを追加する際
`games/<name>/index.html` の `<meta charset="UTF-8">` の直後に以下を必ず追加する:
```html
<script src="../ga.js" defer></script>
```

## 技術的な補足
- `defer` 属性により、スクリプトの読み込みがページの描画・ゲーム起動をブロックしない
- index.html のリネームを行わないため、既存 URL と静的ホスティング（GitHub Pages 等）での動作を維持
- `ga.js` が無い場合は 404 が 1 件 console に記録されるのみ。空の `ga.js` を置けば消える
- #59（PHP 方式）を本方式で置き換え
