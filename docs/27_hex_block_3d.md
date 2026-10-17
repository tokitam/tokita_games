# ヘクサバースト（3D六角形ブロックパズル）

## 概要

BabylonJS を使用した 3D 空間上の六角形ブロックパズルゲーム。同じ色の六角形ブロックを 5 個以上つなげると消えてスコアが増える。

## 実装内容

- `games/hex-block-3d/index.html` — BabylonJS CDN 読み込み、HUD・オーバーレイ HTML
- `games/hex-block-3d/css/style.css` — ダークテーマ、グラスモーフィズム HUD
- `games/hex-block-3d/js/sound.js` — Web Audio API によるSE（配置・消去・チェーン・ゲームオーバー）
- `games/hex-block-3d/js/hexGrid.js` — flat-top 軸座標 `(q, r, h)` とワールド座標変換
- `games/hex-block-3d/js/game.js` — 盤面状態管理・BFS マッチ判定・スコア計算
- `games/hex-block-3d/js/main.js` — BabylonJS シーン・カメラ・メッシュ・ゴーストブロック

## 使い方

- ゴーストブロック（半透明）をタップ／クリックしてブロックを配置
- 同じ色が 5 個以上つながると消える（チェーン消しあり）
- 配置できる場所がなくなるとゲームオーバー
- ArcRotate カメラ：ドラッグで視点回転、ピンチ／スクロールでズーム

## 技術的な補足

### 座標系
flat-top 軸座標 `(q, r, h)` を使用。ワールド変換:
- `x = HEX_SIZE * 1.5 * q`
- `y = h * HEX_H`
- `z = HEX_SIZE * (√3/2 * q + √3 * r)`

隣接方向は水平 6 方向 + 上下 2 方向の計 8 方向。

### マッチ判定
BFS で同色の連結成分を探し、5 個以上なら消去。消去後も再帰的にチェーン判定を行う。

### ゴーストブロック
`emptyAdjacents()` で既存ブロックに隣接する空きセルを列挙し、次の色で半透明メッシュを生成。クリック時に `doPlace()` を呼ぶ。

### スコア
消去したブロック数 × 10 点。ハイスコアは `localStorage['hex-block-3d.hs']` に保存。
