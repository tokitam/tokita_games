# ねこキャッチシティ

## 概要
three.js を使った三人称視点 3D 猫捕まえゲーム。プロシージャル生成された街の中をタップ操作でキャラクターを動かし、7 匹（通常 6 + 金 1）の猫を全部捕まえるまでのタイムを競う。ビルドなし・npm 不使用で静的ファイルのみの構成。

## 実装内容

### 追加ファイル
- `games/neko-catch-city/index.html` — importmap で three.js を CDN 解決
- `games/neko-catch-city/css/style.css`
- `games/neko-catch-city/models/character.glb` — opengl6 リポジトリから移植
- `games/neko-catch-city/js/config.js` — 調整パラメータ一元管理
- `games/neko-catch-city/js/main.js` — 画面遷移・ゲームループ・入力
- `games/neko-catch-city/js/sound.js` — Web Audio API による効果音
- `games/neko-catch-city/js/citygen/` — 街生成（rng / roads / blocks / buildings / props / generateCity）
- `games/neko-catch-city/js/world/` — three.js シーン構築（CityBuilder / Environment / materials）
- `games/neko-catch-city/js/collision/CollisionWorld.js` — 空間ハッシュ衝突判定
- `games/neko-catch-city/js/camera/ThirdPersonCamera.js` — 三人称視点カメラ
- `games/neko-catch-city/js/player/` — キャラクター制御・アニメーション
- `games/neko-catch-city/js/cats/Cat.js` / `CatManager.js` — 猫の配置・状態管理
- `games/index.html` — メニューに「ねこキャッチシティ」カードを追加

## 使い方

### 操作
- **スマホ**: タップで歩き移動 / ダブルタップ（300ms 以内の連打）で走り移動 / ドラッグでカメラ回転
- **PC**: WASD / 矢印キーで移動 / Shift で走る / マウスドラッグでカメラ回転

### モード
- **きょうの街** — シードを日付から生成。毎日同じ街でタイムアタック
- **ランダム** — 毎回異なる街

### ベストタイム
- localStorage に保存。きょうの街は日付キーで個別管理

## 技術的な補足

### ノービルド three.js
```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/" } }
</script>
```
three@0.185.0 固定（破壊的変更が多いため）。

### opengl6 からの移植
TypeScript 型注釈を除去し、import 末尾に `.js` を付与、`import.meta.env.BASE_URL` を相対パスに変更。

### 猫の描画
外部アセット不要。THREE.js プリミティブ（SphereGeometry / ConeGeometry / TorusGeometry / CylinderGeometry）を組み合わせて構築。7 種の色（白・黒・トラ・ミケ・グレー・クリーム・金）を持つ。

### タップ vs ドラッグ判定
`pointerdown` 時の座標を保持し、`pointerup` 時の総移動量が 10px 未満ならタップ、以上ならドラッグとして扱う（バブルシューター3D の誤発射バグと同型の予防）。

### モバイル性能対策
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`
- シャドウマップ: 1024×1024
- 建物: InstancedMesh + instanceColor
- 小物: InstancedMesh
- 街サイズ: 256m × 256m（opengl6 の 512m から縮小）
