<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>くるくるコマ対決</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- Title Screen -->
  <div id="screen-title" class="screen">
    <h1 class="logo">🌀 くるくるコマ対決</h1>
    <p class="title-rule">コマをスワイプで投げ入れ<br>相手を土俵から弾き飛ばせ！<br><small>3本先取で勝利！</small></p>
    <button id="btn-start" class="btn-primary">バトル開始！</button>
  </div>

  <!-- Game Screen -->
  <div id="screen-game" class="screen hidden">
    <div class="game-header">
      <div class="score-display" id="player-score">
        <span class="score-label">あなた</span>
        <div class="hearts" id="player-hearts"></div>
      </div>
      <div class="round-info" id="round-info">1ラウンド目</div>
      <div class="score-display" id="cpu-score">
        <span class="score-label">CPU</span>
        <div class="hearts" id="cpu-hearts"></div>
      </div>
    </div>
    <canvas id="renderCanvas"></canvas>
    <div id="overlay" class="overlay hidden">
      <div id="overlay-text"></div>
    </div>
    <div id="cooldown-bar" class="cooldown-bar hidden">
      <div id="cooldown-fill"></div>
    </div>
    <div id="state-hint" class="state-hint"></div>
  </div>

  <!-- Result Screen -->
  <div id="screen-result" class="screen hidden">
    <div class="result-inner">
      <div id="result-emoji" class="result-emoji">🏆</div>
      <div id="result-title" class="result-title">あなたの勝ち！</div>
      <button id="btn-restart" class="btn-primary">もういちど！</button>
      <button id="btn-title" class="btn-secondary">タイトルへ</button>
    </div>
  </div>

  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/sound.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
