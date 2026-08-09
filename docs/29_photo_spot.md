# フォトスポットめぐり

## 概要

3D 撮影探索ゲーム。街に 5 つのランドマークが建っており、それぞれを見つけてシャッターを切る。構図・距離・見通しで ★1〜★3 の採点。全★3 でコンプリート。のんびり系でタイムプレッシャーなし（全★3 タイムだけ記録）。

## 実装内容

| ファイル | 内容 |
|---|---|
| `games/photo-spot/index.html` | タイトル・HUD・リザルト・シャッターボタン |
| `games/photo-spot/css/style.css` | スタイル（ファインダーフレーム・フラッシュ・ミッションチップ） |
| `games/photo-spot/js/main.js` | ゲームループ・写真判定・ファインダーグロウ |
| `games/photo-spot/js/landmarks/Landmarks.js` | 5 種ランドマーク生成（プリミティブ）+ 観覧車回転アニメ |
| `games/photo-spot/js/photo/PhotoJudge.js` | Frustum 内判定・NDC 中央度・Raycaster 遮蔽チェック→★算出 |
| `games/photo-spot/js/sound.js` | playShutter / playNoShot / playComplete |
| `games/index.html` | ゲーム一覧に 📸 カード追加 |

## ランドマーク一覧

| ID | 名前 | 絵文字 | 適正距離 |
|---|---|---|---|
| clock | 時計台 | 🕰 | 15〜40m |
| wheel | 観覧車 | 🎡 | 20〜55m |
| fountain | 噴水 | ⛲ | 8〜30m |
| tree | 大きな木 | 🌳 | 10〜35m |
| tower | 赤い鉄塔 | 🗼 | 25〜60m |

## 採点方式（★1〜★3）

| 条件 | 内容 |
|---|---|
| 基本（★1） | ランドマークが Frustum 内に入っており、建物で遮られていない |
| 距離（+★1） | プレイヤーがランドマークごとの適正距離バンド内にいる |
| 中央度（+★1） | ランドマーク中心が画面中心から NDC 30% 以内 |
| 遮蔽 | Raycaster で建物に当たった場合は「なにも写っていない」で不成立 |

## 技術的な補足

- **フレーム内判定**: `THREE.Frustum.setFromProjectionMatrix(P*V)` でランドマーク代表点を判定
- **中央度**: `THREE.Vector3.project(camera)` で NDC 変換し `max(|ndc.x|, |ndc.y|) < 0.3`
- **遮蔽チェック**: `Raycaster` でカメラ → ランドマーク方向にキャスト。建物メッシュ（`castShadow=true`）が先に当たれば遮蔽扱い
- **ファインダーグロウ**: 未★3 のランドマークが Frustum 内に入ると `#finder-frame` に `.glow` クラスが付き、四隅の枠が金色に光る
- **フラッシュ**: `#flash-overlay` (白 DIV) の opacity を 0 → 1 → 0 で 120ms アニメーション
- **観覧車アニメ**: `root.rotation.y += dt * 0.3` で毎フレーム回転（ゴンドラは InstancedMesh）
- **ミッションチップ**: 撮影のたびに DOM を再生成（5 枚、未撮影は `---`、撮影済は `★★☆` 表示）
- `localStorage`: `photo-spot.best` / `photo-spot.best.daily.YYYY-MM-DD`（全★3 タイムを秒で保存）
