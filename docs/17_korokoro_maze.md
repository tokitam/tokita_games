# ころころ迷路

## 概要
BabylonJS を使った3D迷路ゲーム。スワイプで盤面を傾け、金色のボールを転がしてゴールまで導く。全3ステージ、クリアタイムを競う。

## 実装内容
- `games/korokoro-maze/index.html` — タイトル・ゲーム・クリアのSPA
- `games/korokoro-maze/css/style.css` — パステル系のかわいいレイアウト
- `games/korokoro-maze/js/sound.js` — Web Audio API で転がり・ゴール・落下効果音を合成
- `games/korokoro-maze/js/stages.js` — 3ステージの迷路データ（2次元配列）
- `games/korokoro-maze/js/game.js` — 物理（自前）・壁衝突・穴判定・タイマー
- `games/korokoro-maze/js/main.js` — BabylonJSシーン・迷路メッシュ構築・傾き入力・UI

## 使い方
1. タイトルでステージを選択
2. 画面をドラッグ（スワイプ）で盤面を傾ける（最大±15°）
3. ゴール穴にボールを転がし込めばクリア
4. 落とし穴に落ちるとスタートに戻る（タイム継続）

## 技術的な補足
- 物理は自前実装（Cannon.js 不使用）: 盤面傾き角から加速度を計算、摩擦 `v *= 0.98`
- 壁衝突はグリッドベースのAABB判定（ボール半径マージン付き）
- 盤面全体を `TransformNode` の子にまとめて傾ける（物理はワールド座標で計算して分離）
- ボールは金色スペキュラ強め `StandardMaterial`
- ハイスコア（ベストタイム）は `localStorage['korokoro-maze.best.stage{N}']` に保存
