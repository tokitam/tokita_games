(function() {
  var stageList = [];
  var currentStageIndex = 0;
  var hintActiveIndex = -1;
  var hintTimeout;

  function el(id) { return document.getElementById(id); }

  function showScreen(name) {
    ['title', 'game', 'clear', 'ending'].forEach(function(s) {
      el('screen-' + s).classList.toggle('active', s === name);
    });
  }

  // ---- Title ----
  function buildStageList(list) {
    Stage.setList(list);
    var container = el('stage-list');
    container.innerHTML = '';
    list.forEach(function(info, i) {
      var best = Stage.getBest(info.id);
      var cleared = !!best;
      var card = document.createElement('div');
      card.className = 'stage-card' + (cleared ? ' cleared' : '');
      card.innerHTML =
        '<div>' +
          '<div class="stage-card-name">' + info.title + '</div>' +
          '<div class="stage-card-meta">ちがい: 5か所</div>' +
        '</div>' +
        '<div class="stage-card-right">' +
          '<div class="stage-star">' + (cleared ? '⭐' : '　') + '</div>' +
          '<div class="stage-best">' + (best ? best + '秒' : '') + '</div>' +
        '</div>';
      card.addEventListener('click', function() { selectStage(i, list); });
      container.appendChild(card);
    });
  }

  function selectStage(index, list) {
    Sound.init();
    currentStageIndex = index;
    Stage.loadStage(list[index]).then(function(data) {
      startGame(data);
    }).catch(function() {
      alert('ステージの読み込みに失敗しました。サーバー経由で開いてください。');
    });
  }

  // ---- Game ----
  function startGame(data) {
    var state = Stage.startStage(data);
    el('stage-title').textContent = data.title;

    // Load images
    el('img-a').src = data.svgA;
    el('img-b').src = data.svgB;

    // Reset markers
    el('markers-a').innerHTML = '';
    el('markers-b').innerHTML = '';

    // Build diff indicators
    var indic = el('diff-indicators');
    indic.innerHTML = '';
    for (var i = 0; i < data.differences.length; i++) {
      var dot = document.createElement('div');
      dot.className = 'diff-dot';
      dot.id = 'diff-dot-' + i;
      indic.appendChild(dot);
    }

    updateFoundCount(state);
    el('hint-left').textContent = state.hints;
    el('btn-hint').disabled = false;

    showScreen('game');
  }

  function updateFoundCount(state) {
    el('found-count').textContent = state.found.length + '/' + state.total;
    state.found.forEach(function(i) {
      var dot = el('diff-dot-' + i);
      if (dot) dot.classList.add('found');
    });
  }

  // ---- Tap handling ----
  function getTapNorm(e, panel) {
    var rect = panel.getBoundingClientRect();
    var clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    var nx = (clientX - rect.left) / rect.width;
    var ny = (clientY - rect.top)  / rect.height;
    return { x: nx, y: ny };
  }

  function handleTap(e, isRightPanel) {
    e.preventDefault();
    var state = Stage.getState();
    if (!state || state.finished) return;

    var panel = isRightPanel ? el('panel-b') : el('panel-a');
    var norm = getTapNorm(e, panel);
    var index = Stage.checkTap(norm.x, norm.y);

    if (index >= 0) {
      Sound.play('correct');
      placeMarker(index, isRightPanel);
      updateFoundCount(Stage.getState());
      if (Stage.getState().finished) {
        setTimeout(showClear, 600);
      }
    } else {
      Sound.play('wrong');
      // Show wrong mark
      var wrongEl = document.createElement('div');
      wrongEl.className = 'wrong-marker';
      wrongEl.textContent = '✕';
      var rect = panel.getBoundingClientRect();
      var pxX = norm.x * rect.width;
      var pxY = norm.y * rect.height;
      wrongEl.style.left = pxX + 'px';
      wrongEl.style.top  = pxY + 'px';
      panel.appendChild(wrongEl);
      setTimeout(function() { if (wrongEl.parentNode) wrongEl.parentNode.removeChild(wrongEl); }, 500);
    }
  }

  function placeMarker(diffIndex, flash) {
    var vb = Stage.getViewBox();
    var diff = Stage.getDiff(diffIndex);

    ['panel-a', 'panel-b'].forEach(function(panelId, pi) {
      var panel = el(panelId);
      var layer = el(pi === 0 ? 'markers-a' : 'markers-b');
      var rect = panel.getBoundingClientRect();
      var scaleX = rect.width  / vb.w;
      var scaleY = rect.height / vb.h;
      var scale = Math.min(scaleX, scaleY);

      // center the image within the panel (object-fit:contain)
      var imgW = vb.w * scale;
      var imgH = vb.h * scale;
      var offsetX = (rect.width  - imgW) / 2;
      var offsetY = (rect.height - imgH) / 2;

      var px = offsetX + diff.x * scale;
      var py = offsetY + diff.y * scale;
      var r  = diff.r * scale;

      var m = document.createElement('div');
      m.className = 'marker' + (flash ? ' hint-pulse' : '');
      m.id = 'marker-' + pi + '-' + diffIndex;
      m.style.left   = px + 'px';
      m.style.top    = py + 'px';
      m.style.width  = r * 2 + 'px';
      m.style.height = r * 2 + 'px';
      layer.appendChild(m);
    });
  }

  function showClear() {
    Sound.play('clear');
    var state = Stage.getState();
    var stage = Stage.getStage();
    var best = Stage.getBest(stage.id);

    el('clear-time').textContent = state.elapsed;
    el('clear-best').textContent = best ? best + '秒' : '—';

    var hasNext = currentStageIndex < stageList.length - 1;
    el('btn-next').style.display = hasNext ? '' : 'none';

    showScreen('clear');
  }

  // ---- Hint ----
  el('btn-hint').addEventListener('click', function() {
    var state = Stage.getState();
    if (!state || state.hints <= 0) return;

    var idx = Stage.useHint();
    if (idx < 0) return;

    el('hint-left').textContent = Stage.getState().hints;
    if (Stage.getState().hints === 0) el('btn-hint').disabled = true;

    // Flash the hint markers
    clearTimeout(hintTimeout);
    ['panel-a', 'panel-b'].forEach(function(panelId, pi) {
      var existing = el('marker-' + pi + '-' + idx);
      if (!existing) {
        // Place temporary hint marker
        var vb = Stage.getViewBox();
        var diff = Stage.getDiff(idx);
        var panel = el(panelId);
        var rect = panel.getBoundingClientRect();
        var scaleX = rect.width / vb.w;
        var scaleY = rect.height / vb.h;
        var scale = Math.min(scaleX, scaleY);
        var imgW = vb.w * scale;
        var imgH = vb.h * scale;
        var offsetX = (rect.width - imgW) / 2;
        var offsetY = (rect.height - imgH) / 2;
        var px = offsetX + diff.x * scale;
        var py = offsetY + diff.y * scale;
        var r = diff.r * scale;
        var m = document.createElement('div');
        m.className = 'marker hint-pulse';
        m.style.cssText = 'left:' + px + 'px;top:' + py + 'px;width:' + (r*2) + 'px;height:' + (r*2) + 'px;background:rgba(255,213,79,0.4);';
        m.id = 'hint-tmp-' + pi;
        panel.appendChild(m);
        hintTimeout = setTimeout(function() {
          ['panel-a', 'panel-b'].forEach(function(pid, i) {
            var tmp = el('hint-tmp-' + i);
            if (tmp && tmp.parentNode) tmp.parentNode.removeChild(tmp);
          });
        }, 2500);
      }
    });
  });

  // ---- Input ----
  function initPanelEvents(panelEl, isRight) {
    panelEl.addEventListener('click', function(e) { handleTap(e, isRight); });
    panelEl.addEventListener('touchend', function(e) { e.preventDefault(); handleTap(e, isRight); }, { passive: false });
  }

  // ---- Navigation ----
  el('btn-back').addEventListener('click', function() {
    showScreen('title');
    buildStageList(stageList);
  });

  el('btn-next').addEventListener('click', function() {
    currentStageIndex++;
    if (currentStageIndex >= stageList.length) {
      showScreen('ending');
    } else {
      Stage.loadStage(stageList[currentStageIndex]).then(startGame);
    }
  });

  el('btn-title-clear').addEventListener('click', function() {
    showScreen('title');
    buildStageList(stageList);
  });

  el('btn-title-end').addEventListener('click', function() {
    showScreen('title');
    buildStageList(stageList);
  });

  // ---- Init ----
  function init() {
    initPanelEvents(el('panel-a'), false);
    initPanelEvents(el('panel-b'), true);

    Stage.loadList().then(function(list) {
      stageList = list;
      buildStageList(list);
    }).catch(function() {
      // Fallback for file:// protocol
      stageList = [
        { id: 1, title: '公園のひるさがり',  file: 'stages/stage01.json' },
        { id: 2, title: 'かわいいキッチン',   file: 'stages/stage02.json' },
        { id: 3, title: 'うみのたんけん',     file: 'stages/stage03.json' }
      ];
      buildStageList(stageList);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
