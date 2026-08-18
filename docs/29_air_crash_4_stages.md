# エアクラッシュの改良（全4ステージ制）

## 概要
エアクラッシュを全4ステージ制に改良。ステージごとに異なる特性を持つCPUと戦い、全ステージクリア後に総合タイムをX（旧Twitter）でシェアできる。

## 実装内容

### 変更ファイル
- `games/air-crash/js/game.js` — ステージシステム・CPU種別・タイム計測の追加
- `games/air-crash/js/main.js` — ステージクリア画面・全クリア画面・Xシェアの追加
- `games/air-crash/index.html` — ステージクリア・全クリアパネルの追加
- `games/air-crash/css/style.css` — 新パネルのスタイル追加

### ステージ構成

| ステージ | 敵タイプ | HP | サイズ | 特徴 |
|---|---|---|---|---|
| 1面 | ノーマル | 5 | 40px | 通常の動作 |
| 2面 | でかい | 10 | 80px | サイズ2倍・当たり判定も拡大 |
| 3面 | ワープ | 5 | 40px | 2〜3秒ごとにランダム位置へテレポート |
| 4面 | タフ | 10 | 40px | 壁ダメージ耐性50%・衝突時ほぼ動かない |

## 使い方
1〜4面を順にクリアすると「全ステージクリア」画面が表示される。
総合タイム（秒）とともにXへのシェアボタンが表示される。

## 技術的な補足
- `STAGE_CONFIG` 配列でステージ別CPUパラメータ（cpuSize・cpuMaxHp・warp・cpuWallDamageRate・cpuCollisionResist）を一元管理
- `initStage(n)` でステージ初期化、`nextStage()` でステージ進行
- phase に `'stage_clear'` / `'all_clear'` を追加（既存の `'result'` はプレイヤー敗北時のみ）
- タイムはフレームカウント÷60で計算（60fps想定）
- ステージ4はcpuCollisionResist=0.1（衝突時CPUの速度変化を0.1倍）により、ぶつけてもほぼ動かない「タフ」感を実現
- 壁ダメージ耐性はMath.random()を使った確率ベース（cpuWallDamageRate=0.5で50%の確率でダメージ）
