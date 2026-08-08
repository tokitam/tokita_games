var Input = (function() {
  var handlers = {};

  function on(name, fn) { handlers[name] = fn; }
  function emit(name) { if (handlers[name]) handlers[name](); }

  // ---- Keyboard ----
  function initKeyboard() {
    document.addEventListener('keydown', function(e) {
      switch (e.code) {
        case 'ArrowLeft':  e.preventDefault(); emit('left');     break;
        case 'ArrowRight': e.preventDefault(); emit('right');    break;
        case 'ArrowUp':    e.preventDefault(); emit('rotate');   break;
        case 'ArrowDown':  e.preventDefault(); emit('softDrop'); break;
        case 'Space':      e.preventDefault(); emit('hardDrop'); break;
        case 'KeyP':       emit('pause'); break;
      }
    });
  }

  // ---- Touch ----
  var startX, startY, startTime, lastMoveX;
  var SWIPE_CELL = 28;   // px per cell horizontal swipe
  var TAP_MOVE_MAX = 12; // px — max movement for tap
  var TAP_TIME_MAX = 220; // ms
  var DOWN_THRESHOLD = 30;
  var HARD_DROP_VELOCITY = 700; // px/s
  var HARD_DROP_MIN_DIST = 80;

  function initTouch(el) {
    el.addEventListener('touchstart', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      startX = lastMoveX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
    }, { passive: false });

    el.addEventListener('touchmove', function(e) {
      e.preventDefault();
      var t = e.touches[0];
      var dx = t.clientX - lastMoveX;
      // Trigger one move per cell-width of horizontal drag
      if (Math.abs(dx) >= SWIPE_CELL) {
        if (dx > 0) emit('right'); else emit('left');
        lastMoveX = t.clientX;
      }
    }, { passive: false });

    el.addEventListener('touchend', function(e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      var dx = t.clientX - startX;
      var dy = t.clientY - startY;
      var dt = Date.now() - startTime;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= TAP_MOVE_MAX && dt <= TAP_TIME_MAX) {
        emit('rotate');
      } else if (dy > DOWN_THRESHOLD && dy > Math.abs(dx) * 1.2) {
        var vel = (dy / dt) * 1000;
        if (vel >= HARD_DROP_VELOCITY || dy >= HARD_DROP_MIN_DIST) {
          emit('hardDrop');
        } else {
          emit('softDrop');
        }
      }
    }, { passive: false });
  }

  return { on: on, initKeyboard: initKeyboard, initTouch: initTouch };
})();
