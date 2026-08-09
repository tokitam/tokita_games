# スライムボウリング

## 概要
BabylonJS + Cannon.js 物理エンジンを使った3Dボウリングゲーム。半透明グリーンのスライムボールをスワイプで投げ、10本のピンを倒すスコアを競う。全5フレーム・各2投で1ゲーム。

## 実装内容
- `games/slime-bowling/index.html` — タイトル・ゲーム・リザルトの3画面を切り替えるSPA構造
- `games/slime-bowling/css/style.css` — ダークテーマの縦長レイアウト。スコア表・3Dキャンバスを縦並びに配置
- `games/slime-bowling/js/sound.js` — Web Audio API で投球・衝突・ストライク・スペア効果音を合成
- `games/slime-bowling/js/game.js` — フレーム進行（state machine）・スコア計算・DOMスコア表更新
- `games/slime-bowling/js/main.js` — BabylonJSシーン構築・Cannon.js物理・入力（スワイプ/ドラッグ）・演出

## 使い方
1. スタートボタンをタップ
2. 左右ドラッグで立ち位置を調整（最大±1.5ユニット）
3. 上方向スワイプでボールを投球（スワイプの左右角度で方向、速さで球速が決まる）
4. 5フレーム（最大10投）でゲーム終了

## 技術的な補足
- 物理エンジン: `BABYLON.CannonJSPlugin`（CDN の cannon@0.6.2）
- ピン倒れ判定: 3秒タイマー後にピンのワールドY軸と上方向ベクトルの内積 < 0.7（約45°以上傾き）で判定
- スコア: 倒したピン数合計 + ストライクボーナス5点・スペアボーナス3点（本式スコアの簡略版）
- ハイスコアは `localStorage['slime-bowling.highscore']` に保存
- ぷるぷる演出: `registerBeforeRender` でスケールをsin波で微振動させるスクワッシュ&ストレッチ
