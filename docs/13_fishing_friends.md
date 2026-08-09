# フィッシングフレンズ

## 概要
BabylonJS を使った3D釣りゲーム。水面と水中が同時に見えるシーンで、泳ぐ魚を狙ってスワイプキャスト→タイミングタップで釣り上げる。60秒でいくつ釣れるかのスコアを競う。

## 実装内容
- `games/fishing-friends/index.html` — タイトル・ゲーム・リザルトの3画面SPA
- `games/fishing-friends/css/style.css` — 水中テーマのダークブルーレイアウト
- `games/fishing-friends/js/sound.js` — Web Audio API で キャスト・アタリ・キャッチ・タイムアップ効果音を合成
- `games/fishing-friends/js/fish.js` — 魚の種類定義・遊泳AI・抽選ロジック
- `games/fishing-friends/js/game.js` — 状態機械（ready→casting→waiting→biting→catching/escaped→ready）・タイマー・スコア管理
- `games/fishing-friends/js/main.js` — BabylonJSシーン（水面・水中・魚・ウキ）・入力・UI連携

## 使い方
1. スタートボタンをタップ
2. 上方向スワイプでウキを投げる（スワイプの左右で着水位置の角度が変わる）
3. 魚がウキをつつくと「！」マークとウキが沈む — 0.8秒以内にタップでフッキング
4. 60秒でゲーム終了

## 技術的な補足
- 魚の遊泳: 各魚はランダムウェイポイントへLerp移動 + sinカーブ上下ゆらぎ
- ウキ着水時: 距離3ユニット以内の魚が確率でウキへ向かい1〜3秒後にアタリ
- 水面: CreateGroundの頂点をregisterBeforeRenderで `y = 0.06 * sin(x * 1.5 + t)` と揺らす
- 魚の見た目: Sphere（胴体）+ Cone（尾びれ）の親子メッシュ＋DynamicTextureで目を描画
- ハイスコアは `localStorage['fishing-friends.highscore']` に保存
- 残り10秒でBGM風の効果音テンポアップとタイマー点滅
