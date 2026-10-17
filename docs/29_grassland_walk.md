# くさはら さんぽ（草原探索デモ）

## 概要

Three.js (importmap + CDN) で実装した三人称視点の草原探索デモ。多重サイン波で起伏を生成した 512m×512m のフィールドを自由に歩き回れる。スコア・ゲームオーバーなし。

## 実装内容

- `games/grassland-walk/index.html` — Three.js importmap・ローディング画面・操作ヒント
- `games/grassland-walk/css/style.css` — ローディングとヒントのみのシンプルスタイル
- `games/grassland-walk/js/config.js` — 草原向けパラメータ
- `games/grassland-walk/js/terrain/TerrainBuilder.js` — 地形高さ関数・Mesh 生成
- `games/grassland-walk/js/world/Environment.js` — 草原向けライト・霧・空シェーダー
- `games/grassland-walk/js/world/GrasslandWorld.js` — 境界クランプ・木円柱コライダー
- `games/grassland-walk/js/nature/NatureGenerator.js` — 大木・小木・草・花の手続き配置
- `games/grassland-walk/js/nature/AnimalManager.js` — ウサギ・リス・蝶 AI
- `games/grassland-walk/js/player/CharacterController.js` — 地形 Y 追従版 CharacterController
- `games/grassland-walk/js/player/AnimationController.js` — neko-catch-city から流用
- `games/grassland-walk/js/camera/ThirdPersonCamera.js` — neko-catch-city から流用（草原向け設定）
- `games/grassland-walk/js/main.js` — レンダーループ・入力・起動処理

## 使い方

- **PC**: WASD / 矢印キー で移動、Shift で走る、マウスドラッグでカメラ回転
- **スマホ**: タップで移動先指定（ダブルタップで走る）、ドラッグでカメラ回転
- ウサギ・リスに近づくと逃げる（4m 以内で逃走、8m 以上で元に戻る）

## 技術的な補足

### 地形生成
多重サイン波（ライブラリ不要・決定論的）で頂点 Y を設定。128×128 セグメントの PlaneGeometry ≈ 17000 頂点。

### 植生配置
シード付き LCG 乱数で一様配置（決定論的）。草は 2 枚の PlaneGeometry をクロスさせた 1 ジオメトリで InstancedMesh 化。花は通常の Group だが数が少ないため問題なし。

### キャラクターモデル
`../neko-catch-city/models/character.glb` を相対パスで参照。ロード前はカプセルのプレースホルダー表示。

### ES modules の注意
`file://` プロトコルでは ES modules が動作しない（CORS エラー）。ローカルサーバ（`npx serve games/` など）が必要。
