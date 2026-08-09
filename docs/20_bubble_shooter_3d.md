# バブルシューター3D

## 概要
BabylonJS を使った360°バブルシューター。プレイヤーは球状に取り囲むバブルの中心に立ち、スワイプで視点を回転させながらタップで同色バブルを撃ち込んで3個以上つなげて消す。全3ステージ。

## 実装内容
- `games/bubble-shooter-3d/index.html` — SPA（タイトル・ゲーム・クリア・ゲームオーバー）
- `games/bubble-shooter-3d/css/style.css` — HUD・次弾表示・体力バー
- `games/bubble-shooter-3d/js/sound.js` — ぷちゅん・発射・ゲームオーバー音（Web Audio API）
- `games/bubble-shooter-3d/js/grid.js` — フィボナッチ球によるセル生成・隣接判定・BFS連結探索
- `games/bubble-shooter-3d/js/game.js` — 発射・吸着・ポップ・孤立落下・進行
- `games/bubble-shooter-3d/js/main.js` — BabylonJS シーン・InstancedMesh・カメラ慣性スワイプ・入力

## 使い方
1. タップでゲーム開始
2. スワイプで視点を回転
3. タップで中央下の次弾を発射
4. 同色3個以上が隣接するとポップ
5. 全バブルを消せばステージクリア、3ステージでゲームクリア

## 技術的な補足
- セル: フィボナッチ球（黄金角 137.5°）で球面に均等配置。半径8
- 隣接: セル間距離が平均最近接距離×1.4未満を隣接とみなす（5〜7個/セル）
- 発射: タップでレイを生成し、接触バブルの隣接空きセルへスナップ
- ポップ: 同色BFS。アンカー（天頂付近）から切れた塊も孤立として落下
- 体力: 吸着後ポップしなかった時のみ-1（初期20）
- スコア: ポップ10点、落下ボーナス20点、6個以上50点ボーナス
- ハイスコア: `localStorage['bubble-shooter-3d.highscore']`
