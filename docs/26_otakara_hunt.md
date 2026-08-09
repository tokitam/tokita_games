# キラキラおたからハント

## 概要

3D 探索型宝探しゲーム。ねこキャッチシティと同じ都市生成・操作系をベースに、猫キャッチの代わりに「ソナー誘導で宝を発掘する」体験を実装した。

## 実装内容

| ファイル | 内容 |
|---|---|
| `games/otakara-hunt/index.html` | タイトル・HUD・リザルト画面 |
| `games/otakara-hunt/css/style.css` | スタイル（宝ゲーム用にリデザイン） |
| `games/otakara-hunt/js/main.js` | ゲームループ全体。catManager → treasureManager に置換 |
| `games/otakara-hunt/js/treasure/TreasureManager.js` | 宝配置・スパークル・発掘エフェクト |
| `games/otakara-hunt/js/sound.js` | playSonar / playFind / playFootstep |
| `games/index.html` | ゲーム一覧にカード追加（💎 キラキラおたからハント） |

## 使い方

1. タイトルで「きょうの街」（日次固定シード）か「ランダム」を選ぶ
2. フィールドに 5 つのおたから（最後の 1 個は金色）が埋まっている
3. 近づくとソナーが鳴り始め、**ビープ間隔が短くなる / 音程が高くなる**ほど近い
4. 画面の縁が金色に光り（グロウ）、さらに近づくとキラキラパーティクルが見える
5. 1.2m 以内に近づくと発掘成功。宝石が飛び出してクリア効果音が鳴る
6. 5 つすべて発掘するとタイム計測終了

## ゲームメカニクス

| 項目 | 値 |
|---|---|
| 宝の数 | 5（最後の 1 個がゴールデン） |
| ソナー間隔 | 1.2s（60m 以上）→ 0.2s（5m 以内） |
| ソナー音程 | 440Hz（60m+）→ 1200Hz（5m 以内） |
| スクリーングロウ | 距離 20m 以内で opacity 0→0.5 |
| スパークル表示 | 距離 10m 以内 |
| 発掘距離 | 1.2m |
| 最小宝間隔 | 25m |

## 技術的な補足

- 都市生成・衝突判定・カメラ・キャラクターは neko-catch-city と共通コードをそのままコピー
- `TreasureManager` は `CollisionWorld.isInsideBuilding()` で建物内配置を回避
- スクリーングロウは `#screen-glow` DIV に `box-shadow: inset` で実装。`opacity` を JS で変化させる
- 方向インジケーター（`#treasure-indicator`）は最近傍の未発掘宝への向きを SVG 矢印で表示。neko-catch-city の cat-indicator と同じ数学（`sRight/sUp/atan2`）
- `playSonar(freq)` は距離ベースの freq を main.js で計算して渡す（TreasureManager 非依存）
- `localStorage` キーは `otakara-hunt.best` / `otakara-hunt.best.daily.YYYY-MM-DD`
