import * as THREE from 'three';

const MOVE_ON = 0.15, MOVE_OFF = 0.05, FADE = 0.25;
const RUN_CLIP_SPEED = 5.5;

export class AnimationController {
  constructor(root, clips) {
    this._mixer = new THREE.AnimationMixer(root);
    this._actions = {
      idle: this._mixer.clipAction(clips.idle),
      run:  this._mixer.clipAction(clips.run),
    };
    this._state = 'idle';
    for (const key of ['idle', 'run']) {
      const a = this._actions[key];
      a.enabled = true; a.setEffectiveWeight(key === 'idle' ? 1 : 0); a.play();
    }
  }

  static create(root, clips) {
    const find = re => clips.find(c => re.test(c.name)) ?? null;
    const idle = find(/idle/i);
    const run  = find(/run/i);
    if (!idle || !run) return null;
    return new AnimationController(root, { idle, run });
  }

  update(dt, speed) {
    let next = this._state;
    if (this._state === 'idle') { if (speed > MOVE_ON) next = 'run'; }
    else                        { if (speed < MOVE_OFF) next = 'idle'; }

    if (next !== this._state) {
      const from = this._actions[this._state], to = this._actions[next];
      to.enabled = true; to.setEffectiveTimeScale(1); to.setEffectiveWeight(1); to.time = 0;
      from.crossFadeTo(to, FADE, false); this._state = next;
    }
    if (this._state === 'run')
      this._actions.run.setEffectiveTimeScale(THREE.MathUtils.clamp(speed / RUN_CLIP_SPEED, 0.7, 1.4));
    this._mixer.update(dt);
  }
}
