<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>お菓子ディフェンス</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <canvas id="renderCanvas"></canvas>

  <!-- Title overlay -->
  <div id="overlay-title" class="overlay">
    <div class="overlay-inner">
      <div class="big-emoji">🍬</div>
      <div class="ov-title">お菓子ディフェンス</div>
      <div class="ov-sub">マカロン軍団からお菓子の城を守れ！</div>
      <div class="ov-hint">タップでスタート</div>
    </div>
  </div>

  <!-- Clear overlay -->
  <div id="overlay-clear" class="overlay hidden">
    <div class="overlay-inner">
      <div class="big-emoji">🎉</div>
      <div class="ov-title">クリア！</div>
      <div class="ov-score">スコア: <span id="clear-score">0</span></div>
      <div class="ov-best">ベスト: <span id="clear-best">0</span></div>
      <div class="ov-hint">タップでリスタート</div>
    </div>
  </div>

  <!-- Gameover overlay -->
  <div id="overlay-gameover" class="overlay hidden">
    <div class="overlay-inner">
      <div class="big-emoji">💀</div>
      <div class="ov-title">ゲームオーバー</div>
      <div class="ov-score">スコア: <span id="go-score">0</span></div>
      <div class="ov-best">ベスト: <span id="go-best">0</span></div>
      <div class="ov-hint">タップでリスタート</div>
    </div>
  </div>

  <!-- HUD -->
  <div id="hud" class="hidden">
    <div class="hud-row">
      <span class="hud-item">🏰 <span id="life">10</span></span>
      <span class="hud-item">🍭 <span id="sugar">200</span></span>
      <span class="hud-item">Wave <span id="wave">0</span>/10</span>
      <span class="hud-item">💀 <span id="kills">0</span></span>
    </div>
    <button id="btn-next-wave" class="btn-wave hidden">つぎのなみ ▶</button>
  </div>

  <!-- Tower menu popup -->
  <div id="tower-menu" class="tower-menu hidden">
    <div class="tower-menu-title" id="tower-menu-title">砲台を設置</div>
    <div id="tower-menu-buttons"></div>
    <button class="tower-btn cancel" onclick="UI.closeTowerMenu()">キャンセル</button>
  </div>

  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/sound.js"></script>
  <script src="js/data.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
