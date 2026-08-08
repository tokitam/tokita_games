// Web Audio API oscillator-based sound (no mp3 files required)
var Sound = (function() {
  var audioCtx = null;
  var muted = false;

  function init() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }

  function beep(freq, type, duration, gainVal, delay) {
    if (muted || !audioCtx) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (delay || 0));
      gain.gain.setValueAtTime(gainVal || 0.2, audioCtx.currentTime + (delay || 0));
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (delay || 0) + duration);
      osc.start(audioCtx.currentTime + (delay || 0));
      osc.stop(audioCtx.currentTime + (delay || 0) + duration);
    } catch (e) {}
  }

  var SOUNDS = {
    move:     function() { beep(320, 'sine', 0.05, 0.15); },
    rotate:   function() { beep(480, 'sine', 0.07, 0.15); },
    drop:     function() { beep(220, 'square', 0.08, 0.18); },
    clear:    function() {
      [440, 550, 660, 770].forEach(function(f, i) { beep(f, 'sine', 0.08, 0.2, i * 0.06); });
    },
    levelup:  function() {
      [440, 550, 660, 880].forEach(function(f, i) { beep(f, 'triangle', 0.12, 0.25, i * 0.07); });
    },
    gameover: function() {
      [400, 320, 250, 180].forEach(function(f, i) { beep(f, 'sawtooth', 0.15, 0.25, i * 0.1); });
    }
  };

  function play(name) {
    if (muted || !audioCtx || !SOUNDS[name]) return;
    SOUNDS[name]();
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('poipoi-block.muted', muted ? '1' : '0');
    return muted;
  }

  function loadState() {
    muted = localStorage.getItem('poipoi-block.muted') === '1';
  }

  function isMuted() { return muted; }

  return { init: init, play: play, toggleMute: toggleMute, isMuted: isMuted, loadState: loadState };
})();
