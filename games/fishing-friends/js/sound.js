const Sound = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play(type) {
    const c = getCtx();
    const t = c.currentTime;

    if (type === 'cast') {
      // シュっと投げる
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.start(t); osc.stop(t + 0.2);
      // ポチャン
      const osc2 = c.createOscillator();
      const gain2 = c.createGain();
      osc2.connect(gain2); gain2.connect(c.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(250, t + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(80, t + 0.5);
      gain2.gain.setValueAtTime(0.2, t + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc2.start(t + 0.22); osc2.stop(t + 0.5);
    } else if (type === 'atari') {
      // アタリ（ピコン）
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1100, t + 0.05);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
    } else if (type === 'catch') {
      // 釣り上げ（ファンファーレ）
      [523, 659, 784].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'sine';
        const st = t + i * 0.1;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.22, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
        osc.start(st); osc.stop(st + 0.4);
      });
    } else if (type === 'escape') {
      // 逃げられた
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.35);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.35);
    } else if (type === 'timeup') {
      [392, 330, 262].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'sine';
        const st = t + i * 0.15;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
        osc.start(st); osc.stop(st + 0.4);
      });
    } else if (type === 'tick') {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t); osc.stop(t + 0.05);
    }
  }

  return { play };
})();
