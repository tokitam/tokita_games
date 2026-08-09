var Game = (function() {
  var HS_KEY = 'fruit-poton.highscore';
  var DANGER_LINE_RATIO = 0.18; // top 18% of field
  var DANGER_DURATION = 180;    // frames (~3s at 60fps)

  var engine, world, runner;
  var W, H; // field dimensions
  var state;
  var mergeQueue; // pairs to process this frame
  var processedPairs; // avoid double-processing

  function init(fieldW, fieldH) {
    W = fieldW;
    H = fieldH;

    engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2 } });
    world  = engine.world;
    runner = Matter.Runner.create();

    state = {
      score: 0,
      best: parseInt(localStorage.getItem(HS_KEY) || '0', 10),
      bodies: [],       // { body, fruitId, merging }
      nextFruitId: _randNextId(),
      dangerTimer: 0,
      gameOver: false,
      effects: [],      // { x, y, r, alpha, tier }
      dropLocked: false
    };

    _buildWalls();

    Matter.Events.on(engine, 'collisionStart', _onCollision);
    Matter.Runner.run(runner, engine);

    return state;
  }

  function _randNextId() {
    // Only spawn fruit 1~5 (smaller ones)
    return Math.floor(Math.random() * 5) + 1;
  }

  function _buildWalls() {
    var thick = 30;
    var opts = { isStatic: true, friction: 0.5, restitution: 0.1, label: 'wall' };
    // bottom
    Matter.World.add(world, Matter.Bodies.rectangle(W/2, H + thick/2, W + thick*2, thick, opts));
    // left
    Matter.World.add(world, Matter.Bodies.rectangle(-thick/2, H/2, thick, H*2, opts));
    // right
    Matter.World.add(world, Matter.Bodies.rectangle(W + thick/2, H/2, thick, H*2, opts));
  }

  function _onCollision(event) {
    var pairs = event.pairs;
    pairs.forEach(function(pair) {
      var a = _findEntry(pair.bodyA);
      var b = _findEntry(pair.bodyB);
      if (!a || !b) return;
      if (a.fruitId !== b.fruitId) return;
      if (a.merging || b.merging) return;
      if (a.fruitId >= 11) return; // max tier
      a.merging = true;
      b.merging = true;
      mergeQueue.push([a, b]);
    });
  }

  function _findEntry(body) {
    for (var i = 0; i < state.bodies.length; i++) {
      if (state.bodies[i].body === body) return state.bodies[i];
    }
    return null;
  }

  function drop(x) {
    if (state.gameOver || state.dropLocked) return;
    var fruit = getFruitById(state.nextFruitId);
    var body = Matter.Bodies.circle(
      Math.max(fruit.radius, Math.min(W - fruit.radius, x)),
      fruit.radius + 5,
      fruit.radius,
      { restitution: 0.25, friction: 0.4, frictionAir: 0.01, label: 'fruit_' + fruit.id, density: 0.004 }
    );
    Matter.World.add(world, body);
    state.bodies.push({ body: body, fruitId: fruit.id, merging: false });
    Sound.play('drop');

    state.nextFruitId = _randNextId();
    state.dropLocked = true;
    setTimeout(function() { state.dropLocked = false; }, 400);
    return state.nextFruitId;
  }

  function update() {
    if (state.gameOver) return;

    // Process merges
    mergeQueue.forEach(function(pair) {
      var a = pair[0], b = pair[1];
      // Check still in array
      var ai = state.bodies.indexOf(a);
      var bi = state.bodies.indexOf(b);
      if (ai === -1 || bi === -1) return;

      var newId = a.fruitId + 1;
      var newFruit = getFruitById(newId);

      // Midpoint
      var mx = (a.body.position.x + b.body.position.x) / 2;
      var my = (a.body.position.y + b.body.position.y) / 2;

      // Remove old bodies
      Matter.World.remove(world, a.body);
      Matter.World.remove(world, b.body);
      state.bodies.splice(state.bodies.indexOf(a), 1);
      var bi2 = state.bodies.indexOf(b);
      if (bi2 !== -1) state.bodies.splice(bi2, 1);

      // Score
      state.score += newFruit.score;
      if (state.score > state.best) {
        state.best = state.score;
        localStorage.setItem(HS_KEY, state.best);
      }

      // Effect
      state.effects.push({ x: mx, y: my, r: newFruit.radius, alpha: 1, tier: newId });

      if (newId <= 11) {
        var newBody = Matter.Bodies.circle(mx, Math.max(my, newFruit.radius), newFruit.radius, {
          restitution: 0.25, friction: 0.4, frictionAir: 0.01,
          label: 'fruit_' + newId, density: 0.004
        });
        Matter.World.add(world, newBody);
        state.bodies.push({ body: newBody, fruitId: newId, merging: false });
      }

      Sound.play('merge', newId);
      if (newId === 11) Sound.play('star');
    });
    mergeQueue = [];

    // Remove fallen-off bodies
    for (var i = state.bodies.length - 1; i >= 0; i--) {
      var entry = state.bodies[i];
      if (entry.body.position.y > H + 200) {
        Matter.World.remove(world, entry.body);
        state.bodies.splice(i, 1);
      }
    }

    // Danger check
    var dangerLine = H * DANGER_LINE_RATIO;
    var inDanger = state.bodies.some(function(e) {
      return !e.merging && e.body.position.y - getFruitById(e.fruitId).radius < dangerLine;
    });

    if (inDanger) {
      state.dangerTimer++;
      if (state.dangerTimer % 20 === 0) Sound.play('danger');
      if (state.dangerTimer >= DANGER_DURATION) {
        state.gameOver = true;
        Sound.play('gameover');
      }
    } else {
      state.dangerTimer = 0;
    }

    // Update effects
    for (var j = state.effects.length - 1; j >= 0; j--) {
      state.effects[j].alpha -= 0.04;
      state.effects[j].r    += 1.5;
      if (state.effects[j].alpha <= 0) state.effects.splice(j, 1);
    }
  }

  function cleanup() {
    if (runner) Matter.Runner.stop(runner);
    if (world)  Matter.World.clear(world);
    if (engine) Matter.Engine.clear(engine);
    mergeQueue = [];
    processedPairs = new Set();
  }

  function start(fieldW, fieldH) {
    cleanup();
    mergeQueue = [];
    processedPairs = new Set();
    return init(fieldW, fieldH);
  }

  return {
    start: start,
    drop: drop,
    update: update,
    getState: function() { return state; },
    getDangerLine: function() { return H * DANGER_LINE_RATIO; },
    getBest: function() { return parseInt(localStorage.getItem(HS_KEY)||'0',10); }
  };
})();
