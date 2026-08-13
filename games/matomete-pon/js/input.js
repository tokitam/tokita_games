var Input = (function () {
  function getPos(e, canvas) {
    var rect = canvas.getBoundingClientRect();
    var src = e.touches ? e.touches[0] : e;
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top
    };
  }

  function init(canvas, onTap, onHover) {
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var p = getPos(e, canvas);
      onTap(p.x, p.y);
    }, { passive: false });

    canvas.addEventListener('click', function (e) {
      var p = getPos(e, canvas);
      onTap(p.x, p.y);
    });

    if (window.matchMedia('(hover: hover)').matches) {
      canvas.addEventListener('mousemove', function (e) {
        var p = getPos(e, canvas);
        onHover(p.x, p.y);
      });
      canvas.addEventListener('mouseleave', function () {
        onHover(-1, -1);
      });
    }
  }

  return { init: init };
})();
