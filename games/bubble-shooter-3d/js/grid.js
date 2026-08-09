// Fibonacci sphere grid for bubble placement
const BubbleGrid = (() => {
  const RADIUS     = 8;
  const COLORS     = ['red', 'blue', 'green', 'yellow', 'purple'];
  const COLOR_HEX  = {
    red:    '#f43f5e',
    blue:   '#3b82f6',
    green:  '#22c55e',
    yellow: '#eab308',
    purple: '#a855f7',
  };
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

  let cells = [];
  let anchors = new Set();

  function fibSphere(n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y   = 1 - (i / (n - 1)) * 2;
      const r   = Math.sqrt(1 - y * y);
      const phi = GOLDEN_ANGLE * i;
      pts.push({ x: r * Math.cos(phi) * RADIUS, y: y * RADIUS, z: r * Math.sin(phi) * RADIUS });
    }
    return pts;
  }

  function build(n) {
    const pts = fibSphere(n);
    cells = pts.map((p, i) => ({ id: i, position: { ...p }, neighbors: [], bubble: null }));

    // Compute average nearest-neighbor distance
    let sumNearest = 0;
    cells.forEach(c => {
      let minD = Infinity;
      cells.forEach(d => {
        if (d.id === c.id) return;
        const dx = c.position.x - d.position.x;
        const dy = c.position.y - d.position.y;
        const dz = c.position.z - d.position.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < minD) minD = dist;
      });
      sumNearest += minD;
    });
    const threshold = (sumNearest / cells.length) * 1.45;

    // Build adjacency
    cells.forEach(c => {
      cells.forEach(d => {
        if (d.id <= c.id) return;
        const dx = c.position.x - d.position.x;
        const dy = c.position.y - d.position.y;
        const dz = c.position.z - d.position.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < threshold) {
          c.neighbors.push(d.id);
          d.neighbors.push(c.id);
        }
      });
    });

    // Top 10% are anchors (high y)
    const sorted = [...cells].sort((a, b) => b.position.y - a.position.y);
    anchors = new Set(sorted.slice(0, Math.max(1, Math.floor(n * 0.12))).map(c => c.id));
  }

  function reset() {
    cells.forEach(c => { c.bubble = null; });
  }

  function getCell(id) { return cells[id]; }
  function getCells()  { return cells; }

  function getColorHex(color) { return COLOR_HEX[color] || '#fff'; }
  function getColors()        { return COLORS; }

  function presentColors() {
    const s = new Set();
    cells.forEach(c => { if (c.bubble) s.add(c.bubble); });
    return [...s];
  }

  function randomColor() {
    const present = presentColors();
    const pool = present.length > 0 ? present : COLORS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // BFS to find connected same-color group
  function floodFill(startId) {
    const color = cells[startId].bubble;
    if (!color) return [];
    const visited = new Set([startId]);
    const queue   = [startId];
    while (queue.length) {
      const cur = queue.shift();
      cells[cur].neighbors.forEach(nid => {
        if (!visited.has(nid) && cells[nid].bubble === color) {
          visited.add(nid); queue.push(nid);
        }
      });
    }
    return [...visited];
  }

  // BFS from anchors across all filled cells
  function reachableFromAnchors() {
    const visited = new Set();
    const queue   = [...anchors].filter(id => cells[id].bubble !== null);
    queue.forEach(id => visited.add(id));
    while (queue.length) {
      const cur = queue.shift();
      cells[cur].neighbors.forEach(nid => {
        if (!visited.has(nid) && cells[nid].bubble !== null) {
          visited.add(nid); queue.push(nid);
        }
      });
    }
    return visited;
  }

  // Returns {popped, fallen} arrays of cell ids
  function tryPop(cellId) {
    const group = floodFill(cellId);
    if (group.length < 3) return { popped: [], fallen: [] };

    // Remove the group
    group.forEach(id => { cells[id].bubble = null; });

    // Find disconnected cells
    const reachable = reachableFromAnchors();
    const fallen = [];
    cells.forEach(c => {
      if (c.bubble !== null && !reachable.has(c.id)) {
        fallen.push(c.id);
        c.bubble = null;
      }
    });

    return { popped: group, fallen };
  }

  // Snap: find nearest empty cell to a given world position
  function findSnapCell(px, py, pz) {
    let best = null, bestD = Infinity;
    cells.forEach(c => {
      if (c.bubble !== null) return;
      const dx = c.position.x - px;
      const dy = c.position.y - py;
      const dz = c.position.z - pz;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  // Find the empty neighbor closest to position, adjacent to a filled cell
  function findAdjacentEmpty(hitCellId, px, py, pz) {
    const cell = cells[hitCellId];
    let best = null, bestD = Infinity;
    cell.neighbors.forEach(nid => {
      const n = cells[nid];
      if (n.bubble !== null) return;
      const dx = n.position.x - px;
      const dy = n.position.y - py;
      const dz = n.position.z - pz;
      const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  function remainingCount() {
    return cells.filter(c => c.bubble !== null).length;
  }

  return {
    build, reset,
    getCell, getCells,
    getColorHex, getColors, randomColor,
    tryPop, findAdjacentEmpty, findSnapCell,
    remainingCount,
  };
})();
