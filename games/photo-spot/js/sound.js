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

export function playShutter(stars) {
  const c = getCtx();
  // Mechanical shutter click
  const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
  }
  const src = c.createBufferSource(); src.buffer = buf;
  const gain = c.createGain(); gain.gain.value = 0.3;
  src.connect(gain); gain.connect(c.destination); src.start();

  if (stars >= 3) {
    setTimeout(() => [784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'sine', 0.2), i * 60)), 80);
  } else if (stars >= 1) {
    setTimeout(() => tone(660, 0.1, 'sine', 0.18), 60);
  }
}

export function playNoShot() {
  tone(200, 0.12, 'sine', 0.15);
}

export function playComplete() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.3), i * 80));
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
