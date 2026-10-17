# 箱積み職人「TOBI STACK」

## 概要

Matter.js 物理演算を使ったブロック積み上げゲーム。さまざまな形状のブロックを配置して、90秒間でできるだけ高いタワーを作る。ブロックは物理的に崩れるため、積み方のバランスが重要になる。

## 実装内容

- `games/tobi-stack/index.html` — HTMLエントリーポイント
- `games/tobi-stack/css/style.css` — 暗いテーマのUI
- `games/tobi-stack/vendor/matter.min.js` — Matter.js（fruit-poton からコピー）
- `games/tobi-stack/js/game.js` — ゲームロジック・Canvas描画・Matter.js 統合
- `games/tobi-stack/js/sound.js` — Web Audio API 効果音
- `games/index.html` — メニューに追加（17本目）

## 使い方

| 操作 | PC | モバイル |
|---|---|---|
| ブロック移動 | ← / → キー | 左右スワイプ |
| 回転 | Z / X | タップ |
| 落とす | スペース / ↓ | 下スワイプ |

- ブロックを落とした後、1.1秒後に次のブロックが出現
- 90秒経過でタイムアップ。ブロックが3個落下でゲームオーバー
- タワーの最高点 ÷ 50px = スコア（段数）
- ハイスコアは localStorage（キー: `tobi-stack.hs`）に保存

## 技術的な補足

- Matter.js (`vendor/matter.min.js`) + バニラ Canvas 2D API（ビルド不要）
- fruit-poton と同じ構成パターン: `Matter.Render` は使わず、Canvas に自前描画
- 操作中ブロック（activeBlock）は Matter.js ボディを持たない。`placeBlock()` 時に dynamic ボディを作成して World に追加し、初速 `vy=7` を与えて落下させる
- 落下ミス検出: `Matter.Events.on(engine, 'afterUpdate', ...)` で `position.y > H+160` または `|position.x| > W+120` を監視。条件に合うボディを World から除去してミスカウント
- サイドウォールなし（意図的）。タワーが傾くとブロックが左右に落ちてミスになる設計
- スコア計算: `stackBodies` 内の最小 `position.y` を `(H - minY) / BLOCK_UNIT` で段数に換算
- `enableSleeping: true` で静止したボディを休眠させ、長時間プレイの物理演算負荷を抑制
