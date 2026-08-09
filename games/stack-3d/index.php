<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>スタック3D</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <canvas id="renderCanvas"></canvas>

  <!-- Overlay (title / gameover) -->
  <div id="overlay" class="overlay">
    <div class="overlay-inner" id="overlay-title">
      <div class="big-emoji">🧱</div>
      <div class="ov-title">スタック3D</div>
      <div class="ov-best">ハイスコア: <span id="title-best">0</span></div>
      <div class="ov-hint">タップでスタート！</div>
    </div>
    <div class="overlay-inner hidden" id="overlay-gameover">
      <div class="big-emoji">💥</div>
      <div class="ov-title">ゲームオーバー</div>
      <div class="ov-score">スコア: <span id="go-score">0</span></div>
      <div class="ov-best">ベスト: <span id="go-best">0</span></div>
      <div class="ov-hint">タップでリスタート</div>
    </div>
  </div>

  <!-- HUD -->
  <div id="hud" class="hud hidden">
    <div class="hud-item">
      <span class="hud-label">スコア</span>
      <span id="score">0</span>
    </div>
    <div class="hud-item">
      <span class="hud-label">ベスト</span>
      <span id="best">0</span>
    </div>
  </div>

  <div id="perfect-msg" class="perfect-msg hidden">✨ PERFECT！</div>

  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/sound.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
