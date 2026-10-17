# 逃げ忍！

## 概要

横スクロールエンドレスランナー。忍者キャラクターが自動で走り続け、プレイヤーはジャンプと手裏剣投げで障害物・敵を回避・撃破しながらスコアを伸ばす。

## 実装内容

- `games/nige-shinobi/index.html` — HTMLエントリーポイント
- `games/nige-shinobi/css/style.css` — 暗いテーマのUI
- `games/nige-shinobi/js/game.js` — ゲームロジック・Canvas描画
- `games/nige-shinobi/js/sound.js` — Web Audio API効果音
- `games/index.html` — メニューに追加（17本目）

## 使い方

| 操作 | PC | モバイル |
|---|---|---|
| ジャンプ | スペース / ↑ | タップ |
| 手裏剣 | Z / X | 左スワイプ |

- 走行距離 1m = 1pt、敵撃破 = 10pt ボーナス
- ハイスコアは localStorage に保存

## 技術的な補足

- 外部ライブラリなし・ビルド不要のバニラ Canvas 実装
- 視差スクロール2層（遠景山・近景山）でナイト景観を表現
- 障害物（岩・カラス）と敵（侍）をプロシージャル生成。スポーン間隔は距離に応じて短縮
- スクロール速度は `INIT_SPEED=4` から最大 `MAX_SPEED=10` まで線形加速
- 手裏剣クールタイム30フレーム（≒0.5秒）。`shurikenCooldown` カウンタで管理
- Object Pool は未使用（splice で削除）。長時間プレイでの GC 影響は許容範囲と判断
- モバイルのスワイプ判定: touchstart で `swipeStartX` を記録し、touchend で差分 >40px を検出
