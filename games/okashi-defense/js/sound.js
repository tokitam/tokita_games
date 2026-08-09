const Sound = (() => {
  let ctx = null;
  function c() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function osc(type, freq, endFreq, vol, dur, start) {
    const ac = c(), t = ac.currentTime + (start || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  }
  function noise(vol, dur, start) {
    const ac = c(), t = ac.currentTime + (start || 0);
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    src.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.start(t);
  }

  return {
    play(type) {
      if (type === 'shoot')    { osc('sine', 600, 200, 0.12, 0.1); }
      if (type === 'explode')  { noise(0.3, 0.2); osc('sawtooth', 200, 60, 0.2, 0.2); }
      if (type === 'die')      { osc('sine', 440, 150, 0.15, 0.15); }
      if (type === 'place')    { osc('sine', 523, 659, 0.18, 0.12); }
      if (type === 'hit')      { osc('square', 300, 100, 0.08, 0.08); }
      if (type === 'gameover') {
        [262, 220, 196, 147].forEach((f, i) => osc('sawtooth', f, f * 0.7, 0.2, 0.3, i * 0.25));
      }
      if (type === 'clear') {
        [523, 659, 784, 1047].forEach((f, i) => osc('sine', f, f * 1.1, 0.18, 0.25, i * 0.12));
      }
    }
  };
})();
