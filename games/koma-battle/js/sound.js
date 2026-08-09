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

    if (type === 'countdown') {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    } else if (type === 'go') {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'square';
        const st = t + i * 0.06;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.15, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.start(st); osc.stop(st + 0.2);
      });
    } else if (type === 'clash') {
      const noise = c.createOscillator();
      const gain = c.createGain();
      noise.connect(gain); gain.connect(c.destination);
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(180, t);
      noise.frequency.exponentialRampToValueAtTime(60, t + 0.18);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.start(t); noise.stop(t + 0.2);
    } else if (type === 'knockout') {
      // スローモーション演出中の迫力音
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t); osc.stop(t + 0.6);
    } else if (type === 'spinout') {
      [440, 330, 220].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'triangle';
        const st = t + i * 0.15;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
        osc.start(st); osc.stop(st + 0.35);
      });
    } else if (type === 'win') {
      [523, 659, 784, 1047, 784, 1047].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain); gain.connect(c.destination);
        osc.type = 'sine';
        const st = t + i * 0.1;
        osc.frequency.setValueAtTime(freq, st);
        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
        osc.start(st); osc.stop(st + 0.25);
      });
    }
  }

  return { play };
})();
