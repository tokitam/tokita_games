# お片付けパニック

## 概要
BabylonJS + Cannon.js 物理エンジンを使ったお片付けゲーム。散らかった部屋のおもちゃをスワイプで投げ飛ばし、同じ色の収納ボックスに収める。制限時間60秒。

## 実装内容
- `games/okataduke-panic/index.html` — SPA（タイトル・ゲーム・ゲームオーバー）
- `games/okataduke-panic/css/style.css` — HUD・タイマー・コンボ表示
- `games/okataduke-panic/js/sound.js` — ぽこん・ファンファーレ・効果音（Web Audio API）
- `games/okataduke-panic/js/game.js` — スコア・タイマー・収納判定・コンボ
- `games/okataduke-panic/js/main.js` — BabylonJS シーン・Cannon.js 物理・スワイプ投げ・演出

## 使い方
1. タップでゲーム開始
2. おもちゃをタッチ＆スワイプで投げる
3. 同色のボックスに入ると+10点（違う色は+3点）
4. 60秒以内に全部片付けると残り秒数×5のボーナス
5. 時間切れでゲームオーバー

## 技術的な補足
- 物理: Cannon.js。おもちゃは mass=1、床/壁/ボックスは mass=0
- restitution: ボール0.7、ぬいぐるみ0.05、その他0.3
- スワイプ速度マッピング: スクリーン dx → ワールドX、dy → -Z。上向き成分を自動付加
- 収納判定: ボックス AABB 内に重心が入り速度が閾値未満になったらカウント
- コンボ: 5秒以内連続収納で得点1.5倍
- ハイスコア: `localStorage['okataduke-panic.highscore']`
