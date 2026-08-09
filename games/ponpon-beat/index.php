<!DOCTYPE html>
<html lang="ja">
<head>
  <?php if (file_exists(__DIR__ . '/../ga.html')) include __DIR__ . '/../ga.html'; ?>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>ポンポンビート</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- Title Screen -->
  <div id="screen-title" class="screen active">
    <h1 class="logo">🎵 ポンポンビート</h1>
    <p class="rule-text">落ちてくるノーツが判定ラインに<br>重なったらタップ！</p>
    <div id="song-list" class="song-list"></div>
    <div class="title-hs" id="title-hs"></div>
  </div>

  <!-- Game Screen -->
  <div id="screen-game" class="screen">
    <div class="game-hud">
      <button id="btn-back" class="btn-back">←</button>
      <div class="hud-score">
        <span class="hud-label">スコア</span>
        <span id="hud-score">0</span>
      </div>
      <div class="hud-combo">
        <span id="hud-combo" class="combo-num">0</span>
        <span class="hud-label">コンボ</span>
      </div>
    </div>
    <div id="lane-area">
      <div class="lane" id="lane-0"><button class="lane-btn" id="lbtn-0"></button></div>
      <div class="lane" id="lane-1"><button class="lane-btn" id="lbtn-1"></button></div>
      <div class="lane" id="lane-2"><button class="lane-btn" id="lbtn-2"></button></div>
      <div id="judge-line"></div>
      <div id="judge-text"></div>
    </div>
  </div>

  <!-- Result Screen -->
  <div id="screen-result" class="screen">
    <div class="result-inner">
      <div id="result-fc" class="fc-badge hidden">FULL COMBO！🌟</div>
      <h2 id="result-title" class="result-title"></h2>
      <div class="result-score-wrap">
        <div class="result-stat">
          <span class="rstat-label">スコア</span>
          <span id="result-score" class="rstat-val big">0</span>
        </div>
        <div class="result-stat">
          <span class="rstat-label">ベスト</span>
          <span id="result-best" class="rstat-val">0</span>
        </div>
      </div>
      <div class="result-breakdown">
        <div class="rb-item perfect">Perfect <span id="rb-perfect">0</span></div>
        <div class="rb-item good">Good <span id="rb-good">0</span></div>
        <div class="rb-item miss">Miss <span id="rb-miss">0</span></div>
        <div class="rb-item acc">精度 <span id="rb-acc">0%</span></div>
      </div>
      <button id="btn-retry-result" class="btn-primary">もういちど</button>
      <button id="btn-title-result" class="btn-secondary">タイトルへ</button>
    </div>
  </div>

  <script src="js/sound.js"></script>
  <script src="js/chart.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
