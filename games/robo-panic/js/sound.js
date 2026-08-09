let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.3) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.start(c.currentTime); osc.stop(c.currentTime + dur);
}

export function playCoin() {
  tone(1047, 0.07, 'sine', 0.25);
  setTimeout(() => tone(1319, 0.07, 'sine', 0.2), 60);
}

export function playWave() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.3), i * 70));
}

export function playWarning() {
  tone(220, 0.08, 'sawtooth', 0.15);
}

export function playSpawn() {
  tone(180, 0.04, 'square', 0.2);
  setTimeout(() => tone(140, 0.08, 'square', 0.15), 50);
}

export function playGameOver() {
  [523, 415, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.22), i * 110));
}

export function playFootstep() {
  const c = getCtx();
  const buf = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.25;
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain(); gain.gain.value = 0.12;
  src.connect(gain); gain.connect(c.destination);
  src.start();
}

export function resume() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
