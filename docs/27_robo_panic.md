# にげろ！ロボそうじ機パニック

## 概要

3D 逃走 + コイン集めゲーム。ロボット掃除機の群れから逃げながら街中のコインを集め、捕まるまでのスコアを競うエンドレスゲーム。ねこキャッチシティの都市生成・操作系を流用。

## 実装内容

| ファイル | 内容 |
|---|---|
| `games/robo-panic/index.html` | タイトル・HUD・ゲームオーバー画面 |
| `games/robo-panic/css/style.css` | スタイル（赤いグロウ演出対応） |
| `games/robo-panic/js/main.js` | ゲームループ全体。CatManager を RobotManager + CoinManager に置換 |
| `games/robo-panic/js/robots/Robot.js` | ロボット 1 体：プリミティブ組み立て＋追跡 AI |
| `games/robo-panic/js/robots/RobotManager.js` | 台数管理・速度スケーリング・接触判定 |
| `games/robo-panic/js/coins/CoinManager.js` | InstancedMesh コイン・取得判定・ウェーブ再配置 |
| `games/robo-panic/js/sound.js` | playCoin / playWave / playWarning / playGameOver |
| `games/index.html` | ゲーム一覧に 🤖 カード追加（17 本に更新） |

## 使い方

1. タイトルでスタートを押す（毎回ランダムシード）
2. コインに近づくと自動取得（+10pt）
3. ロボが近づくと画面縁が赤くなり警告音が鳴る
4. 全コイン取得で Wave が進み、コインが再配置される（ロボも増加中）
5. ロボに 0.8m 以内まで近づかれるとゲームオーバー
6. スコア = コイン獲得点 + 生存秒数

## ゲームバランス

| 項目 | 値 |
|---|---|
| 初期ロボ台数 | 2 台 |
| ロボ追加間隔 | 45 秒ごと +1 台（最大 8 台） |
| ロボ速度上昇 | 30 秒ごと +2% |
| ロボ基本速度 | 2.2 m/s（歩き 2.0 と走り 5.5 の間） |
| コイン枚数 | 30 枚（全取得で Wave + 再配置） |
| コイン価値 | 10 pt |
| 接触判定距離 | 0.8 m |
| 警告距離 | 10 m（赤グロウ + 警告音） |

## 技術的な補足

- **ロボ外見**: 外部アセットなし。CylinderGeometry（ボディ）+ SphereGeometry（ドーム）+ 赤い LED 目 + ブラシ Group の組み立て
- **追跡 AI**: プレイヤー方向への直線速度ベクトル + `CollisionWorld.resolveCircle()` で建物スライド。経路探索なし（壁に引っかかる挙動も「掃除機らしさ」として許容）
- **コイン描画**: `InstancedMesh` 1 つで 30 枚をまとめて描画。毎フレーム回転（`decompose/compose` で既存行列を更新）
- **赤いグロウ**: `#screen-glow` DIV に `box-shadow: inset rgba(255,40,40,0.7)` を適用。nearestDist が 10m 未満になると `opacity` を距離連動で上げる
- **スポーン出現エフェクト**: `THREE.Points` で土ぼこりパーティクル（1 秒でフェードアウト）
- `localStorage` キー: `robo-panic.best`（スコア整数）
